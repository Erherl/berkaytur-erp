/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../database/prisma';

export interface ScopingRules {
  isAllAllowed: boolean;
  allowedSchoolIds: string[];
}

function normalizeList(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter(Boolean).map(String);
  if (typeof value !== 'string' || !value.trim()) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter(Boolean).map(String) : [];
  } catch {
    return [];
  }
}

/**
 * Evaluates the user's roles, school assignments, and geographic area assignments
 * to calculate the exact list of school IDs they are authorized to access.
 */
export async function getScopingRules(user: any): Promise<ScopingRules> {
  if (!user) {
    return { isAllAllowed: false, allowedSchoolIds: [] };
  }

  if (user.role === 'admin') {
    return { isAllAllowed: true, allowedSchoolIds: [] };
  }

  const assignedSchools = normalizeList(user.assignedSchools);
  const assignedAreas = normalizeList(user.assignedAreas);

  if (user.schoolId && !assignedSchools.includes(String(user.schoolId))) {
    assignedSchools.push(String(user.schoolId));
  }

  let areaSchoolIds: string[] = [];
  if (assignedAreas.length > 0) {
    const schools = await prisma.school.findMany({
      where: {
        isDeleted: false,
        OR: assignedAreas.flatMap((area) => ([
          { name: { contains: area, mode: 'insensitive' } },
          { address: { contains: area, mode: 'insensitive' } },
        ]))
      },
      select: { id: true }
    });

    areaSchoolIds = schools.map((school) => school.id);
  }

  const mergedIds = Array.from(new Set([...assignedSchools, ...areaSchoolIds]));
  return {
    isAllAllowed: false,
    allowedSchoolIds: mergedIds
  };
}

/**
 * Helper to build a standard Prisma where filter clause for scoped resources
 */
export async function applyScopingFilter(user: any, schoolFieldPath = 'schoolId') {
  const rules = await getScopingRules(user);
  if (rules.isAllAllowed) {
    return {};
  }
  return {
    [schoolFieldPath]: {
      in: rules.allowedSchoolIds
    }
  };
}
