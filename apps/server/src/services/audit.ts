// ============================================
// Service: Audit Logging
// ============================================

import { prisma } from '../prisma';
import { logger } from '../logger';
import type { AuditLogData } from '@voxmeet/types';

/**
 * Create an audit log entry.
 * Every admin action must go through this.
 */
export async function createAuditLog(data: AuditLogData): Promise<void> {
  await prisma.auditLog.create({
    data: {
      action: data.action,
      actorId: data.actorId,
      targetId: data.targetId,
      metadata: data.metadata as any,
    },
  });

  logger.info({
    event: 'admin_action',
    action: data.action,
    actorId: data.actorId,
    targetId: data.targetId,
    timestamp: Date.now(),
  });
}

/**
 * Get paginated audit logs for admin view.
 */
export async function getAuditLogs(page: number = 1, pageSize: number = 50) {
  const skip = (page - 1) * pageSize;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.auditLog.count(),
  ]);

  return {
    logs,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}
