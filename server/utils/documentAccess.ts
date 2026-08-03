/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../database/prisma';
import { getResourceScope } from './scopeFilter';

function forbidden(message = 'Bu evrak kaydına erişim yetkiniz bulunmamaktadır.') {
  const err: any = new Error(message);
  err.status = 403;
  return err;
}

function badRequest(message: string) {
  const err: any = new Error(message);
  err.status = 400;
  return err;
}

function notFound(message: string) {
  const err: any = new Error(message);
  err.status = 404;
  return err;
}

export async function buildDocumentAccessWhere(user: any) {
  if (!user || user.role === 'admin') {
    return {};
  }

  const scope = await getResourceScope(user);

  if (user.role === 'driver' || user.role === 'hostess') {
    return { ownerUserId: user.id };
  }

  const orClauses: any[] = [];
  if (scope.allowedSchoolIds.length > 0) {
    orClauses.push({ schoolId: { in: scope.allowedSchoolIds } });
  }
  if (scope.allowedVehicleIds.length > 0) {
    orClauses.push({ vehicleId: { in: scope.allowedVehicleIds } });
  }
  if (scope.allowedStudentIds.length > 0) {
    orClauses.push({ studentId: { in: scope.allowedStudentIds } });
  }

  if (orClauses.length === 0) {
    return { id: '__NO_DOCUMENT_ACCESS__' };
  }

  return { OR: orClauses };
}

export async function assertDocumentScopeAccess(user: any, doc: any) {
  if (!user || user.role === 'admin') return;

  if (user.role === 'driver' || user.role === 'hostess') {
    if (!doc?.ownerUserId || doc.ownerUserId !== user.id) {
      throw forbidden();
    }
    return;
  }

  const scope = await getResourceScope(user);
  const schoolMatch = !!doc?.schoolId && scope.allowedSchoolIds.includes(doc.schoolId);
  const vehicleMatch = !!doc?.vehicleId && scope.allowedVehicleIds.includes(doc.vehicleId);
  const studentMatch = !!doc?.studentId && scope.allowedStudentIds.includes(doc.studentId);

  if (!schoolMatch && !vehicleMatch && !studentMatch) {
    throw forbidden();
  }
}

export async function resolveDocumentScopePayload(user: any, input: any, existingDoc?: any) {
  const payload: Record<string, any> = {};
  const scope: { isGlobal: boolean; allowedSchoolIds: string[]; allowedVehicleIds: string[]; allowedStudentIds: string[] } =
    !user || user.role === 'admin'
      ? { isGlobal: true, allowedSchoolIds: [], allowedVehicleIds: [], allowedStudentIds: [] }
      : await getResourceScope(user);

  const requestedSchoolId = input.schoolId ?? existingDoc?.schoolId ?? null;
  const requestedVehicleId = input.vehicleId ?? existingDoc?.vehicleId ?? null;
  const requestedStudentId = input.studentId ?? existingDoc?.studentId ?? null;
  const requestedOwnerUserId = input.ownerUserId ?? existingDoc?.ownerUserId ?? user?.id ?? null;

  let resolvedSchoolId: string | null = requestedSchoolId;
  let resolvedVehicleId: string | null = requestedVehicleId;
  let resolvedStudentId: string | null = requestedStudentId;
  let resolvedOwnerUserId: string | null = requestedOwnerUserId;

  if (requestedStudentId) {
    const student = await prisma.student.findFirst({
      where: { id: String(requestedStudentId), isDeleted: false },
      select: { id: true, schoolId: true }
    });
    if (!student) throw notFound('Bağlanmak istenen öğrenci bulunamadı.');
    if (!scope.isGlobal && !scope.allowedStudentIds.includes(student.id)) {
      throw forbidden('Bu öğrenciye evrak bağlama yetkiniz bulunmamaktadır.');
    }
    resolvedStudentId = student.id;
    if (!resolvedSchoolId && student.schoolId) {
      resolvedSchoolId = student.schoolId;
    }
  }

  if (requestedVehicleId) {
    const vehicle = await prisma.vehicle.findFirst({
      where: { id: String(requestedVehicleId), isDeleted: false },
      select: { id: true, schoolId: true }
    });
    if (!vehicle) throw notFound('Bağlanmak istenen araç bulunamadı.');
    if (!scope.isGlobal && !scope.allowedVehicleIds.includes(vehicle.id)) {
      throw forbidden('Bu araca evrak bağlama yetkiniz bulunmamaktadır.');
    }
    resolvedVehicleId = vehicle.id;
    if (!resolvedSchoolId && vehicle.schoolId) {
      resolvedSchoolId = vehicle.schoolId;
    }
  }

  if (resolvedSchoolId) {
    const school = await prisma.school.findFirst({
      where: { id: String(resolvedSchoolId), isDeleted: false },
      select: { id: true }
    });
    if (!school) throw notFound('Bağlanmak istenen okul bulunamadı.');
    if (!scope.isGlobal && !scope.allowedSchoolIds.includes(school.id)) {
      throw forbidden('Bu okula evrak bağlama yetkiniz bulunmamaktadır.');
    }
    resolvedSchoolId = school.id;
  }

  if (user?.role === 'driver' || user?.role === 'hostess') {
    if (requestedOwnerUserId && requestedOwnerUserId !== user.id) {
      throw forbidden('Sadece kendi evraklarınızı yükleyebilirsiniz.');
    }
    resolvedOwnerUserId = user.id;
  } else if (user?.role !== 'admin') {
    if (requestedOwnerUserId && requestedOwnerUserId !== user.id && requestedOwnerUserId !== existingDoc?.ownerUserId) {
      throw forbidden('Evrak sahibi kullanıcı değiştirilemez.');
    }
    resolvedOwnerUserId = existingDoc?.ownerUserId || user?.id || requestedOwnerUserId || null;
  }

  if (user?.role !== 'admin' && user?.role !== 'driver' && user?.role !== 'hostess') {
    if (!resolvedSchoolId && !resolvedVehicleId && !resolvedStudentId) {
      throw badRequest('Okul, araç veya öğrenci ilişkisi olmayan evrak yüklenemez.');
    }
  }

  if (!resolvedSchoolId && !resolvedVehicleId && !resolvedStudentId && !resolvedOwnerUserId) {
    throw badRequest('Evrak için en az bir scope alanı zorunludur.');
  }

  payload.schoolId = resolvedSchoolId;
  payload.vehicleId = resolvedVehicleId;
  payload.studentId = resolvedStudentId;
  payload.ownerUserId = resolvedOwnerUserId;

  return payload;
}
