/**
 * Database resilience helpers for Neon PostgreSQL / Prisma.
 */

import { logger } from '../utils/logger';

export const DatabaseResilience = {
  async init() {
    logger.info('🐘 [DATABASE] Neon PostgreSQL dayanıklılık katmanı etkin.');
  },

  async runMaintenance() {
    logger.info('🐘 [DATABASE] Yönetilen PostgreSQL bakım ve yedekleme süreçleri servis sağlayıcı ile uygulama zamanlayıcıları tarafından yürütülüyor.');
  },

  async withRetry<T>(fn: () => Promise<T>, maxRetries = 5, initialDelay = 100): Promise<T> {
    let lastError: any = null;
    let delay = initialDelay;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error: any) {
        lastError = error;
        const errMsg = String(error?.message || error || '');

        if (
          errMsg.includes('P2034') ||
          errMsg.includes('P2024') ||
          errMsg.toLowerCase().includes('connection pool') ||
          errMsg.toLowerCase().includes('too many connections')
        ) {
          logger.warn(`⚠️ [DATABASE] Geçici veritabanı yoğunluğu (Deneme ${attempt}/${maxRetries}). ${delay}ms sonra yeniden denenecek...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay = Math.round(delay * 1.5);
          continue;
        }

        throw error;
      }
    }

    logger.error(`❌ [DATABASE] İşlem ${maxRetries} denemeden sonra başarısız oldu.`);
    throw lastError;
  }
};
