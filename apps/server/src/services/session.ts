// ============================================
// Service: Session Management (Redis)
// ============================================

import { redis } from '../redis';
import { generateSessionId } from '../utils/hash';
import { config } from '../config';
import { logger } from '../logger';
import type { SessionData, InterestTag } from '@voxmeet/types';

/**
 * Create a new session between two matched users.
 */
export async function createSession(
  userA: string,
  socketA: string,
  interestsA: InterestTag[],
  userB: string,
  socketB: string,
  interestsB: InterestTag[]
): Promise<{ sessionId: string; session: SessionData }> {
  const sessionId = generateSessionId();

  const session: SessionData = {
    userA,
    userB,
    socketA,
    socketB,
    interestsA,
    interestsB,
    startedAt: Date.now(),
  };

  await redis.setex(
    `session:${sessionId}`,
    config.session.ttlSeconds,
    JSON.stringify(session)
  );

  // Also track which sessions each user is in (for disconnect cleanup)
  await redis.set(`user:session:${userA}`, sessionId, 'EX', config.session.ttlSeconds);
  await redis.set(`user:session:${userB}`, sessionId, 'EX', config.session.ttlSeconds);

  logger.info({
    event: 'session_created',
    sessionId: sessionId.slice(0, 8) + '...',
    userA,
    userB,
    timestamp: Date.now(),
  });

  return { sessionId, session };
}

/**
 * Get a session by ID.
 */
export async function getSession(sessionId: string): Promise<SessionData | null> {
  const raw = await redis.get(`session:${sessionId}`);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as SessionData;
  } catch {
    return null;
  }
}

/**
 * Destroy a session and clean up user mappings.
 */
export async function destroySession(sessionId: string): Promise<SessionData | null> {
  const raw = await redis.get(`session:${sessionId}`);
  if (!raw) return null;

  let session: SessionData;
  try {
    session = JSON.parse(raw);
  } catch {
    await redis.del(`session:${sessionId}`);
    return null;
  }

  // Clean up all related keys
  await redis.del(
    `session:${sessionId}`,
    `user:session:${session.userA}`,
    `user:session:${session.userB}`
  );

  logger.info({
    event: 'session_destroyed',
    sessionId: sessionId.slice(0, 8) + '...',
    duration: Date.now() - session.startedAt,
    timestamp: Date.now(),
  });

  return session;
}

/**
 * Get the active session for a user.
 */
export async function getUserSession(userId: string): Promise<string | null> {
  return redis.get(`user:session:${userId}`);
}
