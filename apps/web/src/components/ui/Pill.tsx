// ============================================
// UI: Pill (Interest Tag)
// ============================================

'use client';

interface PillProps {
  label: string;
  isActive?: boolean;
  onClick?: () => void;
  removable?: boolean;
  onRemove?: () => void;
  disabled?: boolean;
}

export function Pill({ label, isActive, onClick, removable, onRemove, disabled }: PillProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`
        ${isActive ? 'pill-active' : 'pill-default'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        inline-flex items-center gap-1.5
      `}
      id={`pill-${label}`}
    >
      <span className="capitalize">{label}</span>
      {removable && isActive && (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onRemove?.();
          }}
          className="ml-1 w-4 h-4 rounded-full flex items-center justify-center hover:bg-vox-primary/30 transition-colors"
        >
          ×
        </span>
      )}
    </button>
  );
}
