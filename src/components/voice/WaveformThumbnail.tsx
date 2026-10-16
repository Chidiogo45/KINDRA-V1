import React, { useState, useRef, useMemo } from 'react';

interface WaveformThumbnailProps {
  segmentId: string;
  durationSeconds: number;
  progressPercent: number; // 0 to 100
  isPlaying: boolean;
  onSeek?: (percent: number) => void;
  height?: number;
  barCount?: number;
  interactive?: boolean;
}

export const WaveformThumbnail: React.FC<WaveformThumbnailProps> = ({
  segmentId,
  durationSeconds,
  progressPercent,
  isPlaying,
  onSeek,
  height = 44,
  barCount = 48,
  interactive = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPercent, setHoverPercent] = useState<number | null>(null);

  // Deterministically generate organic documentary narration waveform bars
  const bars = useMemo(() => {
    // Generate pseudorandom seed from segmentId
    let hash = 0;
    for (let i = 0; i < segmentId.length; i++) {
      hash = (hash << 5) - hash + segmentId.charCodeAt(i);
      hash |= 0;
    }

    const pseudoRandom = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    return Array.from({ length: barCount }, (_, i) => {
      const baseSeed = Math.abs(hash) + i * 1.618;
      // Speech waveform pattern: bursts of words, pauses (valleys), peaks on emphasized consonants
      const cadence = Math.sin(i * 0.35) * 0.35 + Math.sin(i * 0.85) * 0.25;
      const noise = pseudoRandom(baseSeed) * 0.4;
      const raw = Math.abs(cadence + noise);
      // Ensure audible min height and capped peak
      return Math.max(0.18, Math.min(1.0, raw));
    });
  }, [segmentId, barCount]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    setHoverPercent((x / rect.width) * 100);
  };

  const handleMouseLeave = () => {
    setHoverPercent(null);
  };

  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !containerRef.current || !onSeek) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    onSeek(percent);
  };

  const formatHoverTime = (percent: number) => {
    const secs = (percent / 100) * durationSeconds;
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      className={`relative w-full rounded-md bg-[#0a0f18] px-2 py-1 flex items-center select-none ${
        interactive ? 'cursor-pointer group' : ''
      }`}
      style={{ height: `${height}px` }}
      role={interactive ? 'slider' : undefined}
      aria-label="Audio waveform progress"
      aria-valuenow={Math.round(progressPercent)}
    >
      {/* Waveform Bars Container */}
      <div className="flex items-center justify-between w-full h-full gap-[2px]">
        {bars.map((bar, idx) => {
          const barPercent = (idx / (barCount - 1)) * 100;
          const isPast = barPercent <= progressPercent;
          const isUnderHover = hoverPercent !== null && barPercent <= hoverPercent;

          // Dynamic subtle pulsation when playing
          const dynamicHeight = isPlaying && isPast ? Math.min(100, bar * 100 + (idx % 3 === 0 ? 10 : 0)) : bar * 100;

          return (
            <div
              key={idx}
              className="flex-1 rounded-[1px] transition-all duration-75"
              style={{
                height: `${Math.max(12, Math.round(dynamicHeight))}%`,
                backgroundColor: isPast
                  ? '#f59e0b'
                  : isUnderHover
                  ? '#78716c'
                  : '#293548',
                opacity: isPast ? 1 : isUnderHover ? 0.75 : 0.45,
              }}
            />
          );
        })}
      </div>

      {/* Playhead Cursor Line */}
      <div
        className="absolute top-0 bottom-0 w-[2px] bg-amber-400 pointer-events-none transition-all duration-75 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
        style={{ left: `${Math.min(99.5, Math.max(0.5, progressPercent))}%` }}
      />

      {/* Hover Scrubber Line and Tooltip */}
      {interactive && hoverPercent !== null && (
        <>
          <div
            className="absolute top-0 bottom-0 w-[1px] bg-stone-300/80 pointer-events-none"
            style={{ left: `${hoverPercent}%` }}
          />
          <div
            className="absolute -top-6 px-1.5 py-0.5 rounded bg-stone-900 border border-stone-700 text-[10px] font-mono text-stone-200 pointer-events-none transform -translate-x-1/2 shadow-lg"
            style={{ left: `${hoverPercent}%` }}
          >
            {formatHoverTime(hoverPercent)}
          </div>
        </>
      )}
    </div>
  );
};
