// ============================================
// Handler: Disconnect Cleanup
// ============================================

import type { Socket, Server } from 'socket.io';
import type { SocketData } from '../middleware/auth';
import { getUserSession, destroySession } from '../services/session';
import { removeFromQueue } from '../services/matchmaking';
import { logger } from '../logger';

export function registerDisconnectHandler(
  io: Server,
  socket: Socket & { data: SocketData }
): void {
  socket.on('disconnect', async (reason: string) => {
    try {
      const userId = socket.data.userId;

      logger.info({
        event: 'disconnect',
        userId,
        ipHash: socket.data.ipHash,
        reason,
        timestamp: Date.now(),
      });

      // 1. Remove from matchmaking queue
      await removeFromQueue(userId);

      // 2. Check if in an active session
      const sessionId = await getUserSession(userId);
      if (sessionId) {
        const session = await destroySession(sessionId);

        if (session) {
          // Notify the partner
          const partnerSocketId =
            session.socketA === socket.id ? session.socketB : session.socketA;

          io.to(partnerSocketId).emit('partner:left', {});

          logger.info({
            event: 'partner_notified',
            sessionId: sessionId.slice(0, 8) + '...',
            partnerId: session.socketA === socket.id ? session.userB : session.userA,
          });
        }
      }

      // Note: Per-IP socket count decrement is handled in connectionThrottle middleware
    } catch (err) {
      logger.error({ err, event: 'disconnect_error', userId: socket.data?.userId });
    }
  });
}
