// ============================================
// Validator: Interest Tags
// ============================================

import { INTEREST_TAGS, MAX_INTERESTS, MIN_INTERESTS, type InterestTag } from '@voxmeet/types';

export function validateInterests(interests: unknown): { valid: boolean; sanitized: InterestTag[]; error?: string } {
  if (!Array.isArray(interests)) {
    return { valid: false, sanitized: [], error: 'Interests must be an array' };
  }

  if (interests.length < MIN_INTERESTS || interests.length > MAX_INTERESTS) {
    return { valid: false, sanitized: [], error: `Interests must have ${MIN_INTERESTS}-${MAX_INTERESTS} items` };
  }

  const sanitized: InterestTag[] = [];

  for (const item of interests) {
    if (typeof item !== 'string') {
      return { valid: false, sanitized: [], error: 'Each interest must be a string' };
    }

    const lower = item.toLowerCase().trim();

    if (!INTEREST_TAGS.includes(lower as InterestTag)) {
      return { valid: false, sanitized: [], error: `Invalid interest tag: ${item}` };
    }

    sanitized.push(lower as InterestTag);
  }

  // Check for duplicates
  if (new Set(sanitized).size !== sanitized.length) {
    return { valid: false, sanitized: [], error: 'Duplicate interests not allowed' };
  }

  return { valid: true, sanitized };
}
