import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../server/repositories/logRepository', () => ({
  LogRepository: {
    create: vi.fn().mockResolvedValue({}),
  },
}));

import { csrfTokenProtection, getCsrfToken, wrapResponseEnvelope } from '../server/middlewares/security';

describe('CSRF middleware hardening', () => {
  const app = express();
  app.use(express.json());
  app.use('/api', wrapResponseEnvelope);
  app.get('/api/csrf', getCsrfToken);
  app.post('/api/mutate', csrfTokenProtection, (req, res) => {
    res.status(201).json({ ok: true });
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('issues a readable token cookie and an HttpOnly signature cookie', async () => {
    const res = await request(app).get('/api/csrf').expect(200);
    const cookies = res.headers['set-cookie'];

    expect(Array.isArray(cookies)).toBe(true);
    expect(cookies.join(';')).toContain('csrf_token=');
    expect(cookies.join(';')).toContain('csrf_sig=');
    expect(cookies.some((cookie: string) => cookie.includes('HttpOnly'))).toBe(true);
    expect(res.body.data.csrfToken).toBeTruthy();
  });

  it('accepts a valid signed double-submit token pair', async () => {
    const csrfRes = await request(app).get('/api/csrf').expect(200);
    const csrfToken = csrfRes.body.data.csrfToken;
    const cookies = csrfRes.headers['set-cookie'];

    await request(app)
      .post('/api/mutate')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', csrfToken)
      .send({ ok: true })
      .expect(201);
  });

  it('rejects a tampered signature cookie even when the public token matches', async () => {
    const csrfRes = await request(app).get('/api/csrf').expect(200);
    const csrfToken = csrfRes.body.data.csrfToken;
    const cookies = (csrfRes.headers['set-cookie'] as string[]).map((cookie) =>
      cookie.startsWith('csrf_sig=') ? cookie.replace(/csrf_sig=[^;]+/, 'csrf_sig=tampered') : cookie
    );

    await request(app)
      .post('/api/mutate')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', csrfToken)
      .send({ ok: true })
      .expect(403);
  });
});
