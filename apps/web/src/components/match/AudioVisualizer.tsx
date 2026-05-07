// ============================================
// Match: Audio Visualizer
// ============================================

'use client';

interface AudioVisualizerProps {
  bars: number[];
  isActive: boolean;
  label?: string;
}

export function AudioVisualizer({ bars, isActive, label }: AudioVisualizerProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      {label && (
        <span className="text-xs font-medium text-vox-text-muted uppercase tracking-wider">
          {label}
        </span>
      )}
      <div className="flex items-end justify-center gap-[2px] h-20 px-4">
        {bars.slice(0, 24).map((value, i) => {
          const height = Math.max(4, value * 80);
          const hue = 260 + (i / 24) * 60; // purple to blue gradient
          const saturation = isActive ? 70 : 20;
          const lightness = isActive ? 60 : 30;

          return (
            <div
              key={i}
              className="w-[3px] rounded-full transition-all duration-75 ease-out"
              style={{
                height: `${height}px`,
                backgroundColor: `hsl(${hue}, ${saturation}%, ${lightness}%)`,
                opacity: isActive ? 0.9 : 0.3,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
