/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { LogRepository } from '../repositories/logRepository';
import logger from '../utils/logger';

export const LogService = {
  async getLogs(options: { page?: number; limit?: number; search?: string; userRole?: string } = {}) {
    return LogRepository.findAll(options);
  },

  async createLog(body: any) {
    const { action, details, userName, userRole, userId } = body;
    if (!action || !details) {
      throw new Error('Action ve details alanları zorunludur.');
    }

    const newLog = {
      userId: userId || 'system',
      userName: userName || 'System',
      userRole: userRole || 'admin',
      action,
      details,
      timestamp: new Date().toLocaleString()
    };

    const saved = await LogRepository.create(newLog);
    logger.audit(`[SERVER AUDIT LOG RECORDED] ${action}: ${details}`, { userName, userRole, userId });
    return saved;
  }
};
