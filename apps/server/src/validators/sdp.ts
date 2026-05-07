// ============================================
// Validator: SDP & ICE Candidate Payloads
// ============================================

import { config } from '../config';

/**
 * Validates an SDP offer or answer string.
 * - Must be a string
 * - Must not exceed 20KB
 * - Must contain basic SDP structure markers
 */
export function validateSDP(sdp: unknown): { valid: boolean; error?: string } {
  if (typeof sdp !== 'string') {
    return { valid: false, error: 'SDP must be a string' };
  }

  // Size limit
  if (Buffer.byteLength(sdp, 'utf-8') > config.payloadLimits.sdpMaxSize) {
    return { valid: false, error: 'SDP payload exceeds maximum size (20KB)' };
  }

  // Basic SDP structure validation — must contain version and origin lines
  // SDP always starts with v= and contains o= and s= lines
  const hasVersion = sdp.includes('v=');
  const hasOrigin = sdp.includes('o=');
  const hasSession = sdp.includes('s=');
  const hasMedia = sdp.includes('m=');

  if (!hasVersion || !hasOrigin || !hasSession) {
    return { valid: false, error: 'Invalid SDP format — missing required fields' };
  }

  // For audio-only, should contain audio media line
  if (!hasMedia) {
    return { valid: false, error: 'SDP must contain at least one media description' };
  }

  return { valid: true };
}

/**
 * Validates an ICE candidate string.
 * - Must be a string
 * - Must not exceed 2KB
 * - Must have basic ICE candidate structure
 */
export function validateICE(candidate: unknown): { valid: boolean; error?: string } {
  if (typeof candidate !== 'string') {
    return { valid: false, error: 'ICE candidate must be a string' };
  }

  // Size limit
  if (Buffer.byteLength(candidate, 'utf-8') > config.payloadLimits.iceMaxSize) {
    return { valid: false, error: 'ICE candidate exceeds maximum size (2KB)' };
  }

  // Empty candidate is valid (end-of-candidates signal)
  if (candidate.trim() === '') {
    return { valid: true };
  }

  // Basic ICE candidate structure: should start with "candidate:" or "a=candidate:"
  const trimmed = candidate.trim();
  if (!trimmed.startsWith('candidate:') && !trimmed.startsWith('a=candidate:')) {
    // Could also be a JSON-serialized RTCIceCandidate object
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.candidate !== undefined) {
        return { valid: true };
      }
    } catch {
      // Not JSON either
    }
    return { valid: false, error: 'Invalid ICE candidate format' };
  }

  return { valid: true };
}
