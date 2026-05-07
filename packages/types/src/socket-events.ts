// ============================================
// Socket.io Event Types
// ============================================

import type { InterestTag } from './interests';

// --- Client → Server Events ---

export interface ClientToServerEvents {
  'queue:join': (payload: QueueJoinPayload) => void;
  'queue:leave': (payload: QueueLeavePayload) => void;
  'skip': (payload: SkipPayload) => void;
  'webrtc:offer': (payload: WebRTCOfferPayload) => void;
  'webrtc:answer': (payload: WebRTCAnswerPayload) => void;
  'webrtc:ice': (payload: WebRTCIcePayload) => void;
  'chat:message': (payload: ChatMessagePayload) => void;
  'report:submit': (payload: ReportSubmitPayload) => void;
}

// --- Server → Client Events ---

export interface ServerToClientEvents {
  'match:found': (payload: MatchFoundPayload) => void;
  'match:failed': (payload: MatchFailedPayload) => void;
  'webrtc:offer': (payload: { offer: string }) => void;
  'webrtc:answer': (payload: { answer: string }) => void;
  'webrtc:ice': (payload: { candidate: string }) => void;
  'chat:message': (payload: { text: string; timestamp: number }) => void;
  'partner:skipped': (payload: Record<string, never>) => void;
  'partner:left': (payload: Record<string, never>) => void;
  'banned': (payload: BannedPayload) => void;
  'rate_limited': (payload: RateLimitedPayload) => void;
  'turn:credentials': (payload: TurnCredentials) => void;
}

// --- Payload Types ---

export interface QueueJoinPayload {
  userId: string;
  interests: InterestTag[];
}

export interface QueueLeavePayload {
  userId: string;
}

export interface SkipPayload {
  sessionId: string;
}

export interface WebRTCOfferPayload {
  sessionId: string;
  offer: string;
}

export interface WebRTCAnswerPayload {
  sessionId: string;
  answer: string;
}

export interface WebRTCIcePayload {
  sessionId: string;
  candidate: string;
}

export interface ChatMessagePayload {
  sessionId: string;
  text: string;
}

export interface ReportSubmitPayload {
  sessionId: string;
  reportedId: string;
  reason: ReportReason;
}

export interface MatchFoundPayload {
  sessionId: string;
  isInitiator: boolean;
  partnerInterests: InterestTag[];
  turnCredentials: TurnCredentials;
}

export interface MatchFailedPayload {
  reason: 'no_match' | 'server_at_capacity' | 'error';
}

export interface BannedPayload {
  until?: string; // ISO date string for soft bans
}

export interface RateLimitedPayload {
  action: string;
  retryAfter: number; // Unix timestamp
}

export interface TurnCredentials {
  urls: string[];
  username: string;
  credential: string;
  ttl: number;
}

// --- Enums ---

export type ReportReason =
  | 'HARASSMENT'
  | 'HATE_SPEECH'
  | 'EXPLICIT_CONTENT'
  | 'SPAM'
  | 'OTHER';

export const REPORT_REASONS: ReportReason[] = [
  'HARASSMENT',
  'HATE_SPEECH',
  'EXPLICIT_CONTENT',
  'SPAM',
  'OTHER',
];

export type BanType = 'SOFT' | 'HARD';
