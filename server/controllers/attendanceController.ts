/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { AttendanceService } from '../services/attendanceService';
import { successResponse } from '../utils/response';
import { getResourceScope, assertScopedAccess } from '../utils/scopeFilter';

export const AttendanceController = {
  async getAttendance(req: Request, res: Response) {
    const { page, limit, date, status } = req.query;
    const user = (req as any).user;
    
    let allowedStudentIds: string[] | undefined = undefined;
    if (user && user.role !== 'admin') {
      const scope = await getResourceScope(user);
      allowedStudentIds = scope.allowedStudentIds;
    }

    const result = await AttendanceService.getAttendance({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      date: date as string,
      status: status as string,
      allowedStudentIds
    });
    res.json(successResponse(result.attendance, 'Puantaj listesi başarıyla çekildi.', result.pagination));
  },

  async saveAttendance(req: Request, res: Response) {
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      const scope = await getResourceScope(user);
      assertScopedAccess('Öğrenci', req.body.studentId, scope.allowedStudentIds, scope.isGlobal);
    }
    const result = await AttendanceService.saveAttendance(req.body);
    res.json(successResponse(result, 'Puantaj kaydı başarıyla işlendi.'));
  }
};

