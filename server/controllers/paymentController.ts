/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { PaymentService } from '../services/paymentService';
import { successResponse } from '../utils/response';
import { getResourceScope, assertScopedAccess } from '../utils/scopeFilter';
import { prisma } from '../database/prisma';

export const PaymentController = {
  async getPayments(req: Request, res: Response) {
    const { page, limit, search, status } = req.query;
    const user = (req as any).user;
    
    let allowedStudentIds: string[] | undefined = undefined;
    if (user && user.role !== 'admin') {
      const scope = await getResourceScope(user);
      allowedStudentIds = scope.allowedStudentIds;
    }

    const result = await PaymentService.getPayments({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      status: status as string,
      allowedStudentIds
    });
    res.json(successResponse(result.payments, 'Tahsilat kayıtları başarıyla listelendi.', result.pagination));
  },

  async createPayment(req: Request, res: Response) {
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      const scope = await getResourceScope(user);
      assertScopedAccess('Öğrenci', req.body.studentId, scope.allowedStudentIds, scope.isGlobal);
    }
    const payment = await PaymentService.createPayment(req.body);
    res.status(201).json(successResponse(payment, 'Ödeme işlemi başarıyla gerçekleştirildi.'));
  },

  async rollbackPayment(req: Request, res: Response) {
    const { id } = req.params;
    const { operatorName, operatorRole } = req.body;
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      const scope = await getResourceScope(user);
      const payment = await prisma.payment.findFirst({ where: { id, isDeleted: false }, select: { studentId: true } });
      assertScopedAccess('Ödeme', payment?.studentId, scope.allowedStudentIds, scope.isGlobal);
    }
    const result = await PaymentService.rollbackPayment(id, operatorName, operatorRole);
    res.json(successResponse(result.payment, 'Ödeme işlemi başarıyla geri alındı (Borç durumu aktifleşti).'));
  }
};

