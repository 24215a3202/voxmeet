// ============================================
// Match: Status Bar
// ============================================

'use client';

import { Spinner } from '@/components/ui/Spinner';
import type { ConnectionStatus } from '@/lib/constants';

interface StatusBarProps {
  status: ConnectionStatus;
  isAudioConnected: boolean;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; pulse: boolean }> = {
  idle: { label: 'Ready', color: 'bg-vox-text-dim', pulse: false },
  connecting: { label: 'Connecting to server…', color: 'bg-vox-warning', pulse: true },
  searching: { label: 'Finding someone to talk to…', color: 'bg-vox-warning', pulse: true },
  matched: { label: 'Matched! Setting up audio…', color: 'bg-vox-secondary', pulse: true },
  connected: { label: 'Connected — Talk away!', color: 'bg-vox-success', pulse: false },
  disconnected: { label: 'Disconnected', color: 'bg-vox-danger', pulse: false },
};

export function StatusBar({ status, isAudioConnected }: StatusBarProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.idle;

  return (
    <div className="glass px-5 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className={`status-dot ${config.color}`} />
          {config.pulse && (
            <div className={`absolute inset-0 status-dot ${config.color} animate-ping`} />
          )}
        </div>
        <span className="text-sm font-medium text-vox-text">{config.label}</span>
      </div>

      {(status === 'searching' || status === 'connecting') && (
        <Spinner size="sm" />
      )}

      {status === 'connected' && isAudioConnected && (
        <div className="flex items-center gap-1.5 text-vox-success">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
            <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          </svg>
          <span className="text-xs font-medium">Audio P2P</span>
        </div>
      )}
    </div>
  );
}
