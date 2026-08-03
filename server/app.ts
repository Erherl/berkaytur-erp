/**
 * Express Application Assembly
 * Works both as a standalone Express app (server.ts) and Vercel Serverless Handler (api/index.ts)
 */

import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import fs from 'fs';

import { CONFIG } from './config';
import { apiRouter } from './routes';
import { customRateLimiter } from './middlewares/rateLimiter';
import { errorHandler } from './middlewares/errorHandler';
import { logger } from './utils/logger';
import {
  enforceIpBan,
  trackRequestMetrics,
  inspectAndSanitizeInput,
  wrapResponseEnvelope
} from './middlewares/security';
import { prisma } from './database/prisma';
import { DatabaseResilience } from './database/databaseResilience';
import { initAdmin } from './database/initAdmin';

import crypto from 'crypto';

export function validateEnv() {
  if (!process.env.JWT_SECRET) {
    process.env.JWT_SECRET = crypto.randomBytes(32).toString('hex');
    logger.warn('⚠️ [SECURITY] JWT_SECRET ortam değişkeni bulunamadı, dinamik rastgele güvenli anahtar üretildi.');
  }

  if (!process.env.JWT_REFRESH_SECRET) {
    process.env.JWT_REFRESH_SECRET = crypto.randomBytes(32).toString('hex');
    logger.warn('⚠️ [SECURITY] JWT_REFRESH_SECRET ortam değişkeni bulunamadı, dinamik rastgele refresh anahtarı üretildi.');
  }

  if (!process.env.DATABASE_URL) {
    logger.warn('⚠️ [DATABASE] DATABASE_URL bulunamadı. Lütfen Render / Neon PostgreSQL bağlantı dizesini ekleyin.');
  }
}

export function ensureRequiredDirectories() {
  const dirs = [CONFIG.UPLOADS_DIR, CONFIG.BACKUPS_DIR, CONFIG.LOGS_DIR];
  dirs.forEach((dir) => {
    try {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    } catch (err) {
      // Ignore disk creation errors on read-only serverless platforms
    }
  });
}

let isInitialized = false;
export async function initializeDatabaseAndAdmin() {
  if (isInitialized) return;
  try {
    validateEnv();
    ensureRequiredDirectories();
    await DatabaseResilience.init();
    await initAdmin();
    isInitialized = true;
  } catch (err) {
    logger.error('⚠️ Database and Admin initialization failed:', err);
  }
}

export function createExpressApp() {
  const app = express();
  const isProduction = process.env.NODE_ENV === 'production';
  const configuredOrigins = [
    process.env.ALLOWED_ORIGINS,
    process.env.CLIENT_URL,
    process.env.RENDER_EXTERNAL_URL,
    process.env.APP_URL,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((value) => value.trim())
    .filter(Boolean);

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  // 1. IP Ban Enforcement and Request Metrics
  app.use(enforceIpBan);
  app.use(trackRequestMetrics);

  // 2. Production Performance, CORS and Security Headers
  app.use(compression());
  
  app.use(cors({
    origin: (origin, callback) => {
      if (!origin) {
        return callback(null, true);
      }

      if (configuredOrigins.includes(origin)) {
        return callback(null, true);
      }

      if (!isProduction && (origin === 'http://localhost:3000' || origin === 'http://127.0.0.1:3000')) {
        return callback(null, true);
      }

      return callback(new Error('Bu origin için CORS izni bulunmuyor.'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'X-Request-Id'],
  }));

  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: isProduction ? ["'self'", 'https://unpkg.com'] : ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://unpkg.com'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://unpkg.com'],
        imgSrc: ["'self'", 'data:', 'https://*.tile.openstreetmap.org', 'https://unpkg.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'", 'wss:', 'https:'],
        frameAncestors: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: { policy: 'same-origin-allow-popups' },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: isProduction ? undefined : false,
  }));

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));

  // Apply rate limiter on API endpoints
  app.use('/api/', customRateLimiter);

  // Mount Response Envelope and Input Sanitizer for /api
  app.use('/api', wrapResponseEnvelope);
  app.use('/api', inspectAndSanitizeInput);

  // Health check endpoints (Render / Monitor compatible)
  const healthCheckHandler = async (req: express.Request, res: express.Response) => {
    let dbStatus = 'UNCONFIGURED';
    let dbError: string | null = null;

    if (process.env.DATABASE_URL) {
      try {
        await prisma.$queryRaw`SELECT 1`;
        dbStatus = 'UP';
      } catch (error) {
        dbStatus = 'DOWN';
        dbError = error instanceof Error ? error.message : 'Database query failed';
        logger.error('Health check database query failed:', error);
      }
    }

    const isHealthy = dbStatus !== 'DOWN';
    const statusCode = isHealthy ? 200 : 503;

    res.status(statusCode).json({
      status: isHealthy ? 'UP' : 'DOWN',
      timestamp: new Date().toISOString(),
      platform: 'Berkaytur Production Platform',
      services: {
        database: dbStatus,
        server: 'UP'
      },
      system: {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
      },
      ...(dbError ? { error: dbError } : {})
    });
  };

  app.get('/health', healthCheckHandler);
  app.get('/api/health', healthCheckHandler);

  // Central Routing Layer
  app.use('/api', apiRouter);

  // Global Error Handling Middleware
  app.use(errorHandler);

  return app;
}

export const app = createExpressApp();
