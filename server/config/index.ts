/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import path from 'path';
import crypto from 'crypto';
import logger from '../utils/logger';

const isProduction = process.env.NODE_ENV === 'production';

// Generate dynamic non-predictable cryptographic keys if env vars are missing
const fallbackSecret = crypto.randomBytes(32).toString('hex');
const fallbackRefreshSecret = crypto.randomBytes(32).toString('hex');

if (isProduction && (!process.env.JWT_SECRET || !process.env.JWT_REFRESH_SECRET)) {
  logger.warn('⚠️ [WARNING] JWT_SECRET ve/veya JWT_REFRESH_SECRET tanımlanmadı. Rastgele güvenli anahtarlar dinamik olarak üretildi.');
}

const isVercel = Boolean(process.env.VERCEL || process.env.VERCEL_ENV);
const baseStorageDir = isVercel ? '/tmp' : process.cwd();

export const CONFIG = {
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
  JWT_SECRET: process.env.JWT_SECRET || fallbackSecret,
  JWT_REFRESH_SECRET: process.env.JWT_REFRESH_SECRET || fallbackRefreshSecret,
  ACCESS_TOKEN_EXPIRY: '15m',
  REFRESH_TOKEN_EXPIRY: '7d',
  SESSION_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes session timeout
  BRUTE_FORCE_WINDOW_MS: 15 * 60 * 1000, // 15 minutes window for brute-force tracking
  BRUTE_FORCE_MAX_ATTEMPTS: 5, // 5 failed attempts locks or rate limits
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
  UPLOADS_DIR: path.join(baseStorageDir, 'uploads'),
  BACKUPS_DIR: path.join(baseStorageDir, 'backups'),
  LOGS_DIR: path.join(baseStorageDir, 'logs'),
  IS_VERCEL: isVercel,
  RATE_LIMIT_WINDOW_MS: 60000, // 1 minute
  RATE_LIMIT_MAX_REQUESTS: 100, // Max 100 requests per IP per minute
};

