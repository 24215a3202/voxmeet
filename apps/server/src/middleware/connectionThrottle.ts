// ============================================
// Middleware: Connection Throttle (DDoS Protection)
// Per-IP concurrent socket limit + connection rate throttle
// ============================================

import type { Socket } from 'socket.io';
import { redis } from '../redis';
import { config } from '../config';
import { hashIp } from '../utils/hash';
import { logger } from '../logger';

/**
 * Track and limit per-IP connections.
 * - Max 5 concurrent sockets per IP
 * - Block IP for 10 min if > 10 connections in 60 seconds
 */
export async function connectionThrottleMiddleware(
  socket: Socket,
  next: (err?: Error) => void
): Promise<void> {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  const rawIp = typeof forwarded === 'string'
    ? forwarded.split(',')[0].trim()
    : socket.handshake.address;
  const ipHash = hashIp(rawIp);

  try {
    // 1. Check if IP is temporarily blocked
    const blocked = await redis.get(`ip:blocked:${ipHash}`);
    if (blocked) {
      logger.warn({
        event: 'connection_blocked',
        ipHash,
        reason: 'ip_throttled',
      });
      return next(new Error('Too many connections. Try again later.'));
    }

    // 2. Check concurrent socket count
    const concurrentKey = `ip:concurrent:${ipHash}`;
    const concurrent = await redis.scard(concurrentKey);

    if (concurrent >= config.payloadLimits.maxConcurrentSocketsPerIp) {
      logger.warn({
        event: 'connection_rejected',
        ipHash,
        reason: 'max_concurrent_sockets',
        count: concurrent,
      });
      return next(new Error('Too many concurrent connections'));
    }

    // 3. Check connection rate (10 connections per 60 seconds)
    const rateKey = `ip:connrate:${ipHash}`;
    const rate = await redis.incr(rateKey);

    if (rate === 1) {
      await redis.expire(rateKey, 60);
    }

    if (rate > 10) {
      // Block this IP for 10 minutes
      await redis.setex(
        `ip:blocked:${ipHash}`,
        config.payloadLimits.connectionThrottleBlock,
        '1'
      );
      logger.warn({
        event: 'ip_blocked',
        ipHash,
        reason: 'connection_flood',
        rate,
      });
      return next(new Error('Too many connections. You are temporarily blocked.'));
    }

    // 4. Add this socket to the concurrent tracking set
    await redis.sadd(concurrentKey, socket.id);
    await redis.expire(concurrentKey, 3600); // Cleanup after 1 hour if not manually cleaned

    // 5. Register cleanup on disconnect
    socket.on('disconnect', async () => {
      await redis.srem(concurrentKey, socket.id);
    });

    next();
  } catch (err) {
    logger.error({ err, event: 'throttle_error', ipHash }, 'Connection throttle error');
    // Fail open
    next();
  }
}
