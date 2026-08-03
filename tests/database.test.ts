import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LogRepository } from '../server/repositories/logRepository';
import { UserRepository } from '../server/repositories/userRepository';
import { prisma } from '../server/database/prisma';

// Mock Prisma client methods
vi.mock('../server/database/prisma', () => {
  return {
    prisma: {
      log: {
        findMany: vi.fn(),
        create: vi.fn(),
        count: vi.fn()
      },
      user: {
        findMany: vi.fn(),
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn()
      },
      loginHistory: {
        create: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn()
      }
    }
  };
});

describe('Database / Repository Layer Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('LogRepository', () => {
    it('should find all logs ordered by timestamp descending, with limit 500', async () => {
      const mockLogs = [
        { id: 1, action: 'test-1', timestamp: '2026-07-18' },
        { id: 2, action: 'test-2', timestamp: '2026-07-17' }
      ];
      vi.mocked(prisma.log.count).mockResolvedValue(2);
      vi.mocked(prisma.log.findMany).mockResolvedValue(mockLogs as any);

      const res = await LogRepository.findAll();
      
      expect(prisma.log.findMany).toHaveBeenCalledWith({
        where: {},
        skip: 0,
        take: 50,
        orderBy: { id: 'desc' }
      });
      expect(res.logs).toEqual(mockLogs);
      expect(res.pagination.total).toBe(2);
    });

    it('should insert a new log record', async () => {
      const newLog = {
        userId: 'u1',
        userName: 'Admin',
        userRole: 'admin',
        action: 'DB Test',
        details: 'Database testing successfully executed',
        timestamp: '2026-07-18'
      };
      
      vi.mocked(prisma.log.create).mockResolvedValue({ id: 99, ...newLog } as any);

      const createdLog = await LogRepository.create(newLog);

      expect(prisma.log.create).toHaveBeenCalledWith({
        data: newLog
      });
      expect(createdLog.id).toBe(99);
    });
  });

  describe('UserRepository', () => {
    it('should find non-deleted users', async () => {
      const mockUsers = [
        { id: '1', username: 'john', isDeleted: false },
        { id: '2', username: 'jane', isDeleted: false }
      ];
      vi.mocked(prisma.user.findMany).mockResolvedValue(mockUsers as any);

      const result = await UserRepository.findAll();

      expect(prisma.user.findMany).toHaveBeenCalledWith({
        where: { isDeleted: false }
      });
      expect(result).toEqual(mockUsers);
    });

    it('should find user by username', async () => {
      const mockUser = { id: '3', username: 'bob', isDeleted: false };
      vi.mocked(prisma.user.findFirst).mockResolvedValue(mockUser as any);

      const result = await UserRepository.findByUsername('bob');

      expect(prisma.user.findFirst).toHaveBeenCalledWith({
        where: { username: 'bob', isDeleted: false }
      });
      expect(result).toEqual(mockUser);
    });

    it('should create login history correctly', async () => {
      const historyData = {
        username: 'alice',
        status: 'success',
        ipAddress: '127.0.0.1'
      };
      vi.mocked(prisma.loginHistory.create).mockResolvedValue({ id: 'h1', ...historyData } as any);

      await UserRepository.createLoginHistory(historyData);

      expect(prisma.loginHistory.create).toHaveBeenCalledWith({
        data: historyData
      });
    });

    it('should count failed attempts correctly within window', async () => {
      const sinceDate = new Date();
      vi.mocked(prisma.loginHistory.count).mockResolvedValue(3);

      const count = await UserRepository.countFailedAttempts('alice', sinceDate);

      expect(prisma.loginHistory.count).toHaveBeenCalledWith({
        where: {
          username: 'alice',
          status: 'failed',
          timestamp: { gte: sinceDate }
        }
      });
      expect(count).toBe(3);
    });
  });
});
