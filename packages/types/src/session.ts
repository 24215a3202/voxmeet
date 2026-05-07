// ============================================
// Session Data Types
// ============================================

import type { InterestTag } from './interests';

export interface SessionData {
  userA: string;
  userB: string;
  socketA: string;
  socketB: string;
  interestsA: InterestTag[];
  interestsB: InterestTag[];
  startedAt: number; // Unix timestamp
}

export interface QueueEntry {
  userId: string;
  socketId: string;
  interests: InterestTag[];
  joinedAt: number;
  ipHash: string;
  fingerprintHash: string;
}
