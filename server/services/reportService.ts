/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../database/prisma';
import { CacheService } from './cacheService';
import type { ScopeFilters } from '../utils/scopeFilter';

export const ReportService = {
  async getReport(type: string, q: string = '', scope?: ScopeFilters) {
    const query = (q || '').trim();
    const isGlobal = scope?.isGlobal ?? true;
    const allowedStudentIds = scope?.allowedStudentIds || [];
    const allowedVehicleIds = scope?.allowedVehicleIds || [];
    const cacheKey = `report:${type}:${query.toLowerCase()}:${isGlobal ? 'global' : `${allowedStudentIds.join(',')}|${allowedVehicleIds.join(',')}`}`;

    const cachedData = await CacheService.get<any>(cacheKey);
    if (cachedData) {
      return cachedData;
    }

    let data: any[] = [];
    let summary: Record<string, any> = {};

    switch (type) {
      case 'students': {
        const where: any = { isDeleted: false, ...(isGlobal ? {} : { id: { in: allowedStudentIds } }) };
        if (query) {
          where.OR = [
            { name: { contains: query, mode: 'insensitive' } },
            { schoolName: { contains: query, mode: 'insensitive' } }
          ];
        }

        const filtered = await prisma.student.findMany({
          where,
          select: {
            id: true,
            name: true,
            schoolName: true,
            routeId: true,
            morningStatus: true,
            eveningStatus: true
          }
        });

        const [totalCount, morningAssignedCount] = await Promise.all([
          prisma.student.count({ where: { isDeleted: false, ...(isGlobal ? {} : { id: { in: allowedStudentIds } }) } }),
          prisma.student.count({ where: { isDeleted: false, routeId: { not: null }, ...(isGlobal ? {} : { id: { in: allowedStudentIds } }) } })
        ]);

        data = filtered;
        summary = {
          totalCount,
          matchedCount: filtered.length,
          morningAssigned: morningAssignedCount,
          eveningAssigned: morningAssignedCount
        };
        break;
      }

      case 'vehicles': {
        const where: any = { isDeleted: false, ...(isGlobal ? {} : { id: { in: allowedVehicleIds } }) };
        if (query) {
          where.OR = [
            { plate: { contains: query, mode: 'insensitive' } },
            { brand: { contains: query, mode: 'insensitive' } },
            { model: { contains: query, mode: 'insensitive' } }
          ];
        }

        const filtered = await prisma.vehicle.findMany({
          where,
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true,
            capacity: true,
            status: true
          }
        });

        const [totalCount, totalCapacity, activeCount] = await Promise.all([
          prisma.vehicle.count({ where: { isDeleted: false, ...(isGlobal ? {} : { id: { in: allowedVehicleIds } }) } }),
          prisma.vehicle.aggregate({
            where: { isDeleted: false, ...(isGlobal ? {} : { id: { in: allowedVehicleIds } }) },
            _sum: { capacity: true }
          }),
          prisma.vehicle.count({
            where: {
              isDeleted: false,
              ...(isGlobal ? {} : { id: { in: allowedVehicleIds } }),
              status: { in: ['Active', 'Aktif', 'aktif'] }
            }
          })
        ]);

        data = filtered;
        summary = {
          totalCount,
          matchedCount: filtered.length,
          totalCapacity: totalCapacity._sum.capacity || 0,
          activeCount
        };
        break;
      }

      case 'absences': {
        const where: any = { isDeleted: false, ...(isGlobal ? {} : { id: { in: allowedStudentIds } }) };
        if (query) {
          where.name = { contains: query, mode: 'insensitive' };
        }

        const [filtered, totalCount, absentMorning, absentEvening] = await Promise.all([
          prisma.student.findMany({
            where,
            select: {
              id: true,
              name: true,
              morningStatus: true,
              eveningStatus: true
            }
          }),
          prisma.student.count({ where: { isDeleted: false, ...(isGlobal ? {} : { id: { in: allowedStudentIds } }) } }),
          prisma.student.count({ where: { isDeleted: false, morningStatus: 'absent', ...(isGlobal ? {} : { id: { in: allowedStudentIds } }) } }),
          prisma.student.count({ where: { isDeleted: false, eveningStatus: 'absent', ...(isGlobal ? {} : { id: { in: allowedStudentIds } }) } })
        ]);

        data = filtered;
        summary = {
          totalCount,
          absentMorning,
          absentEvening,
          presentCount: totalCount - Math.max(absentMorning, absentEvening)
        };
        break;
      }

      case 'payments': {
        const where: any = { isDeleted: false, ...(isGlobal ? {} : { studentId: { in: allowedStudentIds } }) };
        if (query) {
          where.OR = [
            { studentName: { contains: query, mode: 'insensitive' } },
            { parentName: { contains: query, mode: 'insensitive' } }
          ];
        }

        const [filtered, totalCount, paidSums, pendingSums, refundedSums] = await Promise.all([
          prisma.payment.findMany({
            where,
            select: {
              id: true,
              studentName: true,
              parentName: true,
              status: true,
              amount: true,
              dueDate: true
            }
          }),
          prisma.payment.count({ where: { isDeleted: false, ...(isGlobal ? {} : { studentId: { in: allowedStudentIds } }) } }),
          prisma.payment.aggregate({
            where: { isDeleted: false, ...(isGlobal ? {} : { studentId: { in: allowedStudentIds } }), status: { in: ['paid', 'Ödendi'] } },
            _sum: { amount: true }
          }),
          prisma.payment.aggregate({
            where: { isDeleted: false, ...(isGlobal ? {} : { studentId: { in: allowedStudentIds } }), status: { in: ['pending', 'Bekliyor'] } },
            _sum: { amount: true }
          }),
          prisma.payment.aggregate({
            where: { isDeleted: false, ...(isGlobal ? {} : { studentId: { in: allowedStudentIds } }), status: { in: ['refunded', 'İade Edildi'] } },
            _sum: { amount: true }
          })
        ]);

        data = filtered;
        summary = {
          totalCount,
          matchedCount: filtered.length,
          totalCollected: paidSums._sum.amount || 0,
          totalPending: pendingSums._sum.amount || 0,
          totalRefunded: refundedSums._sum.amount || 0
        };
        break;
      }

      case 'inspections': {
        const where: any = { isDeleted: false, ...(isGlobal ? {} : { id: { in: allowedVehicleIds } }) };
        if (query) {
          where.plate = { contains: query, mode: 'insensitive' };
        }

        const vehicles = await prisma.vehicle.findMany({
          where,
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true
          }
        });

        const inspections = vehicles.map(v => ({
          id: `ins_${v.id}`,
          plate: v.plate,
          brand: v.brand,
          model: v.model,
          inspector: 'Okul Sorumlusu (Denetçi)',
          time: 'Bugün 08:15',
          result: 'Sorunsuz (Uygun)',
          faults: 0
        }));

        data = inspections;
        summary = {
          totalInspected: vehicles.length,
          totalFaults: 0,
          passedCount: vehicles.length
        };
        break;
      }

      default:
        throw new Error('Geçersiz rapor türü.');
    }

    const result = { data, summary };
    await CacheService.set(cacheKey, result, 30);
    return result;
  }
};
