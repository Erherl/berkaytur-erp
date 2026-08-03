import express from 'express';
import request from 'supertest';
import { beforeEach, describe, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  authVerify: vi.fn(),
}));

vi.mock('../server/services/authService', () => ({
  AuthService: {
    verify: mocks.authVerify,
  },
}));

import { requirePermission } from '../server/middlewares/auth';

describe('RBAC permission matrix', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = express();
    app.get('/manager/create-school', requirePermission(['CREATE_SCHOOLS']), (_req, res) => res.json({ ok: true }));
    app.delete('/coordinator/delete-school', requirePermission(['DELETE_SCHOOLS']), (_req, res) => res.json({ ok: true }));
    app.get('/accounting/documents', requirePermission(['READ_DOCUMENTS']), (_req, res) => res.json({ ok: true }));
    app.get('/parent/students', requirePermission(['READ_STUDENTS']), (_req, res) => res.json({ ok: true }));
  });

  it('allows manager to create schools', async () => {
    mocks.authVerify.mockResolvedValue({ id: 'u1', role: 'manager' });
    await request(app)
      .get('/manager/create-school')
      .set('Authorization', 'Bearer token')
      .expect(200);
  });

  it('blocks coordinator from deleting schools', async () => {
    mocks.authVerify.mockResolvedValue({ id: 'u2', role: 'coordinator' });
    await request(app)
      .delete('/coordinator/delete-school')
      .set('Authorization', 'Bearer token')
      .expect(403);
  });

  it('blocks accounting from reading documents outside finance scope', async () => {
    mocks.authVerify.mockResolvedValue({ id: 'u3', role: 'accounting' });
    await request(app)
      .get('/accounting/documents')
      .set('Authorization', 'Bearer token')
      .expect(403);
  });

  it('allows parent to read own student-scoped data endpoints', async () => {
    mocks.authVerify.mockResolvedValue({ id: 'parent_student-1', role: 'parent' });
    await request(app)
      .get('/parent/students')
      .set('Authorization', 'Bearer token')
      .expect(200);
  });
});
