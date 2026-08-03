/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';
import { Request, Response, NextFunction } from 'express';
import { LogRepository } from '../repositories/logRepository';
import { CONFIG } from '../config';
import { logger } from '../utils/logger';

// Global IP Ban and offense tracking lists
export const bannedIps = new Set<string>();
const ipOffenses = new Map<string, number>();

const IS_PRODUCTION = process.env.NODE_ENV === 'production';
const CSRF_PUBLIC_COOKIE = IS_PRODUCTION ? '__Host-csrf-token' : 'csrf_token';
const CSRF_SIGNATURE_COOKIE = IS_PRODUCTION ? '__Host-csrf-sig' : 'csrf_sig';
const CSRF_EXPIRY_MS = 60 * 60 * 1000;
const CSRF_SWEEP_INTERVAL_MS = 5 * 60 * 1000;
const csrfTokens = new Map<string, { tokenHash: string; expires: number }>();
let lastCsrfSweep = 0;

function getClientIp(req: Request) {
  return req.ip || req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.socket.remoteAddress || 'unknown';
}

function buildClientFingerprint(req: Request) {
  const ip = getClientIp(req);
  const userAgent = String(req.headers['user-agent'] || 'unknown');
  const acceptLanguage = String(req.headers['accept-language'] || '');
  return crypto.createHash('sha256').update(`${ip}|${userAgent}|${acceptLanguage}`).digest('hex');
}

function hashCsrfToken(token: string) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function signCsrfToken(token: string) {
  return crypto.createHmac('sha256', CONFIG.JWT_SECRET).update(token).digest('base64url');
}

function safeEqualText(a?: string, b?: string) {
  if (!a || !b) return false;
  const aBuffer = Buffer.from(a);
  const bBuffer = Buffer.from(b);
  if (aBuffer.length !== bBuffer.length) return false;
  return crypto.timingSafeEqual(aBuffer, bBuffer);
}

function parseCookies(cookieHeader: string | undefined) {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const part of cookieHeader.split(';')) {
    const [rawName, ...rest] = part.trim().split('=');
    if (!rawName) continue;
    cookies[rawName] = decodeURIComponent(rest.join('='));
  }

  return cookies;
}

function getAllowedOrigins() {
  const configured = [
    process.env.ALLOWED_ORIGINS,
    process.env.CLIENT_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.APP_URL,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  return new Set(configured);
}

function isTrustedOrigin(req: Request) {
  const originHeader = req.headers.origin;
  const refererHeader = req.headers.referer;
  const allowedOrigins = getAllowedOrigins();

  if (!originHeader && !refererHeader) {
    return !IS_PRODUCTION;
  }

  const candidate = originHeader || refererHeader;
  if (!candidate) return !IS_PRODUCTION;

  try {
    const url = new URL(candidate);
    const requestOrigin = `${url.protocol}//${url.host}`;
    if (allowedOrigins.has(requestOrigin)) {
      return true;
    }

    if (!IS_PRODUCTION) {
      return requestOrigin === 'http://localhost:3000' || requestOrigin === 'http://127.0.0.1:3000';
    }
  } catch {
    return false;
  }

  return false;
}

function buildCookie(name: string, value: string, httpOnly: boolean) {
  const sameSite = IS_PRODUCTION ? 'Strict' : 'Lax';
  const parts = [
    `${name}=${encodeURIComponent(value)}`,
    'Path=/',
    `Max-Age=${Math.floor(CSRF_EXPIRY_MS / 1000)}`,
    `SameSite=${sameSite}`,
  ];

  if (IS_PRODUCTION) {
    parts.push('Secure');
  }

  if (httpOnly) {
    parts.push('HttpOnly');
  }

  return parts.join('; ');
}

function sweepExpiredCsrfTokens() {
  const now = Date.now();
  if (now - lastCsrfSweep < CSRF_SWEEP_INTERVAL_MS) {
    return;
  }

  lastCsrfSweep = now;
  for (const [key, value] of csrfTokens.entries()) {
    if (value.expires <= now) {
      csrfTokens.delete(key);
    }
  }
}

/**
 * Utility: Log a security-related alert/incident to the audit log database
 */
export async function logSecurityEvent(
  ip: string,
  action: string,
  details: string,
  userId = 'system',
  userName = 'Sistem Güvenlik Duvarı'
) {
  logger.security(`[SECURITY ALERT] IP: ${ip} | ${action}: ${details}`, { ip, action, details, userId, userName });
  try {
    await LogRepository.create({
      userId,
      userName,
      userRole: 'system',
      action: `[GÜVENLİK] ${action}`,
      details: `IP: ${ip} | ${details}`,
      timestamp: new Date().toLocaleString('tr-TR'),
    });
  } catch (err) {
    logger.error('Failed to save security log:', err);
  }
}

/**
 * Utility: Track offensive activity from an IP and ban it if threshold is exceeded
 */
export async function registerIpOffense(ip: string, reason: string) {
  const current = ipOffenses.get(ip) || 0;
  const updated = current + 1;
  ipOffenses.set(ip, updated);

  await logSecurityEvent(ip, 'Zararlı Aktivite Tespiti', `${reason} (İhlal Sayısı: ${updated}/5)`);

  if (updated >= 5) {
    bannedIps.add(ip);
    await logSecurityEvent(ip, 'IP Engellendi', `Güvenlik sınırını aşan ${ip} adresi sistemden engellendi (Banned).`);
  }
}

/**
 * 1. IP Ban Enforcement Middleware
 */
export function enforceIpBan(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);
  if (bannedIps.has(ip)) {
    return res.status(403).json({
      success: false,
      message: 'Erişim Engellendi.',
      error: 'IP adresi güvenlik politikaları nedeniyle kalıcı olarak engellenmiştir.',
      timestamp: new Date().toISOString(),
    });
  }
  next();
}

