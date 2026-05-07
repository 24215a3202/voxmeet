// ============================================
// Report & Ban Types
// ============================================

export interface ReportData {
  sessionId: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  ipHash: string;
}

export interface BanData {
  userId: string;
  ipHash?: string;
  fingerprintHash?: string;
  type: 'SOFT' | 'HARD';
  expiresAt?: Date;
}

export interface AuditLogData {
  action: string;
  actorId: string;
  targetId?: string;
  metadata?: Record<string, unknown>;
}

// Audit log action constants
export const AUDIT_ACTIONS = {
  BAN_ISSUED: 'BAN_ISSUED',
  BAN_LIFTED: 'BAN_LIFTED',
  REPORT_DISMISSED: 'REPORT_DISMISSED',
  ADMIN_LOGIN: 'ADMIN_LOGIN',
  AUTO_BAN_SOFT: 'AUTO_BAN_SOFT',
  AUTO_BAN_HARD: 'AUTO_BAN_HARD',
  RATE_LIMIT_BAN: 'RATE_LIMIT_BAN',
} as const;
