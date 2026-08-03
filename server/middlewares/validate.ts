/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError } from 'zod';

export interface RequestValidationSchemas {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}

/**
 * Express middleware to validate request segments (body, query, params) against Zod schemas.
 * Automatically strips undeclared parameters (Mass Assignment protection).
 */
export function validateRequest(schemas: RequestValidationSchemas) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (schemas.body) {
        const parsedBody = await schemas.body.parseAsync(req.body);
        req.body = parsedBody;
      }
      
      if (schemas.query) {
        const parsedQuery = await schemas.query.parseAsync(req.query);
        req.query = parsedQuery as any;
      }

      if (schemas.params) {
        const parsedParams = await schemas.params.parseAsync(req.params);
        req.params = parsedParams as any;
      }

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const firstMessage = error.issues[0]?.message || 'Girdi verileri doğrulanamadı.';
        const detailedErrors = error.issues.map(err => ({
          field: err.path.join('.'),
          message: err.message
        }));

        return res.status(400).json({
          success: false,
          message: `Doğrulama Hatası: ${firstMessage}`,
          error: firstMessage,
          details: detailedErrors,
          timestamp: new Date().toISOString()
        });
      }
      next(error);
    }
  };
}
