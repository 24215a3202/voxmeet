// ============================================
// Constants — Interest Tags & Limits
// ============================================

export { INTEREST_TAGS, MAX_INTERESTS, MIN_INTERESTS } from '@voxmeet/types';

export const CHAT_MAX_LENGTH = 500;

export const STATUS = {
  IDLE: 'idle',
  CONNECTING: 'connecting',
  SEARCHING: 'searching',
  MATCHED: 'matched',
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
} as const;

export type ConnectionStatus = (typeof STATUS)[keyof typeof STATUS];
