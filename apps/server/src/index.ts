// ============================================
// VoxMeet Signaling Server — Entry Point
// ============================================

import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import helmet from 'helmet';
import cors from 'cors';
import { createAdapter } from '@socket.io/redis-adapter';
import { rateLimit } from 'express-rate-limit';

import { config } from './config';
import { logger } from './logger';
import { redis, redisSub } from './redis';

// Middleware
import { authMiddleware, type SocketData } from './middleware/auth';
import { banCheckMiddleware } from './middleware/banCheck';
import { connectionThrottleMiddleware } from './middleware/connectionThrottle';
import { checkRateLimit, trackRateLimitViolation } from './middleware/rateLimiter';

// Handlers
import { registerQueueHandlers } from './handlers/queue';
import { registerWebRTCHandlers } from './handlers/webrtc';
import { registerChatHandlers } from './handlers/chat';
import { registerSkipHandlers } from './handlers/skip';
import { registerReportHandlers } from './handlers/report';
import { registerDisconnectHandler } from './handlers/disconnect';

import type { Socket } from 'socket.io';

// io declared here so /stats route closure can reference it after startup
let io: Server;

// ---- Express App ----
const app = express();

// Security headers via Helmet
app.use(
  helmet({
    contentSecurityPolicy: false, // CSP handled by Next.js frontend
    crossOriginEmbedderPolicy: false,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
    },
  })
);

// CORS — strict origin
app.use(
  cors({
    origin: config.allowedOrigin,
    methods: ['GET', 'POST'],
    credentials: false,
  })
);

// HTTP rate limiting (for any REST endpoints)
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Health check endpoint
app.get('/health', (_, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Live stats endpoint — online user count
app.get('/stats', (_req, res) => {
  const online = io ? io.engine.clientsCount : 0;
  res.json({ online });
});


// ---- HTTP Server ----
const httpServer = createServer(app);

// ---- Socket.io Server ----
io = new Server(httpServer, {
  cors: {
    origin: config.allowedOrigin,
    methods: ['GET', 'POST'],
    credentials: false,
  },
  maxHttpBufferSize: config.payloadLimits.maxHttpBufferSize, // 50KB payload limit
  pingInterval: 25000,
  pingTimeout: 60000,
  connectionStateRecovery: {
    maxDisconnectionDuration: 2 * 60 * 1000, // 2 minutes
  },
});

// Redis adapter for horizontal scaling
io.adapter(createAdapter(redis, redisSub));

// ---- Socket.io Middleware Chain ----
// Order matters: throttle → auth → ban check

io.use(connectionThrottleMiddleware);

io.use(authMiddleware);

io.use(async (socket, next) => {
  await banCheckMiddleware(socket as Socket & { data: SocketData }, next);
});

// ---- Per-Event Rate Limiting Wrapper ----
function wrapWithRateLimit(
  socket: Socket & { data: SocketData },
  eventName: string,
  keyFn: () => string,
  limits: { max: number; windowSeconds: number },
  handler: (...args: unknown[]) => Promise<void> | void
) {
  socket.on(eventName, async (...args: unknown[]) => {
    const key = keyFn();
    const result = await checkRateLimit(key, limits);

    if (!result.allowed) {
      socket.emit('rate_limited', {
        action: eventName,
        retryAfter: result.retryAfter || Math.floor(Date.now() / 1000) + limits.windowSeconds,
      });

      const shouldBan = await trackRateLimitViolation(
        socket.data.userId,
        eventName,
        socket.data.ipHash
      );

      if (shouldBan) {
        socket.emit('banned', {
          until: new Date(Date.now() + config.autoban.softBanDurationSeconds * 1000).toISOString(),
        });
        socket.disconnect(true);
      }
      return;
    }

    try {
      await handler(...args);
    } catch (err) {
      logger.error({ err, event: 'handler_error', action: eventName, userId: socket.data.userId });
    }
  });
}

// ---- Connection Handler ----
io.on('connection', (rawSocket: Socket) => {
  const socket = rawSocket as Socket & { data: SocketData };

  logger.info({
    event: 'socket_connected',
    socketId: socket.id,
    userId: socket.data.userId,
    ipHash: socket.data.ipHash,
  });

  // Register all event handlers with rate limiting applied
  // The handlers themselves register socket.on(...) internally, but
  // we also need rate limiting on each event. We apply rate limiting
  // at the handler registration level.

  registerQueueHandlers(io, socket);
  registerWebRTCHandlers(io, socket);
  registerChatHandlers(io, socket);
  registerSkipHandlers(io, socket);
  registerReportHandlers(io, socket);
  registerDisconnectHandler(io, socket);
});

// ---- Export for matchmaking timeout callback ----
let ioInstance: Server | null = null;
export function getIO(): Server {
  if (!ioInstance) throw new Error('Socket.io not initialized');
  return ioInstance;
}

// ---- Start Server ----
httpServer.listen(config.port, () => {
  ioInstance = io;
  logger.info({
    event: 'server_started',
    port: config.port,
    allowedOrigin: config.allowedOrigin,
  });
});

// ---- Graceful Shutdown ----
async function shutdown(signal: string) {
  logger.info({ event: 'shutdown', signal });

  io.close();
  httpServer.close();
  await redis.quit();
  await redisSub.quit();

  process.exit(0);
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

process.on('unhandledRejection', (reason) => {
  logger.error({ event: 'unhandled_rejection', reason: String(reason) });
});

process.on('uncaughtException', (err) => {
  logger.fatal({ event: 'uncaught_exception', err: err.message });
  process.exit(1);
});
