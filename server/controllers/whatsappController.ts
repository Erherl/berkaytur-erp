/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { WhatsAppService } from '../services/whatsappService';
import { WhatsAppWebService } from '../services/whatsappWebService';
import { successResponse } from '../utils/response';

export const WhatsAppController = {
  async getLogs(req: Request, res: Response) {
    const { page, limit } = req.query;
    const result = await WhatsAppService.getLogs({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined
    });
    res.json(successResponse(result.messages, 'WhatsApp gönderim günlükleri başarıyla listelendi.', result.pagination));
  },

  async send(req: Request, res: Response) {
    const result = await WhatsAppService.send(req.body);
    res.json(successResponse(result, 'WhatsApp mesajı başarıyla sıraya alındı ve gönderildi.'));
  },

  async interpretMessage(req: Request, res: Response) {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'Mesaj içeriği boş olamaz.' });
    }
    const { GeminiService } = await import('../services/geminiService');
    const analysis = await GeminiService.interpretTurkishCommand(message);
    res.json(successResponse(analysis, 'WhatsApp mesajı yapay zeka tarafından başarıyla analiz edildi.'));
  },

  // Connection monitoring & live gateway endpoints
  async getStatus(req: Request, res: Response) {
    const state = WhatsAppWebService.getState();
    res.json(successResponse(state, 'WhatsApp Web bağlantı durumu başarıyla alındı.'));
  },

  async connect(req: Request, res: Response) {
    const result = await WhatsAppWebService.connect();
    if (!result.success) {
      return res.status(400).json({
        success: false,
        message: result.message,
        data: WhatsAppWebService.getState()
      });
    }
    res.json(successResponse(WhatsAppWebService.getState(), 'WhatsApp Web bağlantı isteği başarıyla başlatıldı.'));
  },

  async disconnect(req: Request, res: Response) {
    await WhatsAppWebService.disconnect();
    res.json(successResponse(WhatsAppWebService.getState(), 'WhatsApp Web bağlantısı kesildi.'));
  },

  async sendMedia(req: Request, res: Response) {
    const { phone, message, mediaType } = req.body;
    if (!phone || !message || !mediaType) {
      return res.status(400).json({ success: false, message: 'phone, message ve mediaType alanları zorunludur.' });
    }
    const result = await WhatsAppWebService.sendMediaMessage(phone, message, mediaType);
    res.json(successResponse(result, 'Medya mesajı başarıyla gönderildi.'));
  }
};
