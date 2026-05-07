// ============================================
// Pino Structured Logger — Never logs raw IPs
// ============================================

import pino from 'pino';
import { config } from './config';

export const logger = pino({
  level: config.logLevel,
  transport:
    process.env.NODE_ENV === 'development'
      ? { target: 'pino-pretty', options: { colorize: true } }
      : undefined,
  serializers: {
    // Prevent accidental IP logging
    req: (req) => ({
      method: req.method,
      url: req.url,
    }),
  },
  // Redact any fields that might contain sensitive data
  redact: {
    paths: ['ip', 'rawIp', 'remoteAddress', 'req.headers.cookie', 'req.headers.authorization'],
    censor: '[REDACTED]',
  },
});
