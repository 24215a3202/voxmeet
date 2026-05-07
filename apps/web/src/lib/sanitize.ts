// ============================================
// DOMPurify Wrapper for Client-Side Sanitization
// ============================================

'use client';

import DOMPurify from 'dompurify';

export function sanitizeText(text: string): string {
  if (typeof window === 'undefined') return text;
  return DOMPurify.sanitize(text, {
    ALLOWED_TAGS: [],
    ALLOWED_ATTR: [],
  });
}
