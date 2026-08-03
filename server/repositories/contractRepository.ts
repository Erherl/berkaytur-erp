/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../database/prisma';
import { GoogleSheetsAndDriveService } from '../services/googleSheetsAndDriveService';
import logger from '../utils/logger';

export const ContractRepository = {
  async findAll(options: { allowedStudentIds?: string[] } = {}) {
    const where: any = { isDeleted: false };
    if (options.allowedStudentIds) {
      where.studentId = { in: options.allowedStudentIds };
    }
    return prisma.contract.findMany({ where });
  },

  async findById(id: string) {
    return prisma.contract.findFirst({
      where: { id, isDeleted: false },
    });
  },

  async create(contractData: any) {
    const created = await prisma.contract.create({
      data: {
        ...contractData,
        km: contractData.km ? Number(contractData.km) : null,
        annualFee: contractData.annualFee ? Number(contractData.annualFee) : null,
        installmentCount: contractData.installmentCount ? Number(contractData.installmentCount) : 0,
        version: contractData.version ? Number(contractData.version) : 1,
        createdAt: contractData.createdAt || new Date().toISOString(),
      },
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Contracts', created.id, created).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync contract on create:', err)
      );
    }
    return created;
  },

  async update(id: string, updateData: any) {
    const payload: any = { ...updateData };
    if (updateData.km !== undefined) {
      payload.km = updateData.km ? Number(updateData.km) : null;
    }
    if (updateData.annualFee !== undefined) {
      payload.annualFee = updateData.annualFee ? Number(updateData.annualFee) : null;
    }
    if (updateData.installmentCount !== undefined) {
      payload.installmentCount = updateData.installmentCount ? Number(updateData.installmentCount) : 0;
    }
    if (updateData.version !== undefined) {
      payload.version = updateData.version ? Number(updateData.version) : 1;
    }
    const updated = await prisma.contract.update({
      where: { id },
      data: payload,
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Contracts', updated.id, updated).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync contract on update:', err)
      );
    }
    return updated;
  },

  async delete(id: string) {
    const deleted = await prisma.contract.update({
      where: { id },
      data: { isDeleted: true },
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Contracts', deleted.id, deleted).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync contract on delete:', err)
      );
    }
    return deleted;
  }
};
