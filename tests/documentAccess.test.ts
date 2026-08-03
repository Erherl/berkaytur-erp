import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  studentFindFirst: vi.fn(),
  vehicleFindFirst: vi.fn(),
  schoolFindFirst: vi.fn(),
  routeFindMany: vi.fn(),
  studentScopeFindMany: vi.fn(),
}));

vi.mock('../server/database/prisma', () => ({
  prisma: {
    student: {
      findFirst: mocks.studentFindFirst,
      findMany: mocks.studentScopeFindMany,
    },
    vehicle: {
      findFirst: mocks.vehicleFindFirst,
    },
    school: {
      findFirst: mocks.schoolFindFirst,
    },
    route: {
      findMany: mocks.routeFindMany,
    },
  },
}));

import { buildDocumentAccessWhere, resolveDocumentScopePayload } from '../server/utils/documentAccess';

describe('Document access hardening', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.routeFindMany.mockResolvedValue([{ id: 'route-1', schoolId: 'school-1', vehicleId: 'vehicle-1' }]);
    mocks.studentScopeFindMany.mockResolvedValue([{ id: 'student-1' }]);
  });

  it('restricts drivers to ownerUserId access only', async () => {
    const where = await buildDocumentAccessWhere({ role: 'driver', id: 'driver-user', assignedVehicles: ['vehicle-1'] });
    expect(where).toEqual({ ownerUserId: 'driver-user' });
  });

  it('builds scoped OR filters for school-bound roles', async () => {
    const where = await buildDocumentAccessWhere({
      role: 'manager',
      id: 'manager-1',
      assignedSchools: ['school-1'],
      assignedVehicles: ['vehicle-1'],
      assignedDrivers: [],
      assignedHostesses: [],
    });

    expect(where).toEqual({
      OR: [
        { schoolId: { in: ['school-1'] } },
        { vehicleId: { in: ['vehicle-1'] } },
        { studentId: { in: ['student-1'] } },
      ],
    });
  });

  it('forces driver uploads to remain self-owned', async () => {
    await expect(resolveDocumentScopePayload(
      { role: 'driver', id: 'driver-1', assignedVehicles: ['vehicle-1'] },
      { ownerUserId: 'someone-else' }
    )).rejects.toThrow('Sadece kendi evraklarınızı yükleyebilirsiniz.');
  });

  it('derives school scope from linked student and vehicle', async () => {
    mocks.studentFindFirst.mockResolvedValue({ id: 'student-1', schoolId: 'school-1' });
    mocks.vehicleFindFirst.mockResolvedValue({ id: 'vehicle-1', schoolId: 'school-1' });
    mocks.schoolFindFirst.mockResolvedValue({ id: 'school-1' });

    const payload = await resolveDocumentScopePayload(
      {
        role: 'coordinator',
        id: 'coord-1',
        assignedSchools: ['school-1'],
        assignedVehicles: ['vehicle-1'],
        assignedDrivers: [],
        assignedHostesses: [],
      },
      {
        studentId: 'student-1',
        vehicleId: 'vehicle-1',
      }
    );

    expect(payload).toMatchObject({
      studentId: 'student-1',
      vehicleId: 'vehicle-1',
      schoolId: 'school-1',
      ownerUserId: 'coord-1',
    });
  });
});
