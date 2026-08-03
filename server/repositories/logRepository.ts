/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../database/prisma';

export const LogRepository = {
  async findAll(options: { page?: number; limit?: number; search?: string; userRole?: string } = {}) {
    const page = options.page ? Number(options.page) : 1;
    const limit = options.limit ? Number(options.limit) : 50;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (options.userRole) {
      where.userRole = options.userRole;
    }
    if (options.search) {
      where.OR = [
        { userName: { contains: options.search } },
        { userRole: { contains: options.search } },
        { action: { contains: options.search } },
        { details: { contains: options.search } }
      ];
    }

    const [total, logs] = await Promise.all([
      prisma.log.count({ where }),
      prisma.log.findMany({
        where,
        skip,
        take: limit,
        orderBy: { id: 'desc' }
      })
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };
  },

  async create(logData: any) {
    return prisma.log.create({
      data: logData,
    });
  }
};
