// ============================================
// Service: Report Processing
// ============================================

import { prisma } from '../prisma';
import { logger } from '../logger';
import type { ReportData } from '@voxmeet/types';
import { REPORT_REASONS, type ReportReason } from '@voxmeet/types';

/**
 * Create a new report in the database.
 */
export async function createReport(data: ReportData): Promise<string> {
  // Validate reason is a valid enum value
  if (!REPORT_REASONS.includes(data.reason as ReportReason)) {
    throw new Error('Invalid report reason');
  }

  const report = await prisma.report.create({
    data: {
      sessionId: data.sessionId,
      reporterId: data.reporterId,
      reportedId: data.reportedId,
      reason: data.reason as any,
      ipHash: data.ipHash,
    },
  });

  logger.info({
    event: 'report_created',
    reportId: report.id,
    reportedId: data.reportedId,
    reason: data.reason,
    timestamp: Date.now(),
  });

  return report.id;
}

/**
 * Get paginated reports for admin view.
 */
export async function getReports(page: number = 1, pageSize: number = 20) {
  const skip = (page - 1) * pageSize;

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      orderBy: { createdAt: 'desc' },
      skip,
      take: pageSize,
    }),
    prisma.report.count(),
  ]);

  return {
    reports,
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

/**
 * Get report count for a specific user.
 */
export async function getReportCount(reportedId: string): Promise<number> {
  return prisma.report.count({ where: { reportedId } });
}
