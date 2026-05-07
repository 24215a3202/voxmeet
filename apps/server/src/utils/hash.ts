// ============================================
// Cryptographic Utilities — IP Hashing & Session IDs
// ============================================

import crypto from 'crypto';
import { config } from '../config';

/**
 * Hash an IP address with SHA-256 + secret salt.
 * Never store or log raw IPs.
 */
export function hashIp(ip: string): string {
  return crypto
    .createHmac('sha256', config.ipHashSalt)
    .update(ip)
    .digest('hex');
}

/**
 * Generate a cryptographically secure session ID.
 * 32 random bytes = 64 hex characters.
 */
export function generateSessionId(): string {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Get the last 8 characters of a hash for safe display in admin UI.
 */
export function truncateHash(hash: string): string {
  return hash.slice(-8);
}
