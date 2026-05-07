// ============================================
// Middleware: Multi-Identifier Ban Check
// Checks userId, ipHash, AND fingerprintHash
// ============================================

import type { Socket } from 'socket.io';
import type { SocketData } from './auth';
import { prisma } from '../prisma';
import { redis } from '../redis';
import { logger } from '../logger';

/**
 * Check if a user is banned by any of their identifiers.
 * Query order: Redis (soft bans) → PostgreSQL (hard bans)
 */
export async function banCheckMiddleware(
  socket: Socket & { data: SocketData },
  next: (err?: Error) => void
): Promise<void> {
  const { userId, ipHash, fingerprintHash } = socket.data;

  try {
    // 1. Check Redis for soft bans (faster)
    const softBanKey = `softban:${userId}`;
    const softBanTtl = await redis.ttl(softBanKey);

    if (softBanTtl > 0) {
      const expiresAt = new Date(Date.now() + softBanTtl * 1000).toISOString();
      socket.emit('banned', { until: expiresAt });
      logger.info({
        event: 'ban_reject',
        type: 'SOFT',
        userId,
        ipHash,
      });
      return next(new Error('You are temporarily banned'));
    }

    // Also check soft ban by IP
    const ipSoftBanKey = `softban:ip:${ipHash}`;
    const ipSoftBanTtl = await redis.ttl(ipSoftBanKey);

    if (ipSoftBanTtl > 0) {
      const expiresAt = new Date(Date.now() + ipSoftBanTtl * 1000).toISOString();
      socket.emit('banned', { until: expiresAt });
      logger.info({
        event: 'ban_reject',
        type: 'SOFT',
        reason: 'ip_match',
        userId,
        ipHash,
      });
      return next(new Error('You are temporarily banned'));
    }

    // 2. Check PostgreSQL for hard bans — check ALL THREE identifiers
    const ban = await prisma.ban.findFirst({
      where: {
        type: 'HARD',
        OR: [
          { userId },
          { ipHash },
          ...(fingerprintHash !== 'unknown' ? [{ fingerprintHash }] : []),
        ],
      },
    });

    if (ban) {
      socket.emit('banned', {});
      logger.info({
        event: 'ban_reject',
        type: 'HARD',
        userId,
        ipHash,
        matchedField: ban.userId === userId ? 'userId' : ban.ipHash === ipHash ? 'ipHash' : 'fingerprintHash',
      });
      return next(new Error('You are permanently banned'));
    }

    next();
  } catch (err) {
    logger.error({ err, event: 'ban_check_error', userId }, 'Ban check failed');
    // Fail open — allow connection but log the error
    next();
  }
}
