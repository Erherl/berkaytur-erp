import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';
import express from 'express';
import { apiRouter } from '../server/routes';
import { wrapResponseEnvelope } from '../server/middlewares/security';
import { errorHandler } from '../server/middlewares/errorHandler';

// Mock authentication and permissions middlewares as pass-throughs
vi.mock('../server/middlewares/auth', () => ({
  requireRole: vi.fn(() => (req: any, res: any, next: any) => {
    req.user = { id: '1', role: 'admin' };
    next();
  }),
  requirePermission: vi.fn(() => (req: any, res: any, next: any) => {
    req.user = { id: '1', role: 'admin' };
    next();
  }),
  ROLE_PERMISSIONS: {
    admin: ['READ_VEHICLES', 'WRITE_VEHICLES']
  }
}));

// Mock our controllers so that we don't hit actual database or outer services during API route testing
vi.mock('../server/controllers/authController', () => ({
  AuthController: {
    login: vi.fn((req, res) => res.json({ success: true, token: 'mock-jwt' })),
    verify: vi.fn((req, res) => res.json({ success: true, user: { id: '1', role: 'admin' } })),
    refresh: vi.fn((req, res) => res.json({ success: true, token: 'new-mock-jwt' })),
    logout: vi.fn((req, res) => res.json({ success: true }))
  }
}));

vi.mock('../server/controllers/vehicleController', () => ({
  VehicleController: {
    getVehicles: vi.fn((req, res) => res.json([{ id: 'v1', plate: '34ABC123' }])),
    createVehicle: vi.fn((req, res) => res.status(201).json({ id: 'v2', plate: '34XYZ789' })),
    updateVehicle: vi.fn((req, res) => res.json({ id: 'v1', plate: '34ABC123-Updated' })),
    deleteVehicle: vi.fn((req, res) => res.status(204).send()),
    addHistory: vi.fn((req, res) => res.status(201).json({ success: true })),
    validateSeating: vi.fn((req, res) => res.json({ valid: true })),
    updateSeating: vi.fn((req, res) => res.json({ success: true }))
  }
}));

describe('API Route Integrations (Supertest)', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    
    app = express();
    app.use(express.json());
    
    // Mount the envelope middleware like production server.ts does
    app.use('/api', wrapResponseEnvelope);
    
    // Mount api router
    app.use('/api', apiRouter);
    
    // Mount global error handler
    app.use(errorHandler);
  });

  it('GET /api/swagger.json should return the OpenAPI Swagger specifications', async () => {
    const res = await request(app)
      .get('/api/swagger.json')
      .expect('Content-Type', /json/)
      .expect(200);

    expect(res.body).toBeDefined();
    const data = res.body.data || res.body;
    expect(data.openapi || data.info).toBeDefined();
  });

  it('GET /api/v1/auth/csrf should fetch a CSRF token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/csrf')
      .expect(200);

    expect(res.body).toBeDefined();
  });

  it('GET /api/v1/vehicles should list all vehicles (mocked controller)', async () => {
    const res = await request(app)
      .get('/api/v1/vehicles')
      .expect(200);

    const data = res.body.data || res.body;
    expect(Array.isArray(data)).toBe(true);
    expect(data[0]).toEqual(expect.objectContaining({ id: 'v1', plate: '34ABC123' }));
  });

  it('POST /api/v1/vehicles should validate schema and return 201 on success (mocked)', async () => {
    const validVehicle = {
      plate: '34XYZ789',
      brand: 'Mercedes',
      model: 'Sprinter',
      year: 2022,
      capacity: 19,
      driverName: 'Ahmet Yılmaz',
      driverPhone: '5551234567',
      hostessName: 'Ayşe Kaya',
      hostessPhone: '5557654321',
      status: 'active'
    };

    const csrfRes = await request(app).get('/api/v1/auth/csrf').expect(200);
    const csrfToken = csrfRes.body.data.csrfToken;
    const cookies = csrfRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', csrfToken)
      .send(validVehicle)
      .expect(201);

    const data = res.body.data || res.body;
    expect(data.plate).toBe('34XYZ789');
  });

  it('POST /api/v1/vehicles should return 400 when missing required plate field', async () => {
    const invalidVehicle = {
      brand: 'Mercedes',
      model: 'Sprinter'
    };

    const csrfRes = await request(app).get('/api/v1/auth/csrf').expect(200);
    const csrfToken = csrfRes.body.data.csrfToken;
    const cookies = csrfRes.headers['set-cookie'];

    const res = await request(app)
      .post('/api/v1/vehicles')
      .set('Cookie', cookies)
      .set('X-CSRF-Token', csrfToken)
      .send(invalidVehicle)
      .expect(400);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toContain('Doğrulama Hatası');
  });
});