/**
 * 2. Request ID & Response Time Measurement Middleware
 */
export function trackRequestMetrics(req: Request, res: Response, next: NextFunction) {
  const reqId = crypto.randomUUID();
  (req as any).id = reqId;
  res.setHeader('X-Request-Id', reqId);

  const startTime = process.hrtime();

  res.on('finish', () => {
    const elapsed = process.hrtime(startTime);
    const elapsedMs = (elapsed[0] * 1000 + elapsed[1] / 1000000).toFixed(2);
    logger.access(`${req.method} ${req.url} - ${res.statusCode} - ${elapsedMs}ms`, {
      method: req.method,
      url: req.url,
      statusCode: res.statusCode,
      elapsedMs: parseFloat(elapsedMs),
      ip: getClientIp(req),
      userAgent: req.headers['user-agent']
    });
  });

  next();
}

/**
 * Helper to check for command injection signatures
 */
export function detectCommandInjection(val: string): boolean {
  if (typeof val !== 'string') return false;
  const dangerousPatterns = [
    /[;&|`\n\r]/,
    /\$\(.*\)/,
    /\s+sh\s+/i,
    /\s+bash\s+/i,
    /\s+powershell\s+/i,
    /eval\(/i,
  ];
  return dangerousPatterns.some(pattern => pattern.test(val));
}

/**
 * Helper to check for directory traversal signatures
 */
export function detectDirectoryTraversal(val: string): boolean {
  if (typeof val !== 'string') return false;
  const traversalPatterns = [
    /\.\.\//,
    /\.\.\\/,
    /\%2e\%2e\%2f/i,
    /\%2e\%2e\//i,
    /etc\/passwd/i,
    /boot\.ini/i,
    /win\.ini/i,
  ];
  return traversalPatterns.some(pattern => pattern.test(val));
}

/**
 * Helper to check for SQL injection signatures in strictly non-SQL values
 */
export function detectSqlInjection(val: string): boolean {
  if (typeof val !== 'string') return false;
  const sqlPatterns = [
    /\s*UNION\s+ALL\s+SELECT\s*/i,
    /\s*UNION\s+SELECT\s*/i,
    /'.*OR.*=.*'/i,
    /".*OR.*=.*"/i,
    /--/,
    /\/\*/,
    /;\s*DROP\s+TABLE\s*/i,
    /;\s*DELETE\s+FROM\s*/i,
  ];
  return sqlPatterns.some(pattern => pattern.test(val));
}

function isTrustedSignaturePayload(path: string, val: string): boolean {
  if (!path.endsWith('.signatureData')) return false;
  return /^data:image\/(png|jpeg|jpg|webp);base64,[A-Za-z0-9+/=\r\n]+$/.test(val) && val.length <= 2_500_000;
}

function isTrustedBinaryUploadPayload(path: string, val: string): boolean {
  if (!path.endsWith('.fileData')) return false;
  return /^[A-Za-z0-9+/=\r\n]+$/.test(val) && val.length <= 10_000_000;
}

/**
 * Recursive sanitizer that escapes string properties to prevent XSS and detects attacks
 */
export function recursiveSanitizeAndVerify(obj: any, ip: string, path: string): { data: any; clean: boolean } {
  if (!obj) return { data: obj, clean: true };

  if (typeof obj === 'string') {
    const raw = obj;

    if (isTrustedSignaturePayload(path, raw) || isTrustedBinaryUploadPayload(path, raw)) {
      return { data: raw, clean: true };
    }

    if (detectDirectoryTraversal(raw)) {
      registerIpOffense(ip, `Dizin Atlatma (Directory Traversal) Girişimi: "${path}" içinde "${raw}"`);
      return { data: raw, clean: false };
    }
    if (detectCommandInjection(raw)) {
      registerIpOffense(ip, `Komut Enjeksiyonu (Command Injection) Girişimi: "${path}" içinde "${raw}"`);
      return { data: raw, clean: false };
    }
    if (detectSqlInjection(raw)) {
      registerIpOffense(ip, `SQL Enjeksiyonu (SQL Injection) Girişimi: "${path}" içinde "${raw}"`);
      return { data: raw, clean: false };
    }

    const escaped = raw
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;')
      .replace(/javascript:/gi, '[REMOVED]')
      .replace(/onload/gi, '[REMOVED]')
      .replace(/onerror/gi, '[REMOVED]')
      .replace(/onclick/gi, '[REMOVED]')
      .replace(/onmouseover/gi, '[REMOVED]');

    return { data: escaped, clean: true };
  }

  if (Array.isArray(obj)) {
    const list = [];
    for (let index = 0; index < obj.length; index += 1) {
      const item = obj[index];
      const res = recursiveSanitizeAndVerify(item, ip, `${path}[${index}]`);
      if (!res.clean) return { data: obj, clean: false };
      list.push(res.data);
    }
    return { data: list, clean: true };
  }

  if (typeof obj === 'object') {
    const copy: any = {};
    for (const key of Object.keys(obj)) {
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        registerIpOffense(ip, `Prototip Kirliliği (Prototype Pollution) Girişimi: "${key}"`);
        return { data: obj, clean: false };
      }
      const res = recursiveSanitizeAndVerify(obj[key], ip, `${path}.${key}`);
      if (!res.clean) return { data: obj, clean: false };
      copy[key] = res.data;
    }
    return { data: copy, clean: true };
  }

  return { data: obj, clean: true };
}

/**
 * 3. XSS, Command, SQL, Traversal Inspection and Input Sanitization Middleware
 */
export function inspectAndSanitizeInput(req: Request, res: Response, next: NextFunction) {
  const ip = getClientIp(req);

  if (req.body && Object.keys(req.body).length > 0) {
    const result = recursiveSanitizeAndVerify(req.body, ip, 'body');
    if (!result.clean) {
      return res.status(400).json({
        success: false,
        message: 'Güvenlik İhlali Engellendi.',
        error: 'Girdi verisinde zararlı kod veya enjeksiyon imzası saptandı.',
        timestamp: new Date().toISOString(),
      });
    }
    req.body = result.data;
  }

  if (req.query && Object.keys(req.query).length > 0) {
    const result = recursiveSanitizeAndVerify(req.query, ip, 'query');
    if (!result.clean) {
      return res.status(400).json({
        success: false,
        message: 'Güvenlik İhlali Engellendi.',
        error: 'Query parametrelerinde zararlı kod veya enjeksiyon imzası saptandı.',
        timestamp: new Date().toISOString(),
      });
    }
    req.query = result.data as any;
  }

  if (req.params && Object.keys(req.params).length > 0) {
    const result = recursiveSanitizeAndVerify(req.params, ip, 'params');
    if (!result.clean) {
      return res.status(400).json({
        success: false,
        message: 'Güvenlik İhlali Engellendi.',
        error: 'URI parametrelerinde zararlı kod veya enjeksiyon imzası saptandı.',
        timestamp: new Date().toISOString(),
      });
    }
    req.params = result.data;
  }

  next();
}

/**
 * 4. Signed Double-Submit-Cookie CSRF Token Protection Middleware
 */
export function csrfTokenProtection(req: Request, res: Response, next: NextFunction) {
  const safeMethods = ['GET', 'HEAD', 'OPTIONS'];
  if (safeMethods.includes(req.method)) {
    return next();
  }

  if (req.originalUrl.includes('sheets-webhook')) {
    return next();
  }

  sweepExpiredCsrfTokens();

  const ip = getClientIp(req);
  if (!isTrustedOrigin(req)) {
    void logSecurityEvent(ip, 'CSRF Origin Hatası', `Origin/Referer doğrulaması başarısız. Origin: "${String(req.headers.origin || 'Yok')}" Referer: "${String(req.headers.referer || 'Yok')}"`);
    return res.status(403).json({
      success: false,
      message: 'CSRF Doğrulama Hatası.',
      error: 'İstek kaynağı güvenilir olarak doğrulanamadı.',
      timestamp: new Date().toISOString(),
    });
  }

  const csrfHeader = req.headers['x-csrf-token']?.toString().trim();
  const cookies = parseCookies(req.headers.cookie);
  const csrfCookie = cookies[CSRF_PUBLIC_COOKIE];
  const csrfSignature = cookies[CSRF_SIGNATURE_COOKIE];

  const fingerprint = buildClientFingerprint(req);
  const cached = csrfTokens.get(fingerprint);

  const tokenMatches = safeEqualText(csrfHeader, csrfCookie);
  const signatureMatches = safeEqualText(csrfSignature, csrfCookie ? signCsrfToken(csrfCookie) : undefined);
  const tokenKnownToServer = Boolean(
    cached && cached.expires > Date.now() && csrfCookie && safeEqualText(cached.tokenHash, hashCsrfToken(csrfCookie))
  );

  if (tokenMatches && signatureMatches && tokenKnownToServer) {
    return next();
  }

  void logSecurityEvent(
    ip,
    'CSRF Doğrulama Hatası',
    `Header/Cookie/İmza doğrulaması başarısız. Header: "${csrfHeader || 'Yok'}", PublicCookie: "${csrfCookie || 'Yok'}", Signature: "${csrfSignature ? 'Var' : 'Yok'}"`
  );

  return res.status(403).json({
    success: false,
    message: 'CSRF Doğrulama Hatası.',
    error: 'İşlem doğrulaması başarısız. Lütfen sayfayı yenileyip tekrar deneyin.',
    timestamp: new Date().toISOString(),
  });
}

/**
 * 5. Dynamic Standardized JSON Response Wrapper Middleware
 */
export function wrapResponseEnvelope(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json;

  res.json = function (body: any): Response {
    if (res.headersSent) {
      logger.warn(`res.json() was called after headers were already sent on ${req.method} ${req.url}`);
      return res;
    }

    if (body && typeof body === 'object' && ('success' in body) && ('timestamp' in body)) {
      return originalJson.call(this, body);
    }

    const hasError = res.statusCode >= 400;
    const standardPayload = {
      success: !hasError,
      message: hasError
        ? (body?.message || body?.error || 'İşlem başarısız oldu.')
        : (body?.message || 'İşlem başarıyla tamamlandı.'),
      data: hasError ? null : (body?.data !== undefined ? body.data : body),
      error: hasError ? (body?.error || body?.message || 'Bir hata meydana geldi.') : null,
      timestamp: new Date().toISOString(),
    };

    return originalJson.call(this, standardPayload);
  };

  next();
}

/**
 * 6. CSRF Token Generator Route Handler
 */
export function getCsrfToken(req: Request, res: Response) {
  sweepExpiredCsrfTokens();

  const token = crypto.randomBytes(32).toString('base64url');
  const signature = signCsrfToken(token);
  const fingerprint = buildClientFingerprint(req);

  csrfTokens.set(fingerprint, {
    tokenHash: hashCsrfToken(token),
    expires: Date.now() + CSRF_EXPIRY_MS,
  });

  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Set-Cookie', [
    buildCookie(CSRF_PUBLIC_COOKIE, token, false),
    buildCookie(CSRF_SIGNATURE_COOKIE, signature, true),
  ]);

  res.json({
    success: true,
    message: 'CSRF token başarıyla üretildi.',
    data: { csrfToken: token },
    timestamp: new Date().toISOString()
  });
}
