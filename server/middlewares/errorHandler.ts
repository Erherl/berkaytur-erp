/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';
import { errorResponse } from '../utils/response';

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  logger.error(`Error occurred on ${req.method} ${req.url}:`, err);
  
  if (res.headersSent) {
    return next(err);
  }

  // Handle Prisma Database Errors
  if (err.code && typeof err.code === 'string' && err.code.startsWith('P')) {
    const prismaMsg = `Veritabanı hatası oluştu (Kod: ${err.code}).`;
    return res.status(400).json(errorResponse(prismaMsg, { code: err.code, meta: err.meta }));
  }

  // Handle validation or custom errors
  const status = err.status || 500;
  const message = err.message || 'Sunucu içi bir hata oluştu.';
  
  res.status(status).json(errorResponse(message, err.details || null));
}

