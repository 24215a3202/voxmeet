// ============================================
// Middleware: Socket.io Authentication
// Validates userId, extracts IP hash, fingerprint
// ============================================

import type { Socket } from 'socket.io';
import { isValidUUID } from '../validators/userId';
import { hashIp } from '../utils/hash';
import { logger } from '../logger';

export interface SocketData {
  userId: string;
  ipHash: string;
  fingerprintHash: string;
  rawIp: string; // only kept in memory, never logged or stored
}

/**
 * Extract the real client IP, respecting reverse proxy headers.
 */
function extractIp(socket: Socket): string {
  const forwarded = socket.handshake.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return socket.handshake.address;
}

/**
 * Socket.io authentication middleware.
 * - Validates userId is a proper UUID v4
 * - Hashes the client IP
 * - Extracts fingerprint hash from handshake
 */
export function authMiddleware(socket: Socket, next: (err?: Error) => void): void {
  const { userId, fingerprintHash } = socket.handshake.auth as {
    userId?: unknown;
    fingerprintHash?: unknown;
  };

  // Validate userId
  if (!isValidUUID(userId)) {
    logger.warn({
      event: 'auth_reject',
      reason: 'invalid_user_id',
      socketId: socket.id,
    });
    return next(new Error('Invalid userId — must be a valid UUID v4'));
  }

  // Validate fingerprint hash (optional but expected)
  const fpHash = typeof fingerprintHash === 'string' && fingerprintHash.length > 0
    ? fingerprintHash
    : 'unknown';

  // Extract and hash IP
  const rawIp = extractIp(socket);
  const ipHash = hashIp(rawIp);

  // Attach data to socket
  (socket as Socket & { data: SocketData }).data = {
    userId,
    ipHash,
    fingerprintHash: fpHash,
    rawIp,
  };

  logger.info({
    event: 'connect',
    ipHash,
    userId,
    timestamp: Date.now(),
  });

  next();
}
