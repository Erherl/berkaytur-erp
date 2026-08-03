import fs from 'node:fs';
import path from 'node:path';
import supertest from 'supertest';

async function main() {
  process.env.NODE_ENV = 'development';
  process.env.PORT = process.env.PORT || '3001';
  process.env.APP_URL = process.env.APP_URL || 'http://127.0.0.1:3001';
  process.env.ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://127.0.0.1:3001,http://localhost:3001';
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

  const request = supertest.agent(app);
  const outDir = '/home/user/work';
  const results: any = {
    startedAt: new Date().toISOString(),
    steps: [],
    createdIds: {},
  };

  function record(step: string, ok: boolean, details: any) {
    results.steps.push({ step, ok, details });
  }

  const csrfRes = await request.get('/api/v1/auth/csrf').set('Origin', 'http://127.0.0.1:3001').set('Referer', 'http://127.0.0.1:3001/');
  if (csrfRes.status !== 200 || !csrfRes.body?.data?.csrfToken) throw new Error(`csrf failed: ${csrfRes.status}`);
  const csrf = csrfRes.body.data.csrfToken;
  record('csrf', true, { status: csrfRes.status });

  const loginRes = await request
    .post('/api/v1/auth/login')
    .set('Origin', 'http://127.0.0.1:3001')
    .set('Referer', 'http://127.0.0.1:3001/login')
    .set('X-CSRF-Token', csrf)
    .send({ username: 'admin', password: 'Admin12345!' });
  if (loginRes.status !== 200 || !loginRes.body?.data?.accessToken) throw new Error(`login failed: ${loginRes.status} ${JSON.stringify(loginRes.body)}`);
  const token = loginRes.body.data.accessToken;
  const auth = { Authorization: `Bearer ${token}`, Origin: 'http://127.0.0.1:3001', Referer: 'http://127.0.0.1:3001/app', 'X-CSRF-Token': csrf };
  record('login', true, { status: loginRes.status, user: loginRes.body?.data?.user?.username });

  const suffix = Date.now();

  const schoolRes = await request.post('/api/v1/schools').set(auth).send({
    name: `Audit Test School ${suffix}`,
    address: 'Test Mah. No:1',
    phone: '+905551112233',
    type: 'kolej',
  });
  if (schoolRes.status !== 200 && schoolRes.status !== 201) throw new Error(`school create failed: ${schoolRes.status} ${JSON.stringify(schoolRes.body)}`);
  const schoolId = schoolRes.body.data.id;
  results.createdIds.schoolId = schoolId;
  record('school.create', true, { status: schoolRes.status, id: schoolId });

  const studentRes = await request.post('/api/v1/students').set(auth).send({
    name: `Audit Student ${suffix}`,
    studentNumber: `AST-${suffix}`,
    classLevel: '5',
    schoolId,
    parentName: 'Audit Parent',
    parentPhone: '+905551112244',
  });
  if (studentRes.status !== 200 && studentRes.status !== 201) throw new Error(`student create failed: ${studentRes.status} ${JSON.stringify(studentRes.body)}`);
  const studentId = studentRes.body.data.id;
  results.createdIds.studentId = studentId;
  record('student.create', true, { status: studentRes.status, id: studentId });

  const vehicleRes = await request.post('/api/v1/vehicles').set(auth).send({
    plate: `34AUD${String(suffix).slice(-3)}`,
    brand: 'Ford',
    model: 'Transit',
    capacity: 16,
    schoolId,
    status: 'active',
  });
  if (vehicleRes.status !== 200 && vehicleRes.status !== 201) throw new Error(`vehicle create failed: ${vehicleRes.status} ${JSON.stringify(vehicleRes.body)}`);
  const vehicleId = vehicleRes.body.data.id;
  results.createdIds.vehicleId = vehicleId;
  record('vehicle.create', true, { status: vehicleRes.status, id: vehicleId });

  const documentRes = await request.post('/api/v1/documents/upload').set(auth).send({
    name: `audit-${suffix}.txt`,
    category: 'general',
    fileData: Buffer.from('Audit document content').toString('base64'),
    mimeType: 'text/plain',
    studentId,
    schoolId,
    vehicleId,
  });
  if (documentRes.status !== 200 && documentRes.status !== 201) throw new Error(`document create failed: ${documentRes.status} ${JSON.stringify(documentRes.body)}`);
  const documentId = documentRes.body.data.id;
  results.createdIds.documentId = documentId;
  record('document.create', true, { status: documentRes.status, id: documentId });

  const paymentRes = await request.post('/api/v1/payments').set(auth).send({
    studentId,
    studentName: `Audit Student ${suffix}`,
    parentName: 'Audit Parent',
    amount: 1250,
    category: 'Servis',
    description: 'Audit payment',
  });
  if (paymentRes.status !== 200 && paymentRes.status !== 201) throw new Error(`payment create failed: ${paymentRes.status} ${JSON.stringify(paymentRes.body)}`);
  const paymentId = paymentRes.body.data.id;
  results.createdIds.paymentId = paymentId;
  record('payment.create', true, { status: paymentRes.status, id: paymentId });

  const contractRes = await request.post('/api/v1/contracts').set(auth).send({
    studentId,
    studentName: `Audit Student ${suffix}`,
    parentName: 'Audit Parent',
    parentPhone: '+905551112244',
    schoolName: `Audit Test School ${suffix}`,
    vehiclePlate: `34AUD${String(suffix).slice(-3)}`,
    vehicleModel: 'Ford Transit',
    annualFee: 15000,
    paymentType: 'Taksitli',
    installmentCount: 10,
    term: '2026-2027',
  });
  if (contractRes.status !== 200 && contractRes.status !== 201) throw new Error(`contract create failed: ${contractRes.status} ${JSON.stringify(contractRes.body)}`);
  const contractId = contractRes.body.data.id;
  results.createdIds.contractId = contractId;
  record('contract.create', true, { status: contractRes.status, id: contractId });

  const attendanceRes = await request.post('/api/v1/attendance').set(auth).send({
    studentId,
    date: '2026-08-01',
    shift: 'morning',
    status: 'present',
    editorName: 'Audit Runner',
    editorRole: 'admin',
  });
  if (attendanceRes.status !== 200 && attendanceRes.status !== 201) throw new Error(`attendance create failed: ${attendanceRes.status} ${JSON.stringify(attendanceRes.body)}`);
  results.createdIds.attendanceId = attendanceRes.body.data.id;
  record('attendance.create', true, { status: attendanceRes.status, id: attendanceRes.body.data.id });

  const listChecks = [
    ['students.list', '/api/v1/students?page=1&limit=5'],
    ['vehicles.list', '/api/v1/vehicles?page=1&limit=5'],
    ['documents.list', '/api/v1/documents?page=1&limit=5'],
    ['payments.list', '/api/v1/payments?page=1&limit=5'],
    ['contracts.list', '/api/v1/contracts?page=1&limit=5'],
    ['attendance.list', '/api/v1/attendance?page=1&limit=5'],
  ] as const;

  for (const [name, url] of listChecks) {
    const res = await request.get(url).set({ Authorization: `Bearer ${token}` });
    if (res.status !== 200) throw new Error(`${name} failed: ${res.status} ${JSON.stringify(res.body)}`);
    record(name, true, { status: res.status, total: res.body?.pagination?.total ?? null });
  }

  const docDownloadRes = await request.get(`/api/v1/documents/${documentId}/download`).set({ Authorization: `Bearer ${token}` });
  if (docDownloadRes.status !== 200) throw new Error(`document download failed: ${docDownloadRes.status}`);
  record('document.download', true, { status: docDownloadRes.status, bytes: docDownloadRes.body?.length ?? docDownloadRes.text?.length ?? 0 });

  const rootRes = await request.get('/');
  record('map.screen.shell', rootRes.status === 200, { status: rootRes.status, contentType: rootRes.headers['content-type'] });

  const logoutRes = await request.post('/api/v1/auth/logout').set(auth).send({ refreshToken: loginRes.body.data.refreshToken });
  if (logoutRes.status !== 200) throw new Error(`logout failed: ${logoutRes.status} ${JSON.stringify(logoutRes.body)}`);
  record('logout', true, { status: logoutRes.status });

  results.finishedAt = new Date().toISOString();
  fs.writeFileSync(path.join(outDir, 'dynamic_verification.json'), JSON.stringify(results, null, 2));

  await prisma.$disconnect();
}

main().catch(async (error) => {
  const message = error instanceof Error ? `${error.message}\n${error.stack || ''}` : String(error);
  fs.writeFileSync('/home/user/work/dynamic_verification_error.log', message);
  console.error(message);
  try {
    const { prisma } = await import('../server/database/prisma');
    await prisma.$disconnect();
  } catch {}
  process.exit(1);
});
