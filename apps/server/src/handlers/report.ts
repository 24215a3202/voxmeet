// ============================================
// Handler: Report Submission
// ============================================

import type { Socket, Server } from 'socket.io';
import type { SocketData } from '../middleware/auth';
import { validateSessionOwnership } from '../validators/session';
import { createReport } from '../services/report';
import { checkAutoBan } from '../services/ban';
import { REPORT_REASONS, type ReportReason } from '@voxmeet/types';
import { logger } from '../logger';

export function registerReportHandlers(
  io: Server,
  socket: Socket & { data: SocketData }
): void {
  // --- report:submit ---
  socket.on('report:submit', async (payload: unknown) => {
    try {
      if (!payload || typeof payload !== 'object') {
        logger.warn({ event: 'invalid_payload', userId: socket.data.userId, eventName: 'report:submit' });
        return;
      }

      const { sessionId, reportedId, reason } = payload as {
        sessionId?: unknown;
        reportedId?: unknown;
        reason?: unknown;
      };

      // Validate session
      const sessionCheck = await validateSessionOwnership(sessionId, socket.id);
      if (!sessionCheck.valid) {
        logger.warn({
          event: 'invalid_payload',
          userId: socket.data.userId,
          eventName: 'report:submit',
          reason: sessionCheck.error,
        });
        return;
      }

      // Validate reportedId matches the partner
      if (reportedId !== sessionCheck.partnerId) {
        logger.warn({
          event: 'invalid_payload',
          userId: socket.data.userId,
          eventName: 'report:submit',
          reason: 'reportedId does not match partner',
        });
        return;
      }

      // Validate reason enum
      if (typeof reason !== 'string' || !REPORT_REASONS.includes(reason as ReportReason)) {
        logger.warn({
          event: 'invalid_payload',
          userId: socket.data.userId,
          eventName: 'report:submit',
          reason: 'invalid report reason',
        });
        return;
      }

      // Create the report
      await createReport({
        sessionId: sessionId as string,
        reporterId: socket.data.userId,
        reportedId: reportedId as string,
        reason: reason as string,
        ipHash: socket.data.ipHash,
      });

      // Check if auto-ban should be triggered
      const banResult = await checkAutoBan(
        reportedId as string,
        socket.data.ipHash,
        socket.data.fingerprintHash
      );

      if (banResult) {
        // Find the partner's socket and disconnect them
        const partnerSocket = io.sockets.sockets.get(sessionCheck.partnerSocketId!);
        if (partnerSocket) {
          if (banResult === 'SOFT') {
            partnerSocket.emit('banned', {
              until: new Date(Date.now() + 86400000).toISOString(), // 24 hours
            });
          } else {
            partnerSocket.emit('banned', {});
          }
          partnerSocket.disconnect(true);
        }

        logger.info({
          event: 'auto_ban_triggered',
          type: banResult,
          reportedId: reportedId as string,
        });
      }
    } catch (err) {
      logger.error({ err, event: 'report_submit_error', userId: socket.data.userId });
    }
  });
}
