/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../database/prisma';
import { GoogleSheetsAndDriveService } from '../services/googleSheetsAndDriveService';
import logger from '../utils/logger';

function buildDocumentWhere(baseFilters: any, accessWhere: any = {}, searchFilters?: any) {
  const clauses = [baseFilters];
  if (accessWhere && Object.keys(accessWhere).length > 0) {
    clauses.push(accessWhere);
  }
  if (searchFilters && Object.keys(searchFilters).length > 0) {
    clauses.push(searchFilters);
  }
  return clauses.length === 1 ? clauses[0] : { AND: clauses };
}

export const DocumentRepository = {
  async findAll(
    options: { page?: number; limit?: number; search?: string; category?: string; uploadedBy?: string } = {},
    accessWhere: any = {}
  ) {
    const page = options.page ? Number(options.page) : 1;
    const limit = options.limit ? Number(options.limit) : 20;
    const skip = (page - 1) * limit;

    const baseFilters: any = { isDeleted: false };
    if (options.category) {
      baseFilters.category = options.category;
    }
    if (options.uploadedBy) {
      baseFilters.uploadedBy = options.uploadedBy;
    }

    const searchFilters = options.search
      ? {
          OR: [
            { name: { contains: options.search, mode: 'insensitive' } },
            { category: { contains: options.search, mode: 'insensitive' } },
            { uploadedBy: { contains: options.search, mode: 'insensitive' } }
          ]
        }
      : undefined;

    const where = buildDocumentWhere(baseFilters, accessWhere, searchFilters);

    const [total, documents] = await Promise.all([
      prisma.document.count({ where }),
      prisma.document.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ uploadDate: 'desc' }, { updatedAt: 'desc' }]
      })
    ]);

    return {
      documents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async findById(id: string, accessWhere: any = {}) {
    return prisma.document.findFirst({
      where: buildDocumentWhere({ id, isDeleted: false }, accessWhere),
    });
  },

  async create(docData: any) {
    const created = await prisma.document.create({ data: docData });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Documents', created.id, created).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync document metadata on create:', err)
      );
    }
    return created;
  },

  async update(id: string, updateData: any, accessWhere: any = {}) {
    const existing = await this.findById(id, accessWhere);
    if (!existing) return null;

    const updated = await prisma.document.update({
      where: { id },
      data: updateData,
    });

    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Documents', updated.id, updated).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync document metadata on update:', err)
      );
    }

    return this.findById(id, accessWhere);
  },

  async delete(id: string, deletedBy: string | null, accessWhere: any = {}) {
    const existing = await this.findById(id, accessWhere);
    if (!existing) return null;

    const deleted = await prisma.document.update({
      where: { id },
      data: {
        isDeleted: true,
        deletedBy: deletedBy || undefined,
      },
    });

    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Documents', deleted.id, deleted).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync document metadata on delete:', err)
      );
    }

    return existing;
  }
};
