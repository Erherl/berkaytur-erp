/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { ContractService } from '../services/contractService';
import { successResponse } from '../utils/response';
import { getResourceScope, assertScopedAccess } from '../utils/scopeFilter';
import { prisma } from '../database/prisma';

export const ContractController = {
  async getContracts(req: Request, res: Response) {
    const { page, limit, search, status } = req.query;
    const user = (req as any).user;
    
    let allowedStudentIds: string[] | undefined = undefined;
    if (user && user.role !== 'admin') {
      const scope = await getResourceScope(user);
      allowedStudentIds = scope.allowedStudentIds;
    }

    const result = await ContractService.getContracts({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      status: status as string,
      allowedStudentIds
    });
    res.json(successResponse(result.contracts, 'Sözleşme kayıtları başarıyla listelendi.', result.pagination));
  },

  async createContract(req: Request, res: Response) {
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      const scope = await getResourceScope(user);
      assertScopedAccess('Öğrenci', req.body.studentId, scope.allowedStudentIds, scope.isGlobal);
    }
    const contract = await ContractService.createContract(req.body);
    res.status(201).json(successResponse(contract, 'Sözleşme taslağı başarıyla oluşturuldu.'));
  },

  async signContract(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      const scope = await getResourceScope(user);
      const contract = await prisma.contract.findFirst({ where: { id, isDeleted: false }, select: { studentId: true } });
      assertScopedAccess('Sözleşme', contract?.studentId, scope.allowedStudentIds, scope.isGlobal);
    }
    const result = await ContractService.signContract(id, req.body);
    res.json(successResponse(result, 'Sözleşme başarıyla dijital olarak imzalandı.'));
  }
};

