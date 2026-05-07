// ============================================
// Handler: Skip / Next Stranger
// ============================================

import type { Socket, Server } from 'socket.io';
import type { SocketData } from '../middleware/auth';
import { validateSessionOwnership } from '../validators/session';
import { destroySession } from '../services/session';
import { logger } from '../logger';

export function registerSkipHandlers(
  io: Server,
  socket: Socket & { data: SocketData }
): void {
  // --- skip ---
  socket.on('skip', async (payload: unknown) => {
    try {
      if (!payload || typeof payload !== 'object') {
        logger.warn({ event: 'invalid_payload', userId: socket.data.userId, eventName: 'skip' });
        return;
      }

      const { sessionId } = payload as { sessionId?: unknown };

      // Validate session ownership
      const sessionCheck = await validateSessionOwnership(sessionId, socket.id);
      if (!sessionCheck.valid) {
        logger.warn({
          event: 'invalid_payload',
          userId: socket.data.userId,
          eventName: 'skip',
          reason: sessionCheck.error,
        });
        return;
      }

      // Destroy the session
      await destroySession(sessionId as string);

      // Notify the partner that they were skipped
      io.to(sessionCheck.partnerSocketId!).emit('partner:skipped', {});

      logger.info({
        event: 'skip',
        userId: socket.data.userId,
        sessionId: (sessionId as string).slice(0, 8) + '...',
        timestamp: Date.now(),
      });

      // Both users are now free to re-queue themselves
      // The frontend handles re-queuing after receiving the skip/partner:skipped events
    } catch (err) {
      logger.error({ err, event: 'skip_error', userId: socket.data.userId });
    }
  });
}
