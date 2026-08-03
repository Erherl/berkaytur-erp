/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { LogService } from '../services/logService';
import { successResponse } from '../utils/response';

export const LogController = {
  async getLogs(req: Request, res: Response) {
    const { page, limit, search, userRole } = req.query;
    const result = await LogService.getLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      userRole: userRole as string
    });
    res.json(successResponse(result.logs, 'Sistem logları başarıyla listelendi.', result.pagination));
  },

  async createLog(req: Request, res: Response) {
    const log = await LogService.createLog(req.body);
    res.status(201).json(successResponse(log, 'Yeni denetim logu başarıyla kaydedildi.'));
  }
};

