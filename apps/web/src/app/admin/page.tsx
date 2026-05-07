'use client';

// ============================================
// Admin Dashboard
// ============================================

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface Report {
  id: string;
  sessionId: string;
  reporterId: string;
  reportedId: string;
  reason: string;
  ipHash: string;
  createdAt: string;
}

interface AuditLogEntry {
  id: string;
  action: string;
  actorId: string;
  targetId: string | null;
  metadata: any;
  createdAt: string;
}

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'reports' | 'audit'>('reports');
  const [reports, setReports] = useState<Report[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const getToken = () => sessionStorage.getItem('admin_token');

  const fetchReports = useCallback(async (pageNum: number) => {
    const token = getToken();
    if (!token) {
      router.push('/admin/login');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/reports?page=${pageNum}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      setReports(data.reports);
      setTotalPages(data.totalPages);
    } catch {
      setError('Failed to fetch reports');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  const fetchAuditLogs = useCallback(async (pageNum: number) => {
    const token = getToken();
    if (!token) {
      router.push('/admin/login');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/audit?page=${pageNum}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.status === 401) {
        router.push('/admin/login');
        return;
      }

      const data = await res.json();
      setAuditLogs(data.logs);
      setTotalPages(data.totalPages);
    } catch {
      setError('Failed to fetch audit logs');
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    if (activeTab === 'reports') {
      fetchReports(page);
    } else {
      fetchAuditLogs(page);
    }
  }, [activeTab, page, fetchReports, fetchAuditLogs]);

  const handleBan = async (reportedId: string, type: 'SOFT' | 'HARD') => {
    const token = getToken();
    if (!token) return;

    try {
      const res = await fetch('/api/admin/bans', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ userId: reportedId, type }),
      });

      if (res.ok) {
        fetchReports(page);
      }
    } catch {
      setError('Failed to issue ban');
    }
  };

  const handleDismiss = async (reportId: string) => {
    // For now, just remove from UI — in production, you'd have a dismiss endpoint
    setReports((prev) => prev.filter((r) => r.id !== reportId));
  };

  const truncateId = (id: string) => id.slice(0, 8) + '…';
  const truncateHash = (hash: string) => '…' + hash.slice(-8);

  return (
    <main className="min-h-screen bg-vox-bg p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-display font-bold gradient-text">Admin Dashboard</h1>
            <p className="text-sm text-vox-text-muted mt-1">Manage reports and bans</p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              sessionStorage.removeItem('admin_token');
              router.push('/admin/login');
            }}
            id="admin-logout-btn"
          >
            Logout
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-vox-surface rounded-xl w-fit">
          {(['reports', 'audit'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => { setActiveTab(tab); setPage(1); }}
              className={`px-6 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-vox-primary text-white shadow-sm'
                  : 'text-vox-text-muted hover:text-vox-text'
              }`}
              id={`tab-${tab}`}
            >
              {tab === 'reports' ? 'Reports' : 'Audit Log'}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : error ? (
          <div className="text-center py-16 text-vox-danger">{error}</div>
        ) : activeTab === 'reports' ? (
          <div className="glass-strong overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-vox-border">
                    <th className="text-left text-xs font-medium text-vox-text-muted uppercase tracking-wider px-4 py-3">Reporter</th>
                    <th className="text-left text-xs font-medium text-vox-text-muted uppercase tracking-wider px-4 py-3">Reported</th>
                    <th className="text-left text-xs font-medium text-vox-text-muted uppercase tracking-wider px-4 py-3">Reason</th>
                    <th className="text-left text-xs font-medium text-vox-text-muted uppercase tracking-wider px-4 py-3">IP Hash</th>
                    <th className="text-left text-xs font-medium text-vox-text-muted uppercase tracking-wider px-4 py-3">Date</th>
                    <th className="text-left text-xs font-medium text-vox-text-muted uppercase tracking-wider px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => (
                    <tr key={report.id} className="border-b border-vox-border/50 hover:bg-vox-surface/50 transition-colors">
                      <td className="px-4 py-3 text-sm text-vox-text font-mono">{truncateId(report.reporterId)}</td>
                      <td className="px-4 py-3 text-sm text-vox-text font-mono">{truncateId(report.reportedId)}</td>
                      <td className="px-4 py-3">
                        <span className="pill text-xs bg-vox-danger/10 text-vox-danger border border-vox-danger/20">
                          {report.reason}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-vox-text-muted font-mono">{truncateHash(report.ipHash)}</td>
                      <td className="px-4 py-3 text-sm text-vox-text-muted">
                        {new Date(report.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleBan(report.reportedId, 'SOFT')}
                            className="text-xs px-3 py-1 rounded-lg bg-vox-warning/10 text-vox-warning border border-vox-warning/20 hover:bg-vox-warning/20 transition-all"
                            id={`soft-ban-${report.id}`}
                          >
                            Soft Ban
                          </button>
                          <button
                            onClick={() => handleBan(report.reportedId, 'HARD')}
                            className="text-xs px-3 py-1 rounded-lg bg-vox-danger/10 text-vox-danger border border-vox-danger/20 hover:bg-vox-danger/20 transition-all"
                            id={`hard-ban-${report.id}`}
                          >
                            Hard Ban
                          </button>
                          <button
                            onClick={() => handleDismiss(report.id)}
                            className="text-xs px-3 py-1 rounded-lg bg-vox-surface text-vox-text-muted border border-vox-border hover:bg-vox-card transition-all"
                            id={`dismiss-${report.id}`}
                          >
                            Dismiss
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {reports.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-vox-text-muted">
                        No reports found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="glass-strong overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-vox-border">
                    <th className="text-left text-xs font-medium text-vox-text-muted uppercase tracking-wider px-4 py-3">Action</th>
                    <th className="text-left text-xs font-medium text-vox-text-muted uppercase tracking-wider px-4 py-3">Actor</th>
                    <th className="text-left text-xs font-medium text-vox-text-muted uppercase tracking-wider px-4 py-3">Target</th>
                    <th className="text-left text-xs font-medium text-vox-text-muted uppercase tracking-wider px-4 py-3">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="border-b border-vox-border/50 hover:bg-vox-surface/50 transition-colors">
                      <td className="px-4 py-3">
                        <span className="pill text-xs bg-vox-primary/10 text-vox-primary border border-vox-primary/20">
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-vox-text font-mono">{truncateId(log.actorId)}</td>
                      <td className="px-4 py-3 text-sm text-vox-text-muted font-mono">{log.targetId ? truncateId(log.targetId) : '—'}</td>
                      <td className="px-4 py-3 text-sm text-vox-text-muted">
                        {new Date(log.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  {auditLogs.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-vox-text-muted">
                        No audit log entries.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <span className="flex items-center px-4 text-sm text-vox-text-muted">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}
