/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { logger } from '../utils/logger';

interface CacheItem<T = any> {
  value: T;
  expiresAt: number;
}

/**
 * High-Performance, Redis-Ready Hybrid Cache Service with Automated TTL & Invalidation
 * Memory-safe with self-cleaning mechanism and maximum capacity limits (prevents Memory Leaks)
 */
export class CacheService {
  private static store = new Map<string, CacheItem>();
  private static hits = 0;
  private static misses = 0;
  private static MAX_ITEMS = 5000; // Enforce maximum items in memory to prevent RAM exhaustion
  private static cleanupTimer: NodeJS.Timeout | null = null;

  static {
    // Self-cleaning interval to actively prune expired items and prevent memory leaks
    this.cleanupTimer = setInterval(() => {
      const now = Date.now();
      let prunedCount = 0;
      for (const [key, item] of this.store.entries()) {
        if (now > item.expiresAt) {
          this.store.delete(key);
          prunedCount++;
        }
      }
      if (prunedCount > 0) {
        logger.performance(`[CACHE CLEANUP] Automatically pruned ${prunedCount} expired items from memory.`);
      }
    }, 60 * 1000); // Run every minute

    // Prevent background timer from keeping the process alive during shutdown
    if (this.cleanupTimer && typeof this.cleanupTimer.unref === 'function') {
      this.cleanupTimer.unref();
    }
  }

  /**
   * Get cached value
   */
  static async get<T>(key: string): Promise<T | null> {
    const startTime = process.hrtime();
    const item = this.store.get(key);

    if (!item) {
      this.misses++;
      this.logMetrics(key, 'MISS', startTime);
      return null;
    }

    if (Date.now() > item.expiresAt) {
      this.store.delete(key);
      this.misses++;
      this.logMetrics(key, 'EXPIRED', startTime);
      return null;
    }

    // Strict LRU behavior: refresh key order in Map by re-inserting on hit
    this.store.delete(key);
    this.store.set(key, item);

    this.hits++;
    this.logMetrics(key, 'HIT', startTime);
    return item.value as T;
  }

  /**
   * Set cache with custom TTL
   */
  static async set(key: string, value: any, ttlSeconds = 300): Promise<void> {
    // Evict oldest item if we exceed MAX_ITEMS capacity (FIFO/LRU safety guard)
    if (this.store.size >= this.MAX_ITEMS) {
      const oldestKey = this.store.keys().next().value;
      if (oldestKey) {
        this.store.delete(oldestKey);
      }
    }

    const expiresAt = Date.now() + ttlSeconds * 1000;
    this.store.set(key, { value, expiresAt });
  }

  /**
   * Delete cached key (Invalidate)
   */
  static async del(key: string): Promise<void> {
    this.store.delete(key);
    logger.performance(`[CACHE INVALIDATED] Key removed manually: ${key}`);
  }

  /**
   * Invalidate multiple keys by pattern prefix
   */
  static async invalidatePattern(pattern: string): Promise<void> {
    const keysDeleted: string[] = [];
    for (const key of this.store.keys()) {
      if (key.startsWith(pattern)) {
        this.store.delete(key);
        keysDeleted.push(key);
      }
    }
    if (keysDeleted.length > 0) {
      logger.performance(`[CACHE PATTERN INVALIDATED] Prefix: ${pattern}, Keys removed: ${keysDeleted.join(', ')}`);
    }
  }

  /**
   * Helper to invalidate all cache (e.g. on complete system reset)
   */
  static async clearAll(): Promise<void> {
    this.store.clear();
    logger.performance('[CACHE FLUSHED] Entire cache store cleared.');
  }

  /**
   * Log performance metrics
   */
  private static logMetrics(key: string, status: 'HIT' | 'MISS' | 'EXPIRED', startTime: [number, number]): void {
    const [seconds, nanoseconds] = process.hrtime(startTime);
    const ms = seconds * 1000 + nanoseconds / 1000000;
    
    logger.performance(`[CACHE READ] Key: "${key}" | Status: ${status} | Latency: ${ms.toFixed(3)}ms | Hit Rate: ${(this.hits / (this.hits + this.misses || 1) * 100).toFixed(1)}%`);
  }
}
