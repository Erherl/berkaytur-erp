/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { SheetsService } from '../services/sheetsService';
import { sheetsSyncSchema, getZodErrorMessage } from '../validators/schemas';
import { successResponse } from '../utils/response';

export const SheetsController = {
  async sync(req: Request, res: Response) {
    const validated = sheetsSyncSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ success: false, message: getZodErrorMessage(validated.error) });
    }

    const result = await SheetsService.sync(validated.data);
    res.json(successResponse(result, 'Google E-Tablolar senkronizasyonu tamamlandı.'));
  }
};
