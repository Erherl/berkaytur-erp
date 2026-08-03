/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from '../database/prisma';
import logger from '../utils/logger';
import type { ScopeFilters } from '../utils/scopeFilter';

export const SearchService = {
  async search(q: string, scope?: ScopeFilters) {
    const query = q.toLowerCase().trim();
    if (!query) {
      return { students: [], schools: [], routes: [], vehicles: [] };
    }

    const isGlobal = scope?.isGlobal ?? true;
    const allowedStudentIds = scope?.allowedStudentIds || [];
    const allowedSchoolIds = scope?.allowedSchoolIds || [];
    const allowedRouteIds = scope?.allowedRouteIds || [];
    const allowedVehicleIds = scope?.allowedVehicleIds || [];

    // 1. Fetch matching drivers concurrently to filter vehicles by driver name
    const drivers = await prisma.user.findMany({
      where: {
        isDeleted: false,
        role: 'driver',
        name: { contains: query }
      },
      select: { id: true }
    });
    const matchingDriverIds = drivers.map(d => d.id);

    // 2. Run all search queries concurrently using Promise.all to completely avoid blocking chains
    const [students, schools, routes, vehicles] = await Promise.all([
      prisma.student.findMany({
        where: {
          isDeleted: false,
          ...(isGlobal ? {} : { id: { in: allowedStudentIds } }),
          OR: [
            { name: { contains: query } },
            { schoolName: { contains: query } },
            { parentName: { contains: query } },
            { studentNumber: { contains: query } }
          ]
        },
        select: {
          id: true,
          name: true,
          schoolName: true,
          parentName: true,
          studentNumber: true,
          morningStatus: true,
          eveningStatus: true
        },
        take: 50 // Enforce maximum output limit for safety
      }),

      prisma.school.findMany({
        where: {
          isDeleted: false,
          ...(isGlobal ? {} : { id: { in: allowedSchoolIds } }),
          OR: [
            { name: { contains: query } },
            { address: { contains: query } }
          ]
        },
        select: {
          id: true,
          name: true,
          address: true
        },
        take: 30
      }),

      prisma.route.findMany({
        where: {
          isDeleted: false,
          ...(isGlobal ? {} : { id: { in: allowedRouteIds } }),
          name: { contains: query }
        },
        select: {
          id: true,
          name: true,
          status: true
        },
        take: 30
      }),

      prisma.vehicle.findMany({
        where: {
          isDeleted: false,
          ...(isGlobal ? {} : { id: { in: allowedVehicleIds } }),
          OR: [
            { plate: { contains: query } },
            { model: { contains: query } },
            ...(matchingDriverIds.length > 0 ? [{ driverId: { in: matchingDriverIds } }] : [])
          ]
        },
        select: {
          id: true,
          plate: true,
          brand: true,
          model: true,
          capacity: true,
          status: true
        },
        take: 30
      })
    ]);

    logger.info(`[OPTIMIZED SERVER SEARCH] "${query}" executed. Results - Students: ${students.length}, Schools: ${schools.length}, Routes: ${routes.length}, Vehicles: ${vehicles.length}`);

    return {
      students,
      schools,
      routes,
      vehicles
    };
  }
};
