/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import fs from 'fs';
import path from 'path';
import { CONFIG } from '../config';
import { DocumentRepository } from '../repositories/documentRepository';
import { LogRepository } from '../repositories/logRepository';
import { GoogleSheetsAndDriveService } from './googleSheetsAndDriveService';
import logger from '../utils/logger';
import { buildDocumentAccessWhere, resolveDocumentScopePayload } from '../utils/documentAccess';

function createNotFound(message: string) {
  const err: any = new Error(message);
  err.status = 404;
  return err;
}

function createForbidden(message: string) {
  const err: any = new Error(message);
  err.status = 403;
  return err;
}

function normalizeFileData(fileData?: string) {
  if (!fileData) return null;
  const trimmed = String(fileData).trim();
  const parts = trimmed.split(',');
  return parts.length > 1 ? parts[parts.length - 1] : trimmed;
}

function getStoragePath(docId: string) {
  return path.join(CONFIG.UPLOADS_DIR, `${docId}.bin`);
}

async function persistFile(docId: string, fileData?: string) {
  if (!fileData) return;
  if (!fs.existsSync(CONFIG.UPLOADS_DIR)) {
    fs.mkdirSync(CONFIG.UPLOADS_DIR, { recursive: true });
  }
  const normalized = normalizeFileData(fileData);
  if (!normalized) return;
  const filePath = getStoragePath(docId);
  const buffer = Buffer.from(normalized, 'base64');
  await fs.promises.writeFile(filePath, buffer);
  logger.info(`[DocumentService] File successfully saved to disk: ${filePath}`);
}

export const DocumentService = {
  async getDocuments(user: any, options: { page?: number; limit?: number; search?: string; category?: string } = {}) {
    const accessWhere = await buildDocumentAccessWhere(user);
    return DocumentRepository.findAll(options, accessWhere);
  },

  async getDocumentById(id: string, user: any) {
    const accessWhere = await buildDocumentAccessWhere(user);
    const doc = await DocumentRepository.findById(id, accessWhere);
    if (!doc) {
      if (user?.role === 'admin') {
        throw createNotFound('Dosya bulunamadı.');
      }
      throw createForbidden('Bu evrak kaydına erişim yetkiniz bulunmamaktadır.');
    }
    return doc;
  },

  async uploadDocument(body: any, user: any) {
    const { name, category, fileSize } = body;
    if (!name || !category) {
      throw new Error('Dosya adı ve kategori zorunludur.');
    }

    const scopePayload = await resolveDocumentScopePayload(user, body);
    const docId = body.id || `doc_srv_${Date.now()}`;
    let fileUrl = `/api/v1/documents/${docId}/download`;
    const mimeType = body.mimeType || 'application/pdf';

    await persistFile(docId, body.fileData);

    if (body.fileData && GoogleSheetsAndDriveService.isConfigured()) {
      try {
        const normalizedFileData = normalizeFileData(body.fileData);
        const driveResult = await GoogleSheetsAndDriveService.uploadFile(
          'Documents',
          name,
          mimeType,
          normalizedFileData || ''
        );
        fileUrl = driveResult.webViewUrl || driveResult.fileUrl;
        logger.info(`[GoogleDrive] File successfully uploaded to Google Drive folder "Documents": ${fileUrl}`);
      } catch (err: any) {
        logger.error('[GoogleDrive] Failed to upload physical file to Google Drive:', err);
      }
    }

    const newDoc = {
      id: docId,
      name,
      category,
      fileSize: fileSize || '1.0 MB',
      uploadDate: new Date().toISOString().split('T')[0],
      uploadedBy: user?.name || body.uploadedBy || 'Sistem Yetkilisi',
      fileUrl,
      mimeType,
      ownerUserId: scopePayload.ownerUserId,
      schoolId: scopePayload.schoolId,
      vehicleId: scopePayload.vehicleId,
      studentId: scopePayload.studentId,
      createdBy: user?.id || 'system',
      updatedBy: user?.id || 'system'
    };

    const saved = await DocumentRepository.create(newDoc);

    await LogRepository.create({
      userId: user?.id || 'system',
      userName: user?.name || body.uploadedBy || 'Sistem Yetkilisi',
      userRole: user?.role || 'admin',
      action: 'Bulut Arşivine Evrak Yüklendi',
      details: `${name} isimli evrak ${category} klasörüne başarıyla yüklendi.`,
      timestamp: new Date().toLocaleString()
    });

    return saved;
  },

  async updateDocument(id: string, body: any, user: any) {
    const existing = await this.getDocumentById(id, user);
    const scopePayload = await resolveDocumentScopePayload(user, body, existing);

    const updateData: any = {
      updatedBy: user?.id || 'system'
    };

    if (body.name !== undefined) updateData.name = body.name;
    if (body.category !== undefined) updateData.category = body.category;
    if (body.fileSize !== undefined) updateData.fileSize = body.fileSize;
    if (body.mimeType !== undefined) updateData.mimeType = body.mimeType;
    if (body.fileData) {
      await persistFile(id, body.fileData);
      updateData.fileUrl = existing.fileUrl || `/api/v1/documents/${id}/download`;
    }

    if (user?.role === 'admin') {
      updateData.ownerUserId = scopePayload.ownerUserId;
      updateData.schoolId = scopePayload.schoolId;
      updateData.vehicleId = scopePayload.vehicleId;
      updateData.studentId = scopePayload.studentId;
    }

    const accessWhere = await buildDocumentAccessWhere(user);
    const updated = await DocumentRepository.update(id, updateData, accessWhere);
    if (!updated) {
      throw createForbidden('Bu evrak kaydını güncelleme yetkiniz bulunmamaktadır.');
    }

    await LogRepository.create({
      userId: user?.id || 'system',
      userName: user?.name || 'Sistem Yetkilisi',
      userRole: user?.role || 'admin',
      action: 'Evrak Güncellendi',
      details: `${updated.name} isimli evrak güncellendi.`,
      timestamp: new Date().toLocaleString()
    });

    return updated;
  },

  async deleteDocument(id: string, user: any) {
    const existing = await this.getDocumentById(id, user);
    const accessWhere = await buildDocumentAccessWhere(user);
    const deleted = await DocumentRepository.delete(id, user?.id || 'system', accessWhere);
    if (!deleted) {
      throw createForbidden('Bu evrak kaydını silme yetkiniz bulunmamaktadır.');
    }

    await LogRepository.create({
      userId: user?.id || 'system',
      userName: user?.name || 'Sistem Yetkilisi',
      userRole: user?.role || 'admin',
      action: 'Evrak Silindi',
      details: `${existing.name} isimli evrak soft-delete ile pasife alındı.`,
      timestamp: new Date().toLocaleString()
    });

    return { success: true };
  },

  async downloadDocument(id: string, user: any) {
    return this.getDocumentById(id, user);
  },

  async readDocumentBinary(doc: any) {
    const filePath = getStoragePath(doc.id);
    if (fs.existsSync(filePath)) {
      return fs.promises.readFile(filePath);
    }

    if ((doc.mimeType || 'application/pdf') === 'application/pdf') {
      const err: any = new Error('Dosya fiziksel arşivde bulunamadı.');
      err.status = 404;
      throw err;
    }

    const err: any = new Error('Dosya içeriği bulunamadı.');
    err.status = 404;
    throw err;
  }
};
