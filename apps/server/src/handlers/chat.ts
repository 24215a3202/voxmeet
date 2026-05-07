// ============================================
// Handler: Text Chat
// ============================================

import type { Socket, Server } from 'socket.io';
import type { SocketData } from '../middleware/auth';
import { validateSessionOwnership } from '../validators/session';
import { validateMessage } from '../validators/message';
import { logger } from '../logger';

export function registerChatHandlers(
  io: Server,
  socket: Socket & { data: SocketData }
): void {
  // --- chat:message ---
  socket.on('chat:message', async (payload: unknown) => {
    try {
      if (!payload || typeof payload !== 'object') {
        logger.warn({ event: 'invalid_payload', userId: socket.data.userId, eventName: 'chat:message' });
        return;
      }

      const { sessionId, text } = payload as { sessionId?: unknown; text?: unknown };

      // Validate session
      const sessionCheck = await validateSessionOwnership(sessionId, socket.id);
      if (!sessionCheck.valid) {
        logger.warn({
          event: 'invalid_payload',
          userId: socket.data.userId,
          eventName: 'chat:message',
          reason: sessionCheck.error,
        });
        return;
      }

      // Validate and sanitize the message
      const msgCheck = validateMessage(text);
      if (!msgCheck.valid) {
        logger.warn({
          event: 'invalid_payload',
          userId: socket.data.userId,
          eventName: 'chat:message',
          reason: msgCheck.error,
        });
        return;
      }

      // Relay sanitized message to counterpart with server-generated timestamp
      // Never persist chat messages — ephemeral only
      io.to(sessionCheck.partnerSocketId!).emit('chat:message', {
        text: msgCheck.sanitized,
        timestamp: Date.now(),
      });
    } catch (err) {
      logger.error({ err, event: 'chat_message_error', userId: socket.data.userId });
    }
  });
}
