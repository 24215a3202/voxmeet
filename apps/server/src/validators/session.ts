// ============================================
// Validator: Session Ownership
// ============================================

import { redis } from '../redis';
import type { SessionData } from '@voxmeet/types';

const SESSION_ID_REGEX = /^[0-9a-f]{64}$/;

/**
 * Validate that a sessionId:
 * 1. Has valid format (64 hex chars)
 * 2. Exists in Redis
 * 3. The requesting socket is a participant
 *
 * Returns the session data if valid, null otherwise.
 */
export async function validateSessionOwnership(
  sessionId: unknown,
  socketId: string
): Promise<{ valid: boolean; session?: SessionData; partnerId?: string; partnerSocketId?: string; error?: string }> {
  if (typeof sessionId !== 'string' || !SESSION_ID_REGEX.test(sessionId)) {
    return { valid: false, error: 'Invalid session ID format' };
  }

  const raw = await redis.get(`session:${sessionId}`);
  if (!raw) {
    return { valid: false, error: 'Session not found' };
  }

  let session: SessionData;
  try {
    session = JSON.parse(raw);
  } catch {
    return { valid: false, error: 'Corrupt session data' };
  }

  // Check that the requesting socket is one of the two participants
  if (session.socketA !== socketId && session.socketB !== socketId) {
    return { valid: false, error: 'Not a participant of this session' };
  }

  // Determine the partner
  const isUserA = session.socketA === socketId;
  const partnerId = isUserA ? session.userB : session.userA;
  const partnerSocketId = isUserA ? session.socketB : session.socketA;

  return { valid: true, session, partnerId, partnerSocketId };
}
