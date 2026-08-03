/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { CONFIG } from '../config';

const rateLimits = new Map<string, { count: number; resetTime: number }>();

// Root-cause fix: Eski implementasyon Map'i süresiz büyütüyordu, her yeni IP
// bellekte kalıcı hale geliyordu. Bu bellek sızıntısına yol açıyordu.
// Şimdi her reset saniyesinde süresi dolan kayıtları temizliyoruz.
const SWEEP_INTERVAL_MS = Math.max(15_000, CONFIG.RATE_LIMIT_WINDOW_MS);
let lastSweep = Date.now();

function sweep() {
  const now = Date.now();
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, entry] of rateLimits) {
    if (now > entry.resetTime) {
      rateLimits.delete(key);
    }
  }
}

export function customRateLimiter(req: Request, res: Response, next: NextFunction) {
  sweep();
  const ip = req.ip || req.headers['x-forwarded-for']?.toString() || 'unknown';
  const now = Date.now();
  const clientLimit = rateLimits.get(ip);

  if (!clientLimit || now > clientLimit.resetTime) {
    rateLimits.set(ip, { count: 1, resetTime: now + CONFIG.RATE_LIMIT_WINDOW_MS });
    return next();
  }

  clientLimit.count++;
  if (clientLimit.count > CONFIG.RATE_LIMIT_MAX_REQUESTS) {
    return res.status(429).json({
      error: 'Çok fazla istek gönderildi. Lütfen bir dakika sonra tekrar deneyin.'
    });
  }

  next();
}

// Test amaçlı sıfırlama hook'u (yalnızca testlerde kullanılır)
export function _resetRateLimitsForTests() {
  rateLimits.clear();
  lastSweep = Date.now();
}
