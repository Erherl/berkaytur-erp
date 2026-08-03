import { Request, Response } from 'express';
import { app, initializeDatabaseAndAdmin } from '../server/app';

/**
 * Vercel Serverless Entry Point
 * Routes all /api/* requests to Express API router in a serverless context
 */
export default async function handler(req: Request, res: Response) {
  // Ensure database connections and Super Admin initialization on cold start
  await initializeDatabaseAndAdmin();
  return app(req, res);
}
