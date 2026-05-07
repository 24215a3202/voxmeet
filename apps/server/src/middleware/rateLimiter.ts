// ============================================
// Middleware: Redis-Based Rate Limiter
// Generic factory for both connection and per-event limits
// ============================================

import { redis } from '../redis';
import { config } from '../config';
import { logger } from '../logger';
import type { Socket } from 'socket.io';
import type { SocketData } from './auth';

interface RateLimitConfig {
  max: number;
  windowSeconds: number;
}

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfter?: number; // Unix timestamp
}

/**
 * Check rate limit for a given key.
 * Returns whether the action is allowed.
 */
export async function checkRateLimit(
  key: string,
  limits: RateLimitConfig
): Promise<RateLimitResult> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:${key}`;

  const pipeline = redis.pipeline();
  pipeline.incr(windowKey);
  pipeline.ttl(windowKey);
  const results = await pipeline.exec();

  if (!results) {
    return { allowed: true, remaining: limits.max };
  }

  const count = results[0]?.[1] as number;
  const ttl = results[1]?.[1] as number;

  // Set expiry on first request in window
  if (ttl === -1) {
    await redis.expire(windowKey, limits.windowSeconds);
  }

  if (count > limits.max) {
    const retryAfter = now + (ttl > 0 ? ttl : limits.windowSeconds);
    return { allowed: false, remaining: 0, retryAfter };
  }

  return { allowed: true, remaining: limits.max - count };
}

/**
 * Track rate limit violations for auto-ban.
 * After 3 violations in 1 hour, issues a soft ban.
 */
export async function trackRateLimitViolation(
  userId: string,
  action: string,
  ipHash: string
): Promise<boolean> {
  const violationKey = `ratelimit:violations:${userId}`;
  const count = await redis.incr(violationKey);

  // Set window on first violation
  if (count === 1) {
    await redis.expire(violationKey, config.autoban.rateLimitViolations.windowSeconds);
  }

  logger.warn({
    event: 'rate_limit',
    userId,
    action,
    violationCount: count,
    timestamp: Date.now(),
  });

  // Auto soft-ban after threshold
  if (count >= config.autoban.rateLimitViolations.count) {
    // Issue soft ban
    const banDuration = config.autoban.softBanDurationSeconds;
    await redis.setex(`softban:${userId}`, banDuration, '1');
    await redis.setex(`softban:ip:${ipHash}`, banDuration, '1');

    logger.info({
      event: 'ban',
      userId,
      ipHash,
      type: 'SOFT',
      reason: 'rate_limit_violations',
      timestamp: Date.now(),
    });

    return true; // User should be banned
  }

  return false;
}

/**
 * Create a rate-limited event handler wrapper.
 * Applies rate limiting before executing the handler.
 */
export function rateLimitedHandler(
  action: string,
  keyFn: (socket: Socket & { data: SocketData }, ...args: unknown[]) => string,
  limits: RateLimitConfig,
  handler: (socket: Socket & { data: SocketData }, ...args: unknown[]) => Promise<void> | void
) {
  return async (socket: Socket & { data: SocketData }, ...args: unknown[]) => {
    const key = keyFn(socket, ...args);
    const result = await checkRateLimit(key, limits);

    if (!result.allowed) {
      socket.emit('rate_limited', {
        action,
        retryAfter: result.retryAfter || Math.floor(Date.now() / 1000) + limits.windowSeconds,
      });

      const shouldBan = await trackRateLimitViolation(
        socket.data.userId,
        action,
        socket.data.ipHash
      );

      if (shouldBan) {
        socket.emit('banned', {
          until: new Date(Date.now() + config.autoban.softBanDurationSeconds * 1000).toISOString(),
        });
        socket.disconnect(true);
      }

      return;
    }

    try {
      await handler(socket, ...args);
    } catch (err) {
      logger.error({ err, event: 'handler_error', action, userId: socket.data.userId });
    }
  };
}
