/**
 * Standalone Node.js Express Server Entrypoint
 * Used for local development and standalone Docker container deployments
 */

import path from 'path';
import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

import { CONFIG } from './server/config';
import { logger } from './server/utils/logger';
import { BackupService } from './server/services/backupService';
import { prisma } from './server/database/prisma';
import { app, initializeDatabaseAndAdmin } from './server/app';

dotenv.config();

async function startServer() {
  await initializeDatabaseAndAdmin();

  // Vite integration & Static Assets Serving for standalone mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    logger.info('Vite Dev Middleware mounted.');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath, {
      maxAge: '1y',
      immutable: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html') || filePath.includes('service-worker')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        } else {
          res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
      }
    }));
    app.get('*', (req, res) => {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(distPath, 'index.html'));
    });
    logger.info('Production static files handler mounted with caching headers.');
  }

  const server = app.listen(CONFIG.PORT, '0.0.0.0', () => {
    logger.info(`[FULLSTACK SERVER] running on http://localhost:${CONFIG.PORT}`);
    
    try {
      BackupService.initScheduler();
    } catch (e: any) {
      logger.error('Failed to initialize Backup scheduler:', e);
    }
  });

  const gracefulShutdown = (signal: string) => {
    logger.warn(`Received ${signal}. Starting graceful shutdown...`);
    
    server.close(async () => {
      logger.info('HTTP server closed.');
      try {
        await prisma.$disconnect();
        logger.info('Database connection closed.');
        process.exit(0);
      } catch (err) {
        logger.error('Error during database disconnect:', err);
        process.exit(1);
      }
    });

    setTimeout(() => {
      logger.error('Force shutting down after timeout.');
      process.exit(1);
    }, 10000);
  };

  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  process.on('uncaughtException', (error) => {
    logger.error('CRITICAL: Uncaught Exception caught at process level:', error);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason) => {
    const errObj = reason instanceof Error ? reason : new Error(String(reason));
    logger.error(`CRITICAL: Unhandled Promise Rejection: ${String(reason)}`, errObj);
  });
}

startServer().catch((err) => {
  logger.error('Failed to start standalone server:', err);
});
