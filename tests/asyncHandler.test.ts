import { describe, it, expect, vi } from 'vitest';
import { asyncHandler } from '../server/utils/asyncHandler';
import { Request, Response, NextFunction } from 'express';

describe('asyncHandler Utility', () => {
  it('should successfully resolve and not call next() when fn completes', async () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;
    const fn = vi.fn().mockResolvedValue('success');

    const wrapped = asyncHandler(fn);
    await wrapped(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
    expect(next).not.toHaveBeenCalled();
  });

  it('should catch rejected promise and pass it to next()', async () => {
    const req = {} as Request;
    const res = {} as Response;
    const next = vi.fn() as unknown as NextFunction;
    const error = new Error('Async error');
    const fn = vi.fn().mockRejectedValue(error);

    const wrapped = asyncHandler(fn);
    await wrapped(req, res, next);

    expect(fn).toHaveBeenCalledWith(req, res, next);
    expect(next).toHaveBeenCalledWith(error);
  });
});
