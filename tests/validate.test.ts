import { describe, it, expect, vi } from 'vitest';
import { validateRequest } from '../server/middlewares/validate';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

describe('validateRequest Middleware', () => {
  const schema = {
    body: z.object({
      name: z.string().min(1, 'İsim alanı zorunludur.'),
      age: z.number().min(18, '18 yaşından büyük olmalısınız.')
    }),
    query: z.object({
      search: z.string().optional()
    }),
    params: z.object({
      id: z.string()
    })
  };

  it('should successfully pass validation when all segments are valid', async () => {
    const req = {
      body: { name: 'Ahmet', age: 25 },
      query: { search: 'test' },
      params: { id: '123' }
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    const next = vi.fn() as unknown as NextFunction;

    const middleware = validateRequest(schema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(res.status).not.toHaveBeenCalled();
    expect(req.body).toEqual({ name: 'Ahmet', age: 25 });
  });

  it('should return 400 Bad Request with validation details when body is invalid', async () => {
    const req = {
      body: { name: 'Ahmet', age: 15 }, // under 18
      query: {},
      params: { id: '123' }
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    const next = vi.fn() as unknown as NextFunction;

    const middleware = validateRequest(schema);
    await middleware(req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        message: expect.stringContaining('18 yaşından büyük olmalısınız.'),
        details: expect.arrayContaining([
          expect.objectContaining({
            field: 'age',
            message: '18 yaşından büyük olmalısınız.'
          })
        ])
      })
    );
  });

  it('should only validate query if body schema is not defined', async () => {
    const req = {
      body: { some: 'unvalidated data' },
      query: { search: 'test_query' },
      params: {}
    } as unknown as Request;

    const res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn()
    } as unknown as Response;

    const next = vi.fn() as unknown as NextFunction;

    const middleware = validateRequest({ query: schema.query });
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith();
    expect(req.query).toEqual({ search: 'test_query' });
  });

  it('should call next(error) if a non-ZodError occurs during parsing', async () => {
    const req = {
      body: {}
    } as unknown as Request;

    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;

    const customError = new Error('Custom DB or system error during validation');
    const faultySchema = {
      body: {
        parseAsync: vi.fn().mockRejectedValue(customError)
      } as any
    };

    const middleware = validateRequest(faultySchema);
    await middleware(req, res, next);

    expect(next).toHaveBeenCalledWith(customError);
  });
});
