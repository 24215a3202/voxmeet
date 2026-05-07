// ============================================
// Validator: Chat Message Sanitization
// ============================================

import sanitizeHtml from 'sanitize-html';
import { config } from '../config';

// Regex to detect messages that are purely URLs
const URL_ONLY_REGEX = /^(https?:\/\/|ftp:\/\/|www\.)[^\s]+$/i;

// Null bytes, invisible chars, and Unicode direction overrides
const DANGEROUS_CHARS_REGEX = /[\x00\u200B\u200C\u200D\u200E\u200F\u202A-\u202E\u2060\u2061\u2062\u2063\u2064\uFEFF\uFFF9\uFFFA\uFFFB]/g;

export function validateMessage(text: unknown): { valid: boolean; sanitized: string; error?: string } {
  if (typeof text !== 'string') {
    return { valid: false, sanitized: '', error: 'Message must be a string' };
  }

  // Check length before any processing
  if (text.length > config.payloadLimits.chatMaxLength) {
    return { valid: false, sanitized: '', error: `Message exceeds ${config.payloadLimits.chatMaxLength} characters` };
  }

  if (text.trim().length === 0) {
    return { valid: false, sanitized: '', error: 'Message cannot be empty' };
  }

  // Strip dangerous characters
  let cleaned = text.replace(DANGEROUS_CHARS_REGEX, '');

  // Strip all HTML
  cleaned = sanitizeHtml(cleaned, {
    allowedTags: [],
    allowedAttributes: {},
    disallowedTagsMode: 'recursiveEscape',
  });

  // Block pure URL messages (anti-phishing)
  if (URL_ONLY_REGEX.test(cleaned.trim())) {
    return { valid: false, sanitized: '', error: 'Messages cannot be pure URLs' };
  }

  // Final trim
  cleaned = cleaned.trim();

  if (cleaned.length === 0) {
    return { valid: false, sanitized: '', error: 'Message was empty after sanitization' };
  }

  return { valid: true, sanitized: cleaned };
}
