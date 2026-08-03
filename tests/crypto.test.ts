import { describe, it, expect, vi } from 'vitest';

// Mock argon2 before importing crypto utility
vi.mock('argon2', () => {
  return {
    default: {
      hash: vi.fn().mockImplementation((pwd) => Promise.resolve(`$argon2id$v=19$m=65536,t=3,p=4$${pwd}`)),
      verify: vi.fn().mockImplementation((hash, pwd) => {
        if (pwd === 'trigger-error') {
          return Promise.reject(new Error('Mock verification failure'));
        }
        return Promise.resolve(hash === `$argon2id$v=19$m=65536,t=3,p=4$${pwd}`);
      })
    }
  };
});

import { hashPassword, verifyPassword, signAccessToken, signRefreshToken, verifyAccessToken, verifyRefreshToken } from '../server/utils/crypto';
import argon2 from 'argon2';

describe('Crypto Utilities', () => {
  it('should hash and verify passwords correctly', async () => {
    const rawPassword = 'StrongSecurePassword123!';
    const hash = await hashPassword(rawPassword);
    
    expect(hash).toBeDefined();
    expect(typeof hash).toBe('string');
    expect(hash.startsWith('$argon2')).toBe(true);

    const isMatch = await verifyPassword(hash, rawPassword);
    expect(isMatch).toBe(true);

    const isFail = await verifyPassword(hash, 'wrong_password');
    expect(isFail).toBe(false);
  });

  it('should support legacy SHA256 passwords for backward compatibility', async () => {
    const crypto = await import('crypto');
    const sha256Hash = crypto.createHash('sha256').update('test_password').digest('hex');
    const isMatch = await verifyPassword(sha256Hash, 'test_password');
    expect(isMatch).toBe(true);

    const isFail = await verifyPassword(sha256Hash, 'wrong_password');
    expect(isFail).toBe(false);
  });

  it('should sign and verify access and refresh tokens correctly', () => {
    const payload = { userId: 'usr_1', username: 'john_doe', role: 'admin' };
    
    const accessToken = signAccessToken(payload);
    expect(accessToken).toBeDefined();
    expect(typeof accessToken).toBe('string');

    const decodedAccess = verifyAccessToken(accessToken);
    expect(decodedAccess).toBeDefined();
    expect(decodedAccess?.userId).toBe(payload.userId);
    expect(decodedAccess?.username).toBe(payload.username);
    expect(decodedAccess?.role).toBe(payload.role);

    const refreshToken = signRefreshToken(payload);
    expect(refreshToken).toBeDefined();
    expect(typeof refreshToken).toBe('string');

    const decodedRefresh = verifyRefreshToken(refreshToken);
    expect(decodedRefresh).toBeDefined();
    expect(decodedRefresh?.userId).toBe(payload.userId);
    expect(decodedRefresh?.username).toBe(payload.username);
    expect(decodedRefresh?.role).toBe(payload.role);
  });

  it('should return null for expired or invalid access/refresh tokens', () => {
    const invalidToken = 'this.is.an.invalid.token';
    expect(verifyAccessToken(invalidToken)).toBeNull();
    expect(verifyRefreshToken(invalidToken)).toBeNull();
  });

  it('should fallback/handle argon2 errors during hashing and verification', async () => {
    const hashSpy = vi.spyOn(argon2, 'hash').mockRejectedValueOnce(new Error('Argon2 hash error') as never);

    // This will trigger the catch block in hashPassword
    const res = await hashPassword('password');
    expect(hashSpy).toHaveBeenCalled();
    expect(res).toBeDefined();

    // This will trigger the catch block in verifyPassword
    const verifyRes = await verifyPassword('$argon2somehash', 'trigger-error');
    expect(verifyRes).toBe(false);
  });
});
