/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { ApplicationService } from '../services/applicationService';
import { successResponse } from '../utils/response';
import { getResourceScope, assertScopedAccess } from '../utils/scopeFilter';
import { prisma } from '../database/prisma';

export const ApplicationController = {
  async getApplications(req: Request, res: Response) {
    const { page, limit, search, status } = req.query;
    const user = (req as any).user;
    
    let allowedSchoolIds: string[] | undefined = undefined;
    if (user && user.role !== 'admin') {
      const scope = await getResourceScope(user);
      allowedSchoolIds = scope.allowedSchoolIds;
    }

    const result = await ApplicationService.getApplications({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      status: status as string,
      allowedSchoolIds
    });
    res.json(successResponse(result.applications, 'Ön kayıt başvuruları başarıyla listelendi.', result.pagination));
  },

  async validateAddress(req: Request, res: Response) {
    const { address, selectedDistrict } = req.body;
    const result = await ApplicationService.validateAddress(address, selectedDistrict);
    res.json(successResponse(result, 'Adres başarıyla doğrulandı.'));
  },

  async createApplication(req: Request, res: Response) {
    const app = await ApplicationService.createApplication(req.body);
    res.status(201).json(successResponse(app, 'Veli ön kayıt başvurusu başarıyla oluşturuldu.'));
  },

  async updateApplication(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      const scope = await getResourceScope(user);
      const target = await prisma.application.findFirst({ where: { id, isDeleted: false }, select: { schoolId: true } });
      assertScopedAccess('Başvuru', target?.schoolId, scope.allowedSchoolIds, scope.isGlobal);
    }
    const app = await ApplicationService.updateApplication(id, req.body);
    res.json(successResponse(app, 'Ön kayıt başvuru durumu başarıyla güncellendi.'));
  }
};

