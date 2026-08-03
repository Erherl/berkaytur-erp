import fs from 'node:fs';
import supertest from 'supertest';

async function main() {
  process.env.NODE_ENV = 'development';
  process.env.PORT = process.env.PORT || '3002';
  process.env.APP_URL = process.env.APP_URL || 'http://127.0.0.1:3002';
  process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:3002,http://localhost:3002';
  process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://berkaytur:berkaytur_test_2026@127.0.0.1:5432/berkaytur_test?schema=public';
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'berkaytur_local_test_jwt_secret_minimum_32_chars_2026';
  process.env.JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'berkaytur_local_test_refresh_secret_min_32_chars_2026';
  process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin';
  process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin12345!';
  process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@example.com';

  const [{ app }, { prisma }] = await Promise.all([
    import('../server/app'),
    import('../server/database/prisma'),
  ]);

  const agent = supertest.agent(app);
  const csrfRes = await agent.get('/api/v1/auth/csrf').set('Origin', 'http://127.0.0.1:3002').set('Referer', 'http://127.0.0.1:3002/');
  const csrf = csrfRes.body?.data?.csrfToken;
  if (!csrf) throw new Error(`Failed to obtain CSRF token: ${csrfRes.status}`);

  const loginRes = await agent
    .post('/api/v1/auth/login')
    .set('Origin', 'http://127.0.0.1:3002')
    .set('Referer', 'http://127.0.0.1:3002/login')
    .set('X-CSRF-Token', csrf)
    .send({ username: 'admin', password: 'Admin12345!' });
  const token = loginRes.body?.data?.accessToken;
  if (!token) throw new Error(`Failed to login admin: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);

  const levels = [100, 250, 500, 1000];
  const results: any[] = [];

  for (const users of levels) {
    const startedAt = new Date().toISOString();
    try {
      const res = await agent
        .post(`/api/v1/admin/run-load-test?users=${users}`)
        .set('Authorization', `Bearer ${token}`)
        .send({});
      results.push({
        users,
        startedAt,
        status: res.status,
        ok: res.status === 200,
        body: res.body,
      });
      if (res.status !== 200) {
        break;
      }
    } catch (error) {
      results.push({
        users,
        startedAt,
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      });
      break;
    }
  }

  fs.writeFileSync('/home/user/work/load_test_results.json', JSON.stringify({ executedAt: new Date().toISOString(), results }, null, 2));
  await prisma.$disconnect();
}

main().catch(async (error) => {
  fs.writeFileSync('/home/user/work/load_test_error.log', error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error));
  try {
    const { prisma } = await import('../server/database/prisma');
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
