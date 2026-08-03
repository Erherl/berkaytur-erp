/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Request, Response } from 'express';
import { VehicleService } from '../services/vehicleService';
import { vehicleSchema, getZodErrorMessage } from '../validators/schemas';
import { successResponse } from '../utils/response';
import { getResourceScope, assertScopedAccess } from '../utils/scopeFilter';

export const VehicleController = {
  async getVehicles(req: Request, res: Response) {
    const { page, limit, search, status } = req.query;
    const user = (req as any).user;
    
    let allowedVehicleIds: string[] | undefined = undefined;
    if (user && user.role !== 'admin') {
      const scope = await getResourceScope(user);
      allowedVehicleIds = scope.allowedVehicleIds;
    }

    const result = await VehicleService.getAllVehicles({
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
      search: search as string,
      status: status as string,
      allowedVehicleIds
    });
    res.json(successResponse(result.vehicles, 'Araçlar başarıyla listelendi.', result.pagination));
  },

  async createVehicle(req: Request, res: Response) {
    const saved = await VehicleService.createVehicle(req.body);
    res.status(201).json(successResponse(saved, 'Yeni araç kaydı başarıyla oluşturuldu.'));
  },

  async updateVehicle(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      const scope = await getResourceScope(user);
      assertScopedAccess('Araç', id, scope.allowedVehicleIds, scope.isGlobal);
    }
    const updated = await VehicleService.updateVehicle(id, req.body);
    res.json(successResponse(updated, 'Araç bilgileri başarıyla güncellendi.'));
  },

  async deleteVehicle(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      const scope = await getResourceScope(user);
      assertScopedAccess('Araç', id, scope.allowedVehicleIds, scope.isGlobal);
    }
    const result = await VehicleService.deleteVehicle(id);
    res.json(successResponse(result, 'Araç sistemden başarıyla silindi (Geçici silme yapıldı).'));
  },

  async addHistory(req: Request, res: Response) {
    const { id } = req.params;
    const user = (req as any).user;
    if (user?.role !== 'admin') {
      const scope = await getResourceScope(user);
      assertScopedAccess('Araç', id, scope.allowedVehicleIds, scope.isGlobal);
    }
    const item = await VehicleService.addHistory(id, req.body);
    res.status(201).json(successResponse(item, 'Araç geçmiş kaydı başarıyla eklendi.'));
  },

  async validateSeating(req: Request, res: Response) {
    const { id } = req.params;
    const { seatNumber, studentId, action } = req.body;
    const user = (req as any).user;

    if (user?.role !== 'admin') {
      const scope = await getResourceScope(user);
      assertScopedAccess('Araç', id, scope.allowedVehicleIds, scope.isGlobal);
      assertScopedAccess('Öğrenci', studentId, scope.allowedStudentIds, scope.isGlobal);
    }

    const result = await VehicleService.validateSeating(id, seatNumber, studentId, action);
    res.json(successResponse(result, 'Koltuk seçimi başarıyla doğrulandı.'));
  },

  async updateSeating(req: Request, res: Response) {
    const { id } = req.params;
    const { seating, editorName } = req.body;
    const user = (req as any).user;

    if (user?.role !== 'admin') {
      const scope = await getResourceScope(user);
      assertScopedAccess('Araç', id, scope.allowedVehicleIds, scope.isGlobal);
      for (const studentId of Object.values(seating || {}).filter(Boolean) as string[]) {
        assertScopedAccess('Öğrenci', studentId, scope.allowedStudentIds, scope.isGlobal);
      }
    }

    const vehicle = await VehicleService.updateSeating(id, seating, editorName);
    res.json(successResponse(vehicle, 'Araç koltuk planı başarıyla güncellendi.'));
  }
};

