/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../database/prisma';
import { GoogleSheetsAndDriveService } from '../services/googleSheetsAndDriveService';
import logger from '../utils/logger';

export const AttendanceRepository = {
  async findAll(options: { page?: number; limit?: number; date?: string; status?: string; allowedStudentIds?: string[] } = {}) {
    const page = options.page ? Number(options.page) : 1;
    const limit = options.limit ? Number(options.limit) : 50;
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };
    if (options.status) {
      where.status = options.status;
    }
    if (options.date) {
      where.date = options.date;
    }
    if (options.allowedStudentIds) {
      where.studentId = { in: options.allowedStudentIds };
    }

    const [total, attendance] = await Promise.all([
      prisma.attendance.count({ where }),
      prisma.attendance.findMany({
        where,
        skip,
        take: limit,
        orderBy: { date: 'desc' }
      })
    ]);

    return {
      attendance,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async findByStudentDateShift(studentId: string, date: string, shift: string) {
    return prisma.attendance.findFirst({
      where: { studentId, date, shift, isDeleted: false },
    });
  },

  async create(attendanceData: any) {
    const created = await prisma.attendance.create({
      data: {
        id: attendanceData.id || undefined,
        studentId: attendanceData.studentId,
        date: attendanceData.date,
        shift: attendanceData.shift,
        status: attendanceData.status,
        timestamp: attendanceData.timestamp,
      },
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Attendance', created.id, created).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync attendance on create:', err)
      );
    }
    return created;
  },

  async update(id: string, updateData: any) {
    const updated = await prisma.attendance.update({
      where: { id },
      data: updateData,
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Attendance', updated.id, updated).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync attendance on update:', err)
      );
    }
    return updated;
  }
};
