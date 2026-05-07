// ============================================
// Match: Report Modal
// ============================================

'use client';

import { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { REPORT_REASONS, type ReportReason } from '@voxmeet/types';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (reason: ReportReason) => void;
}

const REASON_LABELS: Record<ReportReason, { label: string; desc: string }> = {
  HARASSMENT: { label: 'Harassment', desc: 'Aggressive, threatening or bullying behavior' },
  HATE_SPEECH: { label: 'Hate Speech', desc: 'Discriminatory language targeting identity groups' },
  EXPLICIT_CONTENT: { label: 'Explicit Content', desc: 'Sexual or graphic content' },
  SPAM: { label: 'Spam', desc: 'Advertising, bots, or repetitive content' },
  OTHER: { label: 'Other', desc: 'Something else that violates guidelines' },
};

export function ReportModal({ isOpen, onClose, onSubmit }: ReportModalProps) {
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!selectedReason) return;
    onSubmit(selectedReason);
    setSubmitted(true);
    setTimeout(() => {
      onClose();
      setSubmitted(false);
      setSelectedReason(null);
    }, 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Report User">
      {submitted ? (
        <div className="text-center py-8 space-y-3">
          <div className="w-16 h-16 mx-auto rounded-full bg-vox-success/20 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-vox-success">
              <polyline points="20,6 9,17 4,12" />
            </svg>
          </div>
          <p className="text-vox-text font-medium">Report submitted</p>
          <p className="text-sm text-vox-text-muted">Thank you. We'll review this shortly.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-vox-text-muted">
            Why are you reporting this user? Select a reason below.
          </p>

          <div className="space-y-2">
            {REPORT_REASONS.map((reason) => (
              <button
                key={reason}
                onClick={() => setSelectedReason(reason)}
                className={`w-full text-left p-3 rounded-xl border transition-all duration-200 ${
                  selectedReason === reason
                    ? 'border-vox-danger/50 bg-vox-danger/10'
                    : 'border-vox-border hover:border-vox-border/80 bg-vox-surface'
                }`}
                id={`report-reason-${reason.toLowerCase()}`}
              >
                <div className="text-sm font-medium text-vox-text">
                  {REASON_LABELS[reason].label}
                </div>
                <div className="text-xs text-vox-text-muted mt-0.5">
                  {REASON_LABELS[reason].desc}
                </div>
              </button>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="secondary" onClick={onClose} className="flex-1" size="sm">
              Cancel
            </Button>
            <Button
              variant="danger"
              onClick={handleSubmit}
              disabled={!selectedReason}
              className="flex-1"
              size="sm"
              id="report-submit-btn"
            >
              Submit Report
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
