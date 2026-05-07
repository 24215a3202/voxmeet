// ============================================
// Redis Client — ioredis with graceful fallback
// ============================================

import Redis from 'ioredis';
import { config } from './config';
import { logger } from './logger';

const redisOptions = {
  maxRetriesPerRequest: 3,
  // Stop retrying after ~30 s (15 attempts × 2000 ms max)
  retryStrategy(times: number) {
    if (times > 15) {
      logger.warn('Redis: max retries exceeded — giving up');
      return null; // stop retrying
    }
    return Math.min(times * 200, 2000);
  },
  enableReadyCheck: false,
  // lazyConnect: true prevents crashing on startup when Redis is unavailable
  lazyConnect: true,
};

export const redis = new Redis(config.redisUrl, redisOptions);
export const redisSub = new Redis(config.redisUrl, redisOptions);

redis.on('connect', () => logger.info('Redis client connected'));
redis.on('ready', () => logger.info('Redis client ready'));
redis.on('error', (err) => logger.error({ err: err.message }, 'Redis client error'));
redis.on('close', () => logger.warn('Redis client connection closed'));

redisSub.on('connect', () => logger.info('Redis subscriber connected'));
redisSub.on('ready', () => logger.info('Redis subscriber ready'));
redisSub.on('error', (err) => logger.error({ err: err.message }, 'Redis subscriber error'));
redisSub.on('close', () => logger.warn('Redis subscriber connection closed'));

// Attempt connection (non-blocking — server starts regardless)
redis.connect().catch(() => {});
redisSub.connect().catch(() => {});
