// ============================================
// Service: Ban Management
// ============================================

import { prisma } from '../prisma';
import { redis } from '../redis';
import { config } from '../config';
import { logger } from '../logger';
import type { BanData } from '@voxmeet/types';

/**
 * Issue a soft ban — stored in Redis with TTL.
 */
export async function issueSoftBan(
  userId: string,
  ipHash: string,
  fingerprintHash?: string,
  durationSeconds?: number
): Promise<void> {
  const duration = durationSeconds || config.autoban.softBanDurationSeconds;

  // Ban by userId
  await redis.setex(`softban:${userId}`, duration, '1');

  // Also ban by IP hash
  await redis.setex(`softban:ip:${ipHash}`, duration, '1');

  // Also ban by fingerprint if available
  if (fingerprintHash && fingerprintHash !== 'unknown') {
    await redis.setex(`softban:fp:${fingerprintHash}`, duration, '1');
  }

  logger.info({
    event: 'ban',
    userId,
    ipHash,
    type: 'SOFT',
    duration,
    timestamp: Date.now(),
  });
}

/**
 * Issue a hard ban — stored in PostgreSQL permanently.
 */
export async function issueHardBan(
  userId: string,
  ipHash: string,
  fingerprintHash?: string
): Promise<void> {
  // Upsert to handle duplicate key on userId
  await prisma.ban.upsert({
    where: { userId },
    update: {
      ipHash,
      fingerprintHash: fingerprintHash !== 'unknown' ? fingerprintHash : null,
      type: 'HARD',
    },
    create: {
      userId,
      ipHash,
      fingerprintHash: fingerprintHash !== 'unknown' ? fingerprintHash : null,
      type: 'HARD',
    },
  });

  // Also set in Redis for fast lookup
  await redis.set(`hardban:${userId}`, '1');
  await redis.set(`hardban:ip:${ipHash}`, '1');

  if (fingerprintHash && fingerprintHash !== 'unknown') {
    await redis.set(`hardban:fp:${fingerprintHash}`, '1');
  }

  logger.info({
    event: 'ban',
    userId,
    ipHash,
    type: 'HARD',
    reason: 'threshold_exceeded',
    timestamp: Date.now(),
  });
}

/**
 * Check if a user should be auto-banned based on report count.
 */
export async function checkAutoBan(
  reportedId: string,
  ipHash: string,
  fingerprintHash?: string
): Promise<'SOFT' | 'HARD' | null> {
  // Count reports in the last 24 hours
  const recentReports = await prisma.report.count({
    where: {
      reportedId,
      createdAt: {
        gte: new Date(Date.now() - config.autoban.softBanReports.windowSeconds * 1000),
      },
    },
  });

  // Count total reports all time
  const totalReports = await prisma.report.count({
    where: { reportedId },
  });

  // Hard ban threshold: 10 total reports
  if (totalReports >= config.autoban.hardBanReports) {
    await issueHardBan(reportedId, ipHash, fingerprintHash);
    return 'HARD';
  }

  // Soft ban threshold: 3 reports in 24 hours
  if (recentReports >= config.autoban.softBanReports.count) {
    await issueSoftBan(reportedId, ipHash, fingerprintHash);
    return 'SOFT';
  }

  return null;
}

/**
 * Lift a ban by userId.
 */
export async function liftBan(userId: string): Promise<void> {
  // Remove from PostgreSQL
  const ban = await prisma.ban.findUnique({ where: { userId } });
  if (ban) {
    await prisma.ban.delete({ where: { userId } });

    // Clean up Redis keys
    await redis.del(`hardban:${userId}`);
    if (ban.ipHash) await redis.del(`hardban:ip:${ban.ipHash}`);
    if (ban.fingerprintHash) await redis.del(`hardban:fp:${ban.fingerprintHash}`);
  }

  // Also remove soft bans
  await redis.del(`softban:${userId}`);

  logger.info({
    event: 'ban_lifted',
    userId,
    timestamp: Date.now(),
  });
}
