/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../database/prisma';
import { GoogleSheetsAndDriveService } from '../services/googleSheetsAndDriveService';
import logger from '../utils/logger';

const PAYMENT_MUTABLE_FIELDS = [
  'studentId',
  'studentName',
  'parentName',
  'amount',
  'dueDate',
  'paymentDate',
  'status',
  'category',
  'description',
  'createdBy',
  'updatedBy',
  'deletedBy',
  'isDeleted'
] as const;

function pickPaymentPayload(paymentData: Record<string, any>) {
  const data: Record<string, any> = {};
  for (const field of PAYMENT_MUTABLE_FIELDS) {
    if (paymentData[field] !== undefined) data[field] = paymentData[field];
  }
  if (data.amount !== undefined) data.amount = Number(data.amount);
  return data;
}

export const PaymentRepository = {
  async findAll(options: { page?: number; limit?: number; search?: string; status?: string; allowedStudentIds?: string[] } = {}) {
    const page = options.page ? Number(options.page) : 1;
    const limit = options.limit ? Number(options.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };
    if (options.status) {
      where.status = options.status;
    }
    if (options.allowedStudentIds) {
      where.studentId = { in: options.allowedStudentIds };
    }
    if (options.search) {
      where.OR = [
        { studentName: { contains: options.search } },
        { parentName: { contains: options.search } },
        { category: { contains: options.search } },
        { description: { contains: options.search } },
      ];
    }

    const [total, payments] = await Promise.all([
      prisma.payment.count({ where }),
      prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { dueDate: 'desc' }
      })
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async findById(id: string) {
    return prisma.payment.findFirst({
      where: { id, isDeleted: false },
    });
  },

  async create(paymentData: any) {
    const created = await prisma.payment.create({
      data: pickPaymentPayload(paymentData) as any,
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Payments', created.id, created).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync payment on create:', err)
      );
    }
    return created;
  },

  async update(id: string, updateData: any) {
    const updated = await prisma.payment.update({
      where: { id },
      data: pickPaymentPayload(updateData) as any,
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Payments', updated.id, updated).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync payment on update:', err)
      );
    }
    return updated;
  },

  async delete(id: string) {
    const deleted = await prisma.payment.update({
      where: { id },
      data: { isDeleted: true },
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Payments', deleted.id, deleted).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync payment on delete:', err)
      );
    }
    return deleted;
  }
};
