/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { ReportService } from '../services/reportService';
import { getResourceScope } from '../utils/scopeFilter';

export const ReportController = {
  async getReport(req: Request, res: Response) {
    const { type } = req.params;
    const q = (req.query.q as string) || '';
    const user = (req as any).user;
    const scope = user && user.role !== 'admin' ? await getResourceScope(user) : undefined;
    const result = await ReportService.getReport(type, q, scope);
    res.json(result);
  }
};
