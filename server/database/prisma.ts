/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger';

if (!process.env.DATABASE_URL) {
  logger.warn('⚠️ [DATABASE] DATABASE_URL ortam değişkeni tanımlanmamış. Lütfen Neon PostgreSQL veya geçerli PostgreSQL URL ekleyin.');
}

// Prevent multiple instances of PrismaClient in development (hot reload)
const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient({
  log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

export default prisma;
