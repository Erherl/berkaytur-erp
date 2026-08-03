/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../database/prisma';
import { GoogleSheetsAndDriveService } from '../services/googleSheetsAndDriveService';
import logger from '../utils/logger';

const APPLICATION_MUTABLE_FIELDS = [
  'studentName',
  'tcNo',
  'birthDate',
  'gender',
  'schoolId',
  'classLevel',
  'section',
  'motherName',
  'fatherName',
  'phone',
  'email',
  'address',
  'morningAddress',
  'eveningAddress',
  'siblingInfo',
  'allergy',
  'medication',
  'emergencyContact',
  'emergencyPhone',
  'kvkkConsent',
  'rulesConsent',
  'contractConsent',
  'status',
  'km',
  'calculatedFee',
  'appliedAt',
  'createdBy',
  'updatedBy',
  'deletedBy',
  'isDeleted'
] as const;

function pickApplicationPayload(appData: Record<string, any>) {
  const data: Record<string, any> = {};
  for (const field of APPLICATION_MUTABLE_FIELDS) {
    if (appData[field] !== undefined) data[field] = appData[field];
  }
  if (data.km !== undefined) data.km = data.km ? Number(data.km) : null;
  if (data.calculatedFee !== undefined) data.calculatedFee = data.calculatedFee ? Number(data.calculatedFee) : null;
  if (!data.appliedAt) data.appliedAt = new Date().toISOString();
  return data;
}

export const ApplicationRepository = {
  async findAll(options: { page?: number; limit?: number; search?: string; status?: string; allowedSchoolIds?: string[] } = {}) {
    const page = options.page ? Number(options.page) : 1;
    const limit = options.limit ? Number(options.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };
    if (options.status) {
      where.status = options.status;
    }
    if (options.allowedSchoolIds) {
      where.schoolId = { in: options.allowedSchoolIds };
    }
    if (options.search) {
      const matchingSchools = await prisma.school.findMany({
        where: {
          isDeleted: false,
          OR: [
            { name: { contains: options.search } },
            { address: { contains: options.search } }
          ]
        },
        select: { id: true },
        take: 50,
      });
      where.OR = [
        { studentName: { contains: options.search } },
        { tcNo: { contains: options.search } },
        { phone: { contains: options.search } },
        { email: { contains: options.search } },
        ...(matchingSchools.length ? [{ schoolId: { in: matchingSchools.map((school) => school.id) } }] : [])
      ];
    }

    const [total, applications] = await Promise.all([
      prisma.application.count({ where }),
      prisma.application.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' }
      })
    ]);

    return {
      applications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async findById(id: string) {
    return prisma.application.findFirst({
      where: { id, isDeleted: false },
    });
  },

  async create(appData: any) {
    const created = await prisma.application.create({
      data: pickApplicationPayload(appData) as any,
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Applications', created.id, created).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync application on create:', err)
      );
    }
    return created;
  },

  async update(id: string, updateData: any) {
    const updated = await prisma.application.update({
      where: { id },
      data: pickApplicationPayload(updateData) as any,
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Applications', updated.id, updated).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync application on update:', err)
      );
    }
    return updated;
  },

  async delete(id: string) {
    const deleted = await prisma.application.update({
      where: { id },
      data: { isDeleted: true },
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Applications', deleted.id, deleted).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync application on delete:', err)
      );
    }
    return deleted;
  },

  async checkDuplicate(tcNo: string) {
    const count = await prisma.application.count({
      where: {
        tcNo,
        status: { in: ['Bekliyor', 'Onaylandı', 'pending', 'approved'] },
        isDeleted: false,
      },
    });
    return count > 0;
  }
};
