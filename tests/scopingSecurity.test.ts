import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  schoolFindMany: vi.fn(),
  queryRawUnsafe: vi.fn(),
}));

vi.mock('../server/database/prisma', () => ({
  prisma: {
    school: {
      findMany: mocks.schoolFindMany,
    },
    $queryRawUnsafe: mocks.queryRawUnsafe,
  },
}));

import { applyScopingFilter, getScopingRules } from '../server/utils/scoping';

describe('Assigned area scoping security', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses Prisma findMany with parameter binding semantics instead of raw SQL placeholders', async () => {
    mocks.schoolFindMany.mockResolvedValue([{ id: 'school-1' }, { id: 'school-2' }]);

    const rules = await getScopingRules({
      role: 'manager',
      assignedSchools: JSON.stringify(['school-direct']),
      assignedAreas: JSON.stringify(['Kadıköy', 'Ataşehir']),
      schoolId: 'legacy-school',
    });

    expect(mocks.schoolFindMany).toHaveBeenCalledTimes(1);
    expect(mocks.queryRawUnsafe).not.toHaveBeenCalled();
    expect(mocks.schoolFindMany.mock.calls[0][0]).toEqual(
      expect.objectContaining({
        where: expect.objectContaining({
          isDeleted: false,
          OR: expect.arrayContaining([
            { name: { contains: 'Kadıköy', mode: 'insensitive' } },
            { address: { contains: 'Kadıköy', mode: 'insensitive' } },
            { name: { contains: 'Ataşehir', mode: 'insensitive' } },
            { address: { contains: 'Ataşehir', mode: 'insensitive' } },
          ]),
        }),
      })
    );
    expect(rules.allowedSchoolIds).toEqual(expect.arrayContaining(['school-direct', 'legacy-school', 'school-1', 'school-2']));
  });

  it('builds scoped filter for non-admin users', async () => {
    mocks.schoolFindMany.mockResolvedValue([{ id: 'school-area' }]);

    const where = await applyScopingFilter({
      role: 'coordinator',
      assignedSchools: [],
      assignedAreas: ['Üsküdar'],
    });

    expect(where).toEqual({ schoolId: { in: ['school-area'] } });
  });
});
