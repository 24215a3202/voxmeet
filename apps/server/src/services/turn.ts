// ============================================
// Service: TURN Credential Generation
// Time-limited credentials via TURN REST API
// ============================================

import crypto from 'crypto';
import { config } from '../config';

/**
 * Generate time-limited TURN credentials using the TURN REST API scheme.
 * This implements the long-term credential mechanism defined in
 * draft-uberti-behave-turn-rest-00.
 *
 * The username is: `ttl_expiry_timestamp:random_id`
 * The credential is: HMAC-SHA1(shared_secret, username)
 */
export function generateTurnCredentials(ttlSeconds: number = 300): {
  urls: string[];
  username: string;
  credential: string;
  ttl: number;
} {
  if (!config.turn.url) {
    // Return empty credentials if TURN is not configured
    return {
      urls: [],
      username: '',
      credential: '',
      ttl: 0,
    };
  }

  const unixTimestamp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const username = `${unixTimestamp}:voxmeet`;

  // If we have a REST API key, use it for HMAC
  // Otherwise fall back to static credentials
  if (config.turn.restApiKey) {
    const credential = crypto
      .createHmac('sha1', config.turn.restApiKey)
      .update(username)
      .digest('base64');

    return {
      urls: [config.turn.url, config.turn.url.replace('turn:', 'turns:')],
      username,
      credential,
      ttl: ttlSeconds,
    };
  }

  // Fallback: static credentials from env
  return {
    urls: [config.turn.url],
    username: config.turn.username,
    credential: config.turn.credential,
    ttl: ttlSeconds,
  };
}
