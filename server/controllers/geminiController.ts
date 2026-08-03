/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { GeminiService } from '../services/geminiService';
import { geminiChatSchema, ocrSchema, getZodErrorMessage } from '../validators/schemas';
import { successResponse } from '../utils/response';

export const GeminiController = {
  async chat(req: Request, res: Response) {
    const validated = geminiChatSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ success: false, message: getZodErrorMessage(validated.error) });
    }

    const { prompt, systemContext } = validated.data;
    const result = await GeminiService.chat(prompt, systemContext);
    res.json(successResponse(result, 'Yapay zeka yanıtı başarıyla üretildi.'));
  },

  async extractDocDate(req: Request, res: Response) {
    const validated = ocrSchema.safeParse(req.body);
    if (!validated.success) {
      return res.status(400).json({ success: false, message: getZodErrorMessage(validated.error) });
    }

    const { docKey, fileName, userRole } = validated.data;
    const result = await GeminiService.extractDocDate(docKey, fileName, userRole);
    res.json(successResponse(result, 'Evrak içeriği yapay zeka tarafından başarıyla analiz edildi.'));
  }
};
