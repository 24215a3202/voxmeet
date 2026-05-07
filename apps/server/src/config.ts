// ============================================
// Server Configuration — Fail-fast on missing env vars
// ============================================

import dotenv from 'dotenv';
dotenv.config();

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string, defaultValue: string): string {
  return process.env[name] || defaultValue;
}

export const config = {
  port: parseInt(optionalEnv('PORT', '3001'), 10),
  redisUrl: requireEnv('REDIS_URL'),
  databaseUrl: requireEnv('DATABASE_URL'),
  adminSecret: requireEnv('ADMIN_SECRET'),
  adminJwtSecret: requireEnv('ADMIN_JWT_SECRET'),
  allowedOrigin: requireEnv('ALLOWED_ORIGIN'),
  turn: {
    url: optionalEnv('TURN_URL', ''),
    username: optionalEnv('TURN_USERNAME', ''),
    credential: optionalEnv('TURN_CREDENTIAL', ''),
    restApiKey: optionalEnv('TURN_REST_API_KEY', ''),
  },
  ipHashSalt: requireEnv('IP_HASH_SALT'),
  logLevel: optionalEnv('LOG_LEVEL', 'info') as 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace',

  // Rate limiting thresholds
  rateLimits: {
    socketConnect: { max: 10, windowSeconds: 60 },           // 10 connections / IP / minute
    queueJoin: { max: 30, windowSeconds: 3600 },             // 30 joins / userId / hour
    chatMessage: { max: 5, windowSeconds: 1 },               // 5 messages / second / userId
    reportSubmit: { max: 3, windowSeconds: 3600 },            // 3 reports / userId / hour
    skip: { max: 20, windowSeconds: 3600 },                   // 20 skips / userId / hour
    adminLogin: { max: 5, windowSeconds: 900 },               // 5 attempts / IP / 15 min
    webrtcSignal: { max: 50, windowSeconds: 60 },             // 50 events / session / minute
  },

  // Auto-ban thresholds
  autoban: {
    rateLimitViolations: { count: 3, windowSeconds: 3600 },   // 3 violations in 1 hour
    softBanReports: { count: 3, windowSeconds: 86400 },       // 3 reports in 24 hours
    hardBanReports: 10,                                        // 10 total reports
    softBanDurationSeconds: 86400,                            // 24 hours
  },

  // Session config
  session: {
    ttlSeconds: 14400, // 4 hours
  },

  // Queue config
  queue: {
    maxSize: 10000,
    resumeSize: 8000,
    matchTimeoutMs: 10000, // 10 seconds before fallback to random
  },

  // Payload limits
  payloadLimits: {
    maxHttpBufferSize: 50 * 1024,  // 50KB
    sdpMaxSize: 20 * 1024,         // 20KB
    iceMaxSize: 2 * 1024,          // 2KB
    chatMaxLength: 500,
    maxConcurrentSocketsPerIp: 5,
    connectionThrottleBlock: 600,  // 10 minutes in seconds
  },
} as const;
