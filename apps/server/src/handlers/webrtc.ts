// ============================================
// Handler: WebRTC Signaling (offer/answer/ICE relay)
// ============================================

import type { Socket, Server } from 'socket.io';
import type { SocketData } from '../middleware/auth';
import { validateSessionOwnership } from '../validators/session';
import { validateSDP, validateICE } from '../validators/sdp';
import { logger } from '../logger';

export function registerWebRTCHandlers(
  io: Server,
  socket: Socket & { data: SocketData }
): void {
  // --- webrtc:offer ---
  socket.on('webrtc:offer', async (payload: unknown) => {
    try {
      if (!payload || typeof payload !== 'object') {
        logger.warn({ event: 'invalid_payload', userId: socket.data.userId, eventName: 'webrtc:offer' });
        return;
      }

      const { sessionId, offer } = payload as { sessionId?: unknown; offer?: unknown };

      // Validate session ownership
      const sessionCheck = await validateSessionOwnership(sessionId, socket.id);
      if (!sessionCheck.valid) {
        logger.warn({
          event: 'invalid_payload',
          userId: socket.data.userId,
          eventName: 'webrtc:offer',
          reason: sessionCheck.error,
        });
        return;
      }

      // Validate SDP
      const sdpCheck = validateSDP(offer);
      if (!sdpCheck.valid) {
        logger.warn({
          event: 'invalid_payload',
          userId: socket.data.userId,
          eventName: 'webrtc:offer',
          reason: sdpCheck.error,
        });
        return;
      }

      // Relay ONLY to the verified counterpart — never broadcast
      io.to(sessionCheck.partnerSocketId!).emit('webrtc:offer', { offer });
    } catch (err) {
      logger.error({ err, event: 'webrtc_offer_error', userId: socket.data.userId });
    }
  });

  // --- webrtc:answer ---
  socket.on('webrtc:answer', async (payload: unknown) => {
    try {
      if (!payload || typeof payload !== 'object') {
        logger.warn({ event: 'invalid_payload', userId: socket.data.userId, eventName: 'webrtc:answer' });
        return;
      }

      const { sessionId, answer } = payload as { sessionId?: unknown; answer?: unknown };

      const sessionCheck = await validateSessionOwnership(sessionId, socket.id);
      if (!sessionCheck.valid) {
        logger.warn({
          event: 'invalid_payload',
          userId: socket.data.userId,
          eventName: 'webrtc:answer',
          reason: sessionCheck.error,
        });
        return;
      }

      const sdpCheck = validateSDP(answer);
      if (!sdpCheck.valid) {
        logger.warn({
          event: 'invalid_payload',
          userId: socket.data.userId,
          eventName: 'webrtc:answer',
          reason: sdpCheck.error,
        });
        return;
      }

      // Relay ONLY to counterpart
      io.to(sessionCheck.partnerSocketId!).emit('webrtc:answer', { answer });
    } catch (err) {
      logger.error({ err, event: 'webrtc_answer_error', userId: socket.data.userId });
    }
  });

  // --- webrtc:ice ---
  socket.on('webrtc:ice', async (payload: unknown) => {
    try {
      if (!payload || typeof payload !== 'object') {
        logger.warn({ event: 'invalid_payload', userId: socket.data.userId, eventName: 'webrtc:ice' });
        return;
      }

      const { sessionId, candidate } = payload as { sessionId?: unknown; candidate?: unknown };

      const sessionCheck = await validateSessionOwnership(sessionId, socket.id);
      if (!sessionCheck.valid) {
        logger.warn({
          event: 'invalid_payload',
          userId: socket.data.userId,
          eventName: 'webrtc:ice',
          reason: sessionCheck.error,
        });
        return;
      }

      const iceCheck = validateICE(candidate);
      if (!iceCheck.valid) {
        logger.warn({
          event: 'invalid_payload',
          userId: socket.data.userId,
          eventName: 'webrtc:ice',
          reason: iceCheck.error,
        });
        return;
      }

      // Relay ONLY to counterpart
      io.to(sessionCheck.partnerSocketId!).emit('webrtc:ice', { candidate });
    } catch (err) {
      logger.error({ err, event: 'webrtc_ice_error', userId: socket.data.userId });
    }
  });
}
