// ============================================
// Validator: UUID v4 Format
// ============================================

// Strict UUID v4 regex — version nibble must be 4, variant must be 8/9/a/b
const UUID_V4_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidUUID(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  return UUID_V4_REGEX.test(value);
}
