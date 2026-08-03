/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { DocumentService } from '../services/documentService';
import { successResponse } from '../utils/response';
import logger from '../utils/logger';

export const DocumentController = {
  async getDocuments(req: Request, res: Response) {
    const { page, limit, search, category } = req.query;
    const user = (req as any).user;
    const result = await DocumentService.getDocuments(user, {
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      category: category as string,
    });
    res.json(successResponse(result.documents, 'Evraklar başarıyla listelendi.', result.pagination));
  },

  async getDocumentById(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;
    const doc = await DocumentService.getDocumentById(id, user);
    res.json(successResponse(doc, 'Evrak bilgisi başarıyla getirildi.'));
  },

  async uploadDocument(req: Request, res: Response) {
    const user = (req as any).user;
    const saved = await DocumentService.uploadDocument(req.body, user);
    res.status(201).json(successResponse(saved, 'Evrak başarıyla arşive yüklendi.'));
  },

  async updateDocument(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;
    const updated = await DocumentService.updateDocument(id, req.body, user);
    res.json(successResponse(updated, 'Evrak başarıyla güncellendi.'));
  },

  async deleteDocument(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;
    const result = await DocumentService.deleteDocument(id, user);
    res.json(successResponse(result, 'Evrak başarıyla silindi.'));
  },

  async downloadDocument(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;
    const doc = await DocumentService.downloadDocument(id, user);

    try {
      const fileBuffer = await DocumentService.readDocumentBinary(doc);
      const mimeType = doc.mimeType || 'application/pdf';
      const safeName = encodeURIComponent(doc.name || `${doc.id}.bin`);
      res.setHeader('Content-disposition', `attachment; filename="${safeName}"`);
      res.setHeader('Content-type', mimeType);
      return res.send(fileBuffer);
    } catch (err: any) {
      logger.error('Error serving document download:', err);
      res.status(err.status || 500).json({ success: false, message: err.message || 'Belge indirilemedi.' });
    }
  }
};
