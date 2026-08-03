/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../database/prisma';
import { GoogleSheetsAndDriveService } from '../services/googleSheetsAndDriveService';
import logger from '../utils/logger';

export const VehicleRepository = {
  async findAll(options: { page?: number; limit?: number; search?: string; status?: string; allowedVehicleIds?: string[] } = {}) {
    const page = options.page ? Number(options.page) : 1;
    const limit = options.limit ? Number(options.limit) : 20;
    const skip = (page - 1) * limit;

    const where: any = { isDeleted: false };
    if (options.status) {
      where.status = options.status;
    }
    if (options.allowedVehicleIds) {
      where.id = { in: options.allowedVehicleIds };
    }
    if (options.search) {
      where.OR = [
        { plate: { contains: options.search } },
        { brand: { contains: options.search } },
        { model: { contains: options.search } },
        { driverName: { contains: options.search } },
        { hostessName: { contains: options.search } },
        { supplierCompany: { contains: options.search } }
      ];
    }

    const [total, vehicles] = await Promise.all([
      prisma.vehicle.count({ where }),
      prisma.vehicle.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' }
      })
    ]);

    const vehicleIds = vehicles.map(v => v.id);
    const histories = await prisma.vehicleHistory.findMany({
      where: { vehicleId: { in: vehicleIds } },
      orderBy: { createdAt: 'desc' }
    });

    const result = vehicles.map((v) => {
      const history = histories.filter(h => h.vehicleId === v.id);
      return {
        ...v,
        seating: JSON.parse(v.seating || '{}'),
        history
      };
    });

    return {
      vehicles: result,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async findById(id: string) {
    const v = await prisma.vehicle.findFirst({
      where: { id, isDeleted: false },
    });
    if (!v) return null;
    const history = await prisma.vehicleHistory.findMany({
      where: { vehicleId: id },
      orderBy: { createdAt: 'desc' },
    });
    return {
      ...v,
      seating: JSON.parse(v.seating || '{}'),
      history,
    };
  },

  async create(vehicleData: any) {
    const { history, seating, ...rest } = vehicleData;
    const created = await prisma.vehicle.create({
      data: {
        ...rest,
        seating: seating ? JSON.stringify(seating) : '{}',
      },
    });
    if (Array.isArray(history)) {
      for (const item of history) {
        await prisma.vehicleHistory.create({
          data: {
            vehicleId: created.id,
            date: item.date,
            type: item.type,
            title: item.title,
            details: item.details,
            cost: item.cost ? Number(item.cost) : null,
          },
        });
      }
    }
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Vehicles', created.id, created).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync vehicle on create:', err)
      );
    }
    return this.findById(created.id);
  },

  async update(id: string, updateData: any) {
    const { history, seating, ...rest } = updateData;
    const updatePayload: any = { ...rest };
    if (seating !== undefined) {
      updatePayload.seating = JSON.stringify(seating);
    }
    const updated = await prisma.vehicle.update({
      where: { id },
      data: updatePayload,
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Vehicles', updated.id, updated).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync vehicle on update:', err)
      );
    }
    return this.findById(id);
  },

  async delete(id: string) {
    const target = await this.findById(id);
    if (!target) return null;
    const deleted = await prisma.vehicle.update({
      where: { id },
      data: { isDeleted: true },
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Vehicles', deleted.id, deleted).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync vehicle on delete:', err)
      );
    }
    return target;
  },

  async addHistory(id: string, historyItem: any) {
    const created = await prisma.vehicleHistory.create({
      data: {
        vehicleId: id,
        date: historyItem.date,
        type: historyItem.type,
        title: historyItem.title,
        details: historyItem.details,
        cost: historyItem.cost ? Number(historyItem.cost) : null,
      },
    });
    return created;
  }
};
