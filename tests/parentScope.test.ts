import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  routeFindMany: vi.fn(),
  routeFindFirst: vi.fn(),
  studentFindMany: vi.fn(),
  studentFindFirst: vi.fn(),
}));

vi.mock('../server/database/prisma', () => ({
  prisma: {
    route: {
      findMany: mocks.routeFindMany,
      findFirst: mocks.routeFindFirst,
    },
    student: {
      findMany: mocks.studentFindMany,
      findFirst: mocks.studentFindFirst,
    },
  },
}));

import { getResourceScope } from '../server/utils/scopeFilter';

describe('Parent scope isolation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('limits a parent to only their own child', async () => {
    mocks.routeFindMany.mockResolvedValue([]);
    mocks.routeFindFirst.mockResolvedValue({ vehicleId: 'vehicle-1' });
    mocks.studentFindMany.mockResolvedValue([]);
    mocks.studentFindFirst.mockResolvedValue({
      id: 'student-1',
      schoolId: 'school-1',
      routeId: 'route-1',
      parentPhone: '+905551112233',
    });

    const scope = await getResourceScope({
      id: 'parent_student-1',
      role: 'parent',
      phone: '+905551112233',
      assignedSchools: [],
      assignedVehicles: [],
      assignedDrivers: [],
      assignedHostesses: [],
    });

    expect(scope.isGlobal).toBe(false);
    expect(scope.allowedStudentIds).toEqual(['student-1']);
    expect(scope.allowedSchoolIds).toEqual(['school-1']);
    expect(scope.allowedRouteIds).toEqual(['route-1']);
    expect(scope.allowedVehicleIds).toEqual(['vehicle-1']);
  });

  it('does not leak all students when parent match cannot be resolved', async () => {
    mocks.routeFindMany.mockResolvedValue([]);
    mocks.routeFindFirst.mockResolvedValue(null);
    mocks.studentFindMany.mockResolvedValue([]);
    mocks.studentFindFirst.mockResolvedValue(null);

    const scope = await getResourceScope({
      id: 'parent_unknown',
      role: 'parent',
      phone: '+905550000000',
      assignedSchools: [],
      assignedVehicles: [],
      assignedDrivers: [],
      assignedHostesses: [],
    });

    expect(scope.allowedStudentIds).toEqual([]);
    expect(scope.allowedSchoolIds).toEqual([]);
    expect(scope.allowedRouteIds).toEqual([]);
    expect(scope.allowedVehicleIds).toEqual([]);
  });
});
