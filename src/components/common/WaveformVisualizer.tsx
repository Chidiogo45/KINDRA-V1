import React, { useEffect, useRef } from 'react';

interface WaveformVisualizerProps {
  isPlaying: boolean;
  progressPercent: number; // 0 to 100
  barCount?: number;
  height?: number;
}

export const WaveformVisualizer: React.FC<WaveformVisualizerProps> = ({
  isPlaying,
  progressPercent,
  barCount = 36,
  height = 36,
}) => {
  const bars = Array.from({ length: barCount }, (_, i) => {
    // Generate organic pseudo-waveform shape
    const seed = Math.sin(i * 0.4) * 0.4 + Math.sin(i * 1.2) * 0.3 + 0.5;
    return Math.max(0.15, Math.min(1.0, seed));
  });

  return (
    <div className="flex items-center gap-[2px] h-[36px] w-full" style={{ height: `${height}px` }}>
      {bars.map((barHeight, idx) => {
        const barPercent = (idx / barCount) * 100;
        const isPast = barPercent <= progressPercent;

        return (
          <div
            key={idx}
            className="flex-1 rounded-sm transition-all duration-75"
            style={{
              height: `${Math.round(barHeight * (isPlaying ? 85 + Math.random() * 15 : 85))}%`,
              backgroundColor: isPast ? '#f59e0b' : '#334155',
              opacity: isPast ? 1 : 0.45,
            }}
          />
        );
      })}
    </div>
  );
};
