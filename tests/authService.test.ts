import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthService } from '../server/services/authService';
import { UserRepository } from '../server/repositories/userRepository';
import { LogRepository } from '../server/repositories/logRepository';
import * as cryptoUtils from '../server/utils/crypto';

vi.mock('../server/repositories/userRepository');
vi.mock('../server/repositories/logRepository');
vi.mock('../server/utils/crypto');
vi.mock('../server/database/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([{ 1: 1 }])
  }
}));

describe('AuthService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('should throw an error if username or password is not provided', async () => {
      await expect(
        AuthService.login({ username: '', password: '' })
      ).rejects.toThrow('Kullanıcı adı ve şifre gereklidir.');
    });

    it('should throw an error if too many failed attempts (brute force block)', async () => {
      vi.mocked(UserRepository.countFailedAttempts).mockResolvedValue(5); // threshold is typically 5

      await expect(
        AuthService.login({ username: 'hacker', password: 'password123' })
      ).rejects.toThrow('Çok fazla başarısız giriş denemesi.');

      expect(LogRepository.create).toHaveBeenCalled();
    });

    it('should throw error for invalid credentials if user not found', async () => {
      vi.mocked(UserRepository.countFailedAttempts).mockResolvedValue(0);
      vi.mocked(UserRepository.findByUsername).mockResolvedValue(null);

      await expect(
        AuthService.login({ username: 'notfound', password: 'password123' })
      ).rejects.toThrow('Geçersiz kullanıcı adı veya şifre.');

      expect(UserRepository.createLoginHistory).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', username: 'notfound' })
      );
    });

    it('should throw error if password verification fails', async () => {
      const mockUser = {
        id: 'user_1',
        name: 'John Doe',
        username: 'john',
        passwordHash: 'some_hash',
        role: 'user',
        email: 'john@example.com',
        phone: '1234567890'
      };

      vi.mocked(UserRepository.countFailedAttempts).mockResolvedValue(0);
      vi.mocked(UserRepository.findByUsername).mockResolvedValue(mockUser as any);
      vi.mocked(cryptoUtils.verifyPassword).mockResolvedValue(false);

      await expect(
        AuthService.login({ username: 'john', password: 'wrong_password' })
      ).rejects.toThrow('Geçersiz kullanıcı adı veya şifre.');

      expect(UserRepository.createLoginHistory).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'failed', userId: 'user_1' })
      );
    });

    it('should succeed with valid credentials and return tokens', async () => {
      const mockUser = {
        id: 'user_1',
        name: 'John Doe',
        username: 'john',
        passwordHash: 'correct_hash',
        role: 'admin',
        email: 'john@example.com',
        phone: '1234567890'
      };

      vi.mocked(UserRepository.countFailedAttempts).mockResolvedValue(0);
      vi.mocked(UserRepository.findByUsername).mockResolvedValue(mockUser as any);
      vi.mocked(cryptoUtils.verifyPassword).mockResolvedValue(true);
      vi.mocked(cryptoUtils.signAccessToken).mockReturnValue('access_token_123');
      vi.mocked(cryptoUtils.signRefreshToken).mockReturnValue('refresh_token_123');

      const result = await AuthService.login({
        username: 'john',
        password: 'correct_password',
        ipAddress: '127.0.0.1'
      });

      expect(result.accessToken).toBe('access_token_123');
      expect(result.refreshToken).toBe('refresh_token_123');
      expect(result.user.id).toBe('user_1');
      expect(result.user.role).toBe('admin');

      expect(UserRepository.createSession).toHaveBeenCalled();
      expect(UserRepository.createLoginHistory).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'success', userId: 'user_1' })
      );
    });
  });

  describe('verify', () => {
    it('should throw error if token is blacklisted', async () => {
      vi.mocked(UserRepository.isTokenBlacklisted).mockResolvedValue(true);

      await expect(AuthService.verify('blacklisted_token')).rejects.toThrow(
        'Oturum sonlandırıldı. Lütfen tekrar giriş yapın.'
      );
    });

    it('should throw error if decoding fails', async () => {
      vi.mocked(UserRepository.isTokenBlacklisted).mockResolvedValue(false);
      vi.mocked(cryptoUtils.verifyAccessToken).mockReturnValue(null);

      await expect(AuthService.verify('invalid_token')).rejects.toThrow(
        'Geçersiz veya süresi dolmuş oturum.'
      );
    });

    it('should return user info on valid non-blacklisted token', async () => {
      const mockUser = {
        id: 'user_1',
        name: 'John Doe',
        username: 'john',
        role: 'user',
        email: 'john@example.com',
        phone: '1234567890'
      };

      vi.mocked(UserRepository.isTokenBlacklisted).mockResolvedValue(false);
      vi.mocked(cryptoUtils.verifyAccessToken).mockReturnValue({
        userId: 'user_1',
        username: 'john',
        role: 'user'
      });
      vi.mocked(UserRepository.findById).mockResolvedValue(mockUser as any);

      const result = await AuthService.verify('valid_token');
      expect(result.id).toBe('user_1');
      expect(result.name).toBe('John Doe');
    });

    it('should throw an error if no accessToken is provided', async () => {
      await expect(AuthService.verify('')).rejects.toThrow('Erişim anahtarı bulunamadı.');
    });

    it('should throw an error if user is not found during token verification', async () => {
      vi.mocked(UserRepository.isTokenBlacklisted).mockResolvedValue(false);
      vi.mocked(cryptoUtils.verifyAccessToken).mockReturnValue({
        userId: 'user_not_exist',
        username: 'ghost',
        role: 'user'
      });
      vi.mocked(UserRepository.findById).mockResolvedValue(null);

      await expect(AuthService.verify('some_access_token')).rejects.toThrow('Kullanıcı bulunamadı.');
    });
  });

  describe('refresh', () => {
    it('should throw an error if no oldRefreshToken is provided', async () => {
      await expect(AuthService.refresh('')).rejects.toThrow('Yenileme anahtarı gereklidir.');
    });

    it('should throw if no session is found for the token', async () => {
      vi.mocked(UserRepository.findSessionByToken).mockResolvedValue(null);
      vi.mocked(cryptoUtils.verifyRefreshToken).mockReturnValue({
        userId: 'user_1',
        username: 'john',
        role: 'user'
      });

      await expect(AuthService.refresh('some_token')).rejects.toThrow('Geçersiz yenileme oturumu.');
      expect(UserRepository.deleteSessionsByUserId).toHaveBeenCalledWith('user_1');
    });

    it('should rotate tokens and return user data for valid session', async () => {
      const mockSession = {
        userId: 'user_1',
        refreshToken: 'old_refresh_token',
        deviceId: 'd1',
        deviceType: 'mobile',
        ipAddress: '127.0.0.1',
        userAgent: 'agent',
        expiresAt: new Date(Date.now() + 1000000)
      };

      const mockUser = {
        id: 'user_1',
        name: 'John Doe',
        username: 'john',
        role: 'user',
        email: 'john@example.com',
        phone: '1234567890'
      };

      vi.mocked(UserRepository.findSessionByToken).mockResolvedValue(mockSession as any);
      vi.mocked(cryptoUtils.verifyRefreshToken).mockReturnValue({
        userId: 'user_1',
        username: 'john',
        role: 'user'
      });
      vi.mocked(UserRepository.findById).mockResolvedValue(mockUser as any);
      vi.mocked(cryptoUtils.signAccessToken).mockReturnValue('new_access_token');
      vi.mocked(cryptoUtils.signRefreshToken).mockReturnValue('new_refresh_token');

      const result = await AuthService.refresh('old_refresh_token');
      expect(result.accessToken).toBe('new_access_token');
      expect(result.refreshToken).toBe('new_refresh_token');
      expect(result.user.name).toBe('John Doe');

      expect(UserRepository.deleteSessionByToken).toHaveBeenCalledWith('old_refresh_token');
      expect(UserRepository.createSession).toHaveBeenCalled();
    });

    it('should throw if verification of token fails or mismatches session userId', async () => {
      const mockSession = {
        userId: 'user_1',
        refreshToken: 'old_refresh_token'
      };

      vi.mocked(UserRepository.findSessionByToken).mockResolvedValue(mockSession as any);
      // Mock decodes into a different user
      vi.mocked(cryptoUtils.verifyRefreshToken).mockReturnValue({
        userId: 'user_mismatch',
        username: 'john',
        role: 'user'
      });

      await expect(AuthService.refresh('old_refresh_token')).rejects.toThrow(
        'Yenileme oturum anahtarı süresi dolmuş veya geçersiz.'
      );
      expect(UserRepository.deleteSessionByToken).toHaveBeenCalledWith('old_refresh_token');
    });

    it('should throw if user is not found during token refresh', async () => {
      const mockSession = {
        userId: 'user_1',
        refreshToken: 'old_refresh_token'
      };

      vi.mocked(UserRepository.findSessionByToken).mockResolvedValue(mockSession as any);
      vi.mocked(cryptoUtils.verifyRefreshToken).mockReturnValue({
        userId: 'user_1',
        username: 'john',
        role: 'user'
      });
      // User doesn't exist anymore
      vi.mocked(UserRepository.findById).mockResolvedValue(null);

      await expect(AuthService.refresh('old_refresh_token')).rejects.toThrow('Kullanıcı bulunamadı.');
    });
  });

  describe('logout', () => {
    it('should clean up session and blacklist token if valid', async () => {
      vi.mocked(cryptoUtils.verifyAccessToken).mockReturnValue({
        userId: 'user_1',
        username: 'john',
        role: 'user'
      });

      const result = await AuthService.logout('valid_access', 'valid_refresh');
      expect(result.success).toBe(true);
      expect(UserRepository.deleteSessionByToken).toHaveBeenCalledWith('valid_refresh');
      expect(UserRepository.blacklistToken).toHaveBeenCalled();
    });
  });
});
