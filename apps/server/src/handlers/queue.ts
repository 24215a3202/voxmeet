// ============================================
// Handler: Matchmaking Queue
// ============================================

import type { Socket, Server } from 'socket.io';
import type { SocketData } from '../middleware/auth';
import { joinQueue, removeFromQueue } from '../services/matchmaking';
import { getUserSession } from '../services/session';
import { generateTurnCredentials } from '../services/turn';
import { validateInterests } from '../validators/interests';
import { config } from '../config';
import { logger } from '../logger';

export function registerQueueHandlers(
  io: Server,
  socket: Socket & { data: SocketData }
): void {
  // --- queue:join ---
  socket.on('queue:join', async (payload: unknown) => {
    try {
      if (!payload || typeof payload !== 'object') {
        logger.warn({ event: 'invalid_payload', userId: socket.data.userId, eventName: 'queue:join' });
        return;
      }

      const { interests } = payload as { interests?: unknown };

      // Validate interests
      const validation = validateInterests(interests);
      if (!validation.valid) {
        logger.warn({
          event: 'invalid_payload',
          userId: socket.data.userId,
          eventName: 'queue:join',
          reason: validation.error,
        });
        return;
      }

      // Check if user already in a session
      const existingSession = await getUserSession(socket.data.userId);
      if (existingSession) {
        logger.warn({
          event: 'already_in_session',
          userId: socket.data.userId,
        });
        return;
      }

      // Join the queue
      const result = await joinQueue({
        userId: socket.data.userId,
        socketId: socket.id,
        interests: validation.sanitized,
        joinedAt: Date.now(),
        ipHash: socket.data.ipHash,
        fingerprintHash: socket.data.fingerprintHash,
      });

      if ('error' in result) {
        socket.emit('match:failed', { reason: result.error as any });
        return;
      }

      if (result.matched && result.sessionId && result.partner) {
        const turnCreds = generateTurnCredentials();

        // Notify the initiator (this user)
        socket.emit('match:found', {
          sessionId: result.sessionId,
          isInitiator: true,
          partnerInterests: result.partner.interests,
          turnCredentials: turnCreds,
        });

        // Notify the partner
        io.to(result.partner.socketId).emit('match:found', {
          sessionId: result.sessionId,
          isInitiator: false,
          partnerInterests: validation.sanitized,
          turnCredentials: turnCreds,
        });
      }
      // If not matched, user is in queue — will be matched by timeout or next joiner
    } catch (err) {
      logger.error({ err, event: 'queue_join_error', userId: socket.data.userId });
    }
  });

  // --- queue:leave ---
  socket.on('queue:leave', async () => {
    try {
      await removeFromQueue(socket.data.userId);
      logger.info({
        event: 'queue_left',
        userId: socket.data.userId,
      });
    } catch (err) {
      logger.error({ err, event: 'queue_leave_error', userId: socket.data.userId });
    }
  });
}
