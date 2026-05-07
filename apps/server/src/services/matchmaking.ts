// ============================================
// Service: Interest-Based Matchmaking Queue
// ============================================

import { redis } from '../redis';
import { config } from '../config';
import { logger } from '../logger';
import { createSession } from './session';
import type { QueueEntry, InterestTag } from '@voxmeet/types';

const QUEUE_KEY = 'matchmaking:queue';
const QUEUE_DATA_PREFIX = 'matchmaking:user:';

/**
 * Add a user to the matchmaking queue.
 * Returns a match if one is found immediately.
 */
export async function joinQueue(entry: QueueEntry): Promise<{
  matched: boolean;
  sessionId?: string;
  isInitiator?: boolean;
  partner?: QueueEntry;
} | { matched: false; error: string }> {
  // Check queue capacity
  const queueSize = await redis.zcard(QUEUE_KEY);
  if (queueSize >= config.queue.maxSize) {
    logger.warn({
      event: 'queue_at_capacity',
      queueSize,
      userId: entry.userId,
    });
    return { matched: false, error: 'server_at_capacity' };
  }

  // Check if user is already in queue
  const existing = await redis.zscore(QUEUE_KEY, entry.userId);
  if (existing !== null) {
    // Remove old entry first
    await removeFromQueue(entry.userId);
  }

  // Try to find a match based on interests first
  const match = await findMatch(entry);

  if (match) {
    // Remove matched user from queue
    await removeFromQueue(match.userId);

    // Create session
    const { sessionId } = await createSession(
      entry.userId,
      entry.socketId,
      entry.interests,
      match.userId,
      match.socketId,
      match.interests
    );

    return {
      matched: true,
      sessionId,
      isInitiator: true,
      partner: match,
    };
  }

  // No immediate match — add to queue
  await redis.zadd(QUEUE_KEY, Date.now(), entry.userId);
  await redis.setex(
    `${QUEUE_DATA_PREFIX}${entry.userId}`,
    300, // 5 min TTL — auto-cleanup stale entries
    JSON.stringify(entry)
  );

  logger.info({
    event: 'queue_joined',
    userId: entry.userId,
    interests: entry.interests,
    queueSize: queueSize + 1,
  });

  // Start background matching attempt with timeout
  startMatchTimeout(entry);

  return { matched: false };
}

/**
 * Remove a user from the matchmaking queue.
 */
export async function removeFromQueue(userId: string): Promise<void> {
  await redis.zrem(QUEUE_KEY, userId);
  await redis.del(`${QUEUE_DATA_PREFIX}${userId}`);
}

/**
 * Find a match for the given user based on interests.
 * Priority: overlapping interests > random
 */
async function findMatch(seeker: QueueEntry): Promise<QueueEntry | null> {
  // Get all users in queue (sorted by join time — oldest first)
  const queuedUserIds = await redis.zrange(QUEUE_KEY, 0, -1);

  if (queuedUserIds.length === 0) return null;

  let bestMatch: QueueEntry | null = null;
  let bestOverlap = 0;

  for (const userId of queuedUserIds) {
    // Don't match with self
    if (userId === seeker.userId) continue;

    const raw = await redis.get(`${QUEUE_DATA_PREFIX}${userId}`);
    if (!raw) {
      // Stale entry — clean up
      await redis.zrem(QUEUE_KEY, userId);
      continue;
    }

    let candidate: QueueEntry;
    try {
      candidate = JSON.parse(raw);
    } catch {
      await redis.zrem(QUEUE_KEY, userId);
      continue;
    }

    // Don't match users from the same IP (anti-abuse)
    if (candidate.ipHash === seeker.ipHash) continue;

    // Calculate interest overlap
    const overlap = seeker.interests.filter(
      (tag) => candidate.interests.includes(tag)
    ).length;

    if (overlap > bestOverlap) {
      bestMatch = candidate;
      bestOverlap = overlap;
    }

    // If we find a user with no interests or this is a random match attempt
    // and we haven't found an interest match, take the first available
    if (!bestMatch && overlap === 0) {
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

/**
 * After 10 seconds in queue, attempt a random match (ignore interests).
 */
function startMatchTimeout(entry: QueueEntry): void {
  setTimeout(async () => {
    try {
      // Check if user is still in queue (might have been matched already)
      const inQueue = await redis.zscore(QUEUE_KEY, entry.userId);
      if (inQueue === null) return; // Already matched or left

      // Try random match — take the oldest user in queue (excluding self)
      const candidates = await redis.zrange(QUEUE_KEY, 0, 10);
      for (const candidateId of candidates) {
        if (candidateId === entry.userId) continue;

        const raw = await redis.get(`${QUEUE_DATA_PREFIX}${candidateId}`);
        if (!raw) continue;

        let candidate: QueueEntry;
        try {
          candidate = JSON.parse(raw);
        } catch {
          continue;
        }

        if (candidate.ipHash === entry.ipHash) continue;

        // Found a random match
        await removeFromQueue(entry.userId);
        await removeFromQueue(candidate.userId);

        const { sessionId } = await createSession(
          entry.userId,
          entry.socketId,
          entry.interests,
          candidate.userId,
          candidate.socketId,
          candidate.interests
        );

        // We need to notify both users — this is handled by the queue handler
        // Emit via the global io instance
        const { getIO } = await import('../index');
        const io = getIO();

        io.to(entry.socketId).emit('match:found', {
          sessionId,
          isInitiator: true,
          partnerInterests: candidate.interests,
          turnCredentials: await getTurnCredentials(),
        });

        io.to(candidate.socketId).emit('match:found', {
          sessionId,
          isInitiator: false,
          partnerInterests: entry.interests,
          turnCredentials: await getTurnCredentials(),
        });

        logger.info({
          event: 'random_match',
          sessionId: sessionId.slice(0, 8) + '...',
          userA: entry.userId,
          userB: candidate.userId,
        });

        return;
      }
    } catch (err) {
      logger.error({ err, event: 'match_timeout_error', userId: entry.userId });
    }
  }, config.queue.matchTimeoutMs);
}

async function getTurnCredentials() {
  const { generateTurnCredentials } = await import('./turn');
  return generateTurnCredentials();
}

/**
 * Get current queue size.
 */
export async function getQueueSize(): Promise<number> {
  return redis.zcard(QUEUE_KEY);
}

/**
 * Check if queue is accepting new users.
 */
export async function isQueueAccepting(): Promise<boolean> {
  const size = await getQueueSize();
  return size < config.queue.maxSize;
}
