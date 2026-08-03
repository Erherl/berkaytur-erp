/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../database/prisma';

function normalizeIds(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

export interface ScopeFilters {
  allowedSchoolIds: string[];
  allowedVehicleIds: string[];
  allowedRouteIds: string[];
  allowedStudentIds: string[];
  isGlobal: boolean;
}

export function isIdAllowed(id: string | null | undefined, allowedIds: string[], isGlobal: boolean) {
  if (isGlobal) return true;
  if (!id) return false;
  return allowedIds.includes(id);
}

export function assertScopedAccess(resourceLabel: string, id: string | null | undefined, allowedIds: string[], isGlobal: boolean) {
  if (!isIdAllowed(id, allowedIds, isGlobal)) {
    const err: any = new Error(`${resourceLabel} kaydına erişim yetkiniz bulunmamaktadır.`);
    err.status = 403;
    throw err;
  }
}

async function getParentScope(user: any): Promise<ScopeFilters> {
  const studentId = String(user?.id || '').startsWith('parent_') ? String(user.id).replace('parent_', '') : null;
  if (!studentId) {
    return {
      allowedSchoolIds: [],
      allowedVehicleIds: [],
      allowedRouteIds: [],
      allowedStudentIds: [],
      isGlobal: false,
    };
  }

  const student = await prisma.student.findFirst({
    where: { id: studentId, isDeleted: false },
    select: { id: true, schoolId: true, routeId: true }
  });

  if (!student) {
    return {
      allowedSchoolIds: [],
      allowedVehicleIds: [],
      allowedRouteIds: [],
      allowedStudentIds: [],
      isGlobal: false,
    };
  }

  let allowedVehicleIds: string[] = [];
  if (student.routeId) {
    const route = await prisma.route.findFirst({
      where: { id: student.routeId, isDeleted: false },
      select: { vehicleId: true }
    });
    allowedVehicleIds = route?.vehicleId ? [route.vehicleId] : [];
  }

  return {
    allowedSchoolIds: student.schoolId ? [student.schoolId] : [],
    allowedVehicleIds,
    allowedRouteIds: student.routeId ? [student.routeId] : [],
    allowedStudentIds: [student.id],
    isGlobal: false,
  };
}

/**
 * Centrally calculates exact resource boundaries for the active request user.
 * Ensures data isolation and zero-leak database-level security.
 */
export async function getResourceScope(user: any): Promise<ScopeFilters> {
  if (!user || user.role === 'admin') {
    return {
      allowedSchoolIds: [],
      allowedVehicleIds: [],
      allowedRouteIds: [],
      allowedStudentIds: [],
      isGlobal: true
    };
  }

  if (user.role === 'parent' || String(user.id || '').startsWith('parent_')) {
    return getParentScope(user);
  }

  const assignedSchools = Array.from(new Set([
    ...normalizeIds(user.assignedSchools),
    ...(user.schoolId ? [String(user.schoolId)] : []),
  ]));
  const assignedVehicles = Array.from(new Set([
    ...normalizeIds(user.assignedVehicles),
    ...(user.vehicleId ? [String(user.vehicleId)] : []),
  ]));
  const assignedDrivers = Array.from(new Set([
    ...normalizeIds(user.assignedDrivers),
    ...(user.role === 'driver' && user.id ? [String(user.id)] : []),
  ]));
  const assignedHostesses = Array.from(new Set([
    ...normalizeIds(user.assignedHostesses),
    ...(user.role === 'hostess' && user.id ? [String(user.id)] : []),
  ]));

  const routeClauses: any[] = [];
  if (assignedSchools.length > 0) routeClauses.push({ schoolId: { in: assignedSchools } });
  if (assignedVehicles.length > 0) routeClauses.push({ vehicleId: { in: assignedVehicles } });
  if (assignedDrivers.length > 0) routeClauses.push({ driverId: { in: assignedDrivers } });
  if (assignedHostesses.length > 0) routeClauses.push({ hostessId: { in: assignedHostesses } });

  const matchedRoutes = routeClauses.length > 0
    ? await prisma.route.findMany({
        where: {
          isDeleted: false,
          OR: routeClauses,
        },
        select: { id: true, schoolId: true, vehicleId: true }
      })
    : [];

  const allowedRouteIds = matchedRoutes.map((route) => route.id);
  const schoolIdsSet = new Set<string>(assignedSchools);
  const vehicleIdsSet = new Set<string>(assignedVehicles);

  matchedRoutes.forEach((route) => {
    if (route.schoolId) schoolIdsSet.add(route.schoolId);
    if (route.vehicleId) vehicleIdsSet.add(route.vehicleId);
  });

  const allowedSchoolIds = Array.from(schoolIdsSet);
  const allowedVehicleIds = Array.from(vehicleIdsSet);

  const studentClauses: any[] = [];
  if (allowedSchoolIds.length > 0) studentClauses.push({ schoolId: { in: allowedSchoolIds } });
  if (allowedRouteIds.length > 0) studentClauses.push({ routeId: { in: allowedRouteIds } });

  const matchedStudents = studentClauses.length > 0
    ? await prisma.student.findMany({
        where: {
          isDeleted: false,
          OR: studentClauses,
        },
        select: { id: true }
      })
    : [];

  const allowedStudentIds = matchedStudents.map((student) => student.id);

  return {
    allowedSchoolIds,
    allowedVehicleIds,
    allowedRouteIds,
    allowedStudentIds,
    isGlobal: false
  };
}
