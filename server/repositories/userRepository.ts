/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../database/prisma';
import { GoogleSheetsAndDriveService } from '../services/googleSheetsAndDriveService';
import logger from '../utils/logger';

export const UserRepository = {
  async findAll() {
    return prisma.user.findMany({
      where: { isDeleted: false },
    });
  },

  async findById(id: string) {
    return prisma.user.findFirst({
      where: { id, isDeleted: false },
    });
  },

  async findByUsername(username: string) {
    return prisma.user.findFirst({
      where: { username, isDeleted: false },
    });
  },

  async create(data: any) {
    const created = await prisma.user.create({
      data,
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Users', created.id, created).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync user on create:', err)
      );
    }
    return created;
  },

  async update(id: string, data: any) {
    const updated = await prisma.user.update({
      where: { id },
      data,
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Users', updated.id, updated).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync user on update:', err)
      );
    }
    return updated;
  },

  async softDelete(id: string) {
    const deleted = await prisma.user.update({
      where: { id },
      data: { isDeleted: true },
    });
    if (GoogleSheetsAndDriveService.isConfigured()) {
      GoogleSheetsAndDriveService.syncRow('Users', deleted.id, deleted).catch((err) =>
        logger.error('[GoogleSheets] Failed to sync user on softDelete:', err)
      );
    }
    return deleted;
  },

  // Login History functions
  async createLoginHistory(data: {
    userId?: string;
    username: string;
    ipAddress?: string;
    userAgent?: string;
    deviceType?: string;
    status: string;
    details?: string;
  }) {
    try {
      return await prisma.loginHistory.create({
        data,
      });
    } catch (err) {
      logger.error('[UserRepository] Failed to record loginHistory:', err);
      return null;
    }
  },

  async getLoginHistory(userId: string) {
    try {
      return await prisma.loginHistory.findMany({
        where: { userId },
        orderBy: { timestamp: 'desc' },
        take: 10,
      });
    } catch (err) {
      logger.error('[UserRepository] Failed to fetch loginHistory:', err);
      return [];
    }
  },

  async countFailedAttempts(username: string, since: Date) {
    try {
      return await prisma.loginHistory.count({
        where: {
          username,
          status: 'failed',
          timestamp: { gte: since },
        },
      });
    } catch (err) {
      logger.error('[UserRepository] Failed to count failed login attempts:', err);
      return 0;
    }
  },

  // Session management
  async createSession(data: {
    userId: string;
    refreshToken: string;
    deviceId?: string;
    deviceType?: string;
    ipAddress?: string;
    userAgent?: string;
    expiresAt: Date;
  }) {
    return prisma.userSession.create({
      data,
    });
  },

  async findSessionByToken(refreshToken: string) {
    return prisma.userSession.findFirst({
      where: { refreshToken, expiresAt: { gte: new Date() } },
    });
  },

  async deleteSessionByToken(refreshToken: string) {
    return prisma.userSession.deleteMany({
      where: { refreshToken },
    });
  },

  async deleteSessionsByUserId(userId: string) {
    return prisma.userSession.deleteMany({
      where: { userId },
    });
  },

  // Token Blacklist
  async blacklistToken(token: string, expiresAt: Date) {
    return prisma.tokenBlacklist.create({
      data: { token, expiresAt },
    });
  },

  async isTokenBlacklisted(token: string) {
    try {
      const count = await prisma.tokenBlacklist.count({
        where: { token, expiresAt: { gte: new Date() } },
      });
      return count > 0;
    } catch (error) {
      return false;
    }
  }
};
