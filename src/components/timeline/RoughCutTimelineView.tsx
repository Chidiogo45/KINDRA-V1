import React, { useState, useEffect, useRef } from 'react';
import {
  Film,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize2,
  Download,
  ArrowRight,
  Clock,
  Layers,
  Image as ImageIcon,
  Shield,
} from 'lucide-react';
import { VisualCue, VisualAsset, VoiceSegment, DocumentaryProject } from '../../types';

interface RoughCutTimelineViewProps {
  project: DocumentaryProject;
  visualCues: VisualCue[];
  visualAssets: VisualAsset[];
  voiceSegments: VoiceSegment[];
  onNextStage: () => void;
}

export const RoughCutTimelineView: React.FC<RoughCutTimelineViewProps> = ({
  project,
  visualCues,
  visualAssets,
  voiceSegments,
  onNextStage,
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const totalDuration = Math.max(
    visualCues[visualCues.length - 1]?.timestampEnd || 0,
    voiceSegments.reduce((acc, s) => acc + (s.durationSeconds || 0), 0),
    60
  );

  const audioRefs = useRef<{ [key: string]: HTMLAudioElement }>({});
  const animationFrameRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(Date.now());

  // Find active cue and asset based on currentTime
  const currentCue =
    visualCues.find((c) => currentTime >= c.timestampStart && currentTime < c.timestampEnd) ||
    visualCues[visualCues.length - 1] ||
    visualCues[0];

  const currentAsset =
    visualAssets.find((a) => a.id === currentCue?.selectedAssetId) ||
    visualAssets.find((a) => a.cueId === currentCue?.id) ||
    visualAssets[0];

  const currentVoiceSegment =
    voiceSegments.find((_, idx) => {
      const segStart = voiceSegments.slice(0, idx).reduce((a, s) => a + s.durationSeconds, 0);
      const segEnd = segStart + voiceSegments[idx].durationSeconds;
      return currentTime >= segStart && currentTime < segEnd;
    }) || voiceSegments[0];

  // Playback timer loop
  useEffect(() => {
    if (isPlaying) {
      lastTimeRef.current = Date.now();
      const loop = () => {
        const now = Date.now();
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        setCurrentTime((prev) => {
          const next = prev + delta * playbackRate;
          if (next >= totalDuration) {
            setIsPlaying(false);
            return 0;
          }
          return next;
        });

        animationFrameRef.current = requestAnimationFrame(loop);
      };
      animationFrameRef.current = requestAnimationFrame(loop);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, playbackRate, totalDuration]);

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const handleSeek = (timeSec: number) => {
    setCurrentTime(Math.max(0, Math.min(totalDuration, timeSec)));
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = Math.floor(secs % 60);
    return `${String(mins).padStart(2, '0')}:${String(remainingSecs).padStart(2, '0')}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Film className="w-5 h-5 text-amber-500" />
            <h2 className="text-stone-100 font-bold text-lg">Rough Cut Timeline & Synchronized Preview</h2>
          </div>
          <p className="text-stone-400 text-xs">
            Real-time multi-track playback synchronizing historical visual slides with Gemini voiceover segments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onNextStage}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-sm"
          >
            <span>Export Production Package</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Preview Player Stage */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 16:9 Video Canvas Screen */}
        <div className="lg:col-span-8 space-y-3">
          <div className="relative aspect-video w-full bg-stone-950 rounded-2xl overflow-hidden border border-[#222c3d] shadow-2xl flex items-center justify-center group">
            {/* Visual Image with cinematic Ken Burns slow-scale */}
            {currentAsset ? (
              <img
                src={currentAsset.fullImageUrl || currentAsset.thumbnailUrl}
                alt={currentAsset.title}
                referrerPolicy="no-referrer"
                className={`w-full h-full object-cover transition-transform duration-1000 ${
                  isPlaying ? 'scale-105' : 'scale-100'
                }`}
              />
            ) : (
              <div className="text-stone-600 font-mono text-xs flex flex-col items-center gap-2">
                <ImageIcon className="w-10 h-10 text-stone-700" />
                <span>No Visual Asset Assigned</span>
              </div>
            )}

            {/* Dark vignette gradient */}
            <div className="absolute inset-0 bg-gradient-to-t from-stone-950/90 via-transparent to-stone-950/40 pointer-events-none" />

            {/* Top Right Timecode */}
            <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded bg-stone-950/80 backdrop-blur-sm border border-stone-800 font-mono text-xs text-amber-400 font-bold tracking-widest">
              {formatTime(currentTime)} / {formatTime(totalDuration)}
            </div>

            {/* Top Left Match / Rights Badge */}
            {currentAsset && (
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-stone-950/80 text-emerald-400 border border-emerald-500/40 backdrop-blur-sm">
                  {currentAsset.hierarchyLevel.replace(/_/g, ' ')}
                </span>
                {currentAsset.isIllustrativeSubstitute && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/40 backdrop-blur-sm">
                    ILLUSTRATIVE SUBSTITUTE
                  </span>
                )}
              </div>
            )}

            {/* Bottom Subtitle / Narration Bar */}
            <div className="absolute bottom-4 inset-x-6 z-10 space-y-1 text-center">
              {currentCue && (
                <div className="max-w-2xl mx-auto px-4 py-2 rounded-lg bg-stone-950/85 backdrop-blur-sm border border-stone-800/80 text-xs md:text-sm text-stone-100 font-serif leading-relaxed shadow-lg">
                  "{currentCue.narrationSnippet}"
                </div>
              )}

              {currentAsset && (
                <div className="text-[10px] font-mono text-stone-400 truncate drop-shadow">
                  Source: {currentAsset.sourceInstitution} • {currentAsset.attributionRequirement}
                </div>
              )}
            </div>

            {/* Play/Pause Center Overlay on Hover */}
            <div
              onClick={togglePlay}
              className="absolute inset-0 flex items-center justify-center cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity bg-stone-950/30"
            >
              <div className="w-16 h-16 rounded-full bg-amber-500/90 text-stone-950 flex items-center justify-center shadow-xl transform group-hover:scale-110 transition">
                {isPlaying ? <Pause className="w-8 h-8" /> : <Play className="w-8 h-8 ml-1" />}
              </div>
            </div>
          </div>

          {/* Master Transport Controls */}
          <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="w-10 h-10 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 flex items-center justify-center transition font-bold"
              >
                {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <button
                onClick={() => handleSeek(0)}
                title="Restart"
                className="p-2 rounded-lg bg-[#18212e] hover:bg-[#233042] text-stone-300 transition"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <div className="text-xs font-mono text-stone-300">
                <span className="text-amber-400 font-bold">{formatTime(currentTime)}</span>
                <span className="text-stone-500"> / {formatTime(totalDuration)}</span>
              </div>
            </div>

            {/* Speed & Audio controls */}
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-[#18212e] rounded-lg p-0.5 border border-[#2b3a4f] text-xs font-mono">
                {[1, 1.25, 1.5].map((rate) => (
                  <button
                    key={rate}
                    onClick={() => setPlaybackRate(rate)}
                    className={`px-2 py-1 rounded ${
                      playbackRate === rate
                        ? 'bg-amber-500 text-stone-950 font-bold'
                        : 'text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    {rate}x
                  </button>
                ))}
              </div>

              <button
                onClick={() => setIsMuted(!isMuted)}
                className="p-2 rounded-lg bg-[#18212e] hover:bg-[#233042] text-stone-300 transition"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </div>

        {/* Right: Active Cue & Asset Metadata Inspector */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-5 space-y-4">
            <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-2">
              <Shield className="w-4 h-4" /> Active Frame Source Attribution
            </h3>

            {currentAsset ? (
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-[10px] font-mono text-stone-400 uppercase">Title:</span>
                  <p className="text-stone-100 font-bold">{currentAsset.title}</p>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-stone-400 uppercase">Institution & Code:</span>
                  <p className="text-stone-300 font-mono">{currentAsset.sourceInstitution}</p>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-stone-400 uppercase">Rights Clearance:</span>
                  <p className="text-emerald-400 font-mono font-semibold">
                    {currentAsset.rightsStatus} ({currentAsset.license})
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-mono text-stone-400 uppercase">End Credit Requirement:</span>
                  <p className="text-stone-300 italic bg-[#0e141f] p-2 rounded border border-[#1b2535]">
                    {currentAsset.attributionRequirement}
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-xs text-stone-400">No asset metadata available for current timecode.</p>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Multi-Track Timeline */}
      <div className="bg-[#101520] border border-[#222c3d] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between text-xs font-mono text-stone-400">
          <span className="uppercase tracking-wider font-bold text-stone-300">Synchronized Multi-Track Timeline</span>
          <span>Click anywhere along track to scrub</span>
        </div>

        {/* Timeline Scrub Bar */}
        <div
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            const clickPercent = (e.clientX - rect.left) / rect.width;
            handleSeek(clickPercent * totalDuration);
          }}
          className="relative h-24 bg-[#0a0e16] rounded-xl border border-[#1e2736] cursor-pointer overflow-hidden select-none"
        >
          {/* Playhead */}
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-amber-400 z-30 pointer-events-none shadow-[0_0_8px_#f59e0b]"
            style={{ left: `${(currentTime / totalDuration) * 100}%` }}
          >
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400 -ml-1 -mt-0.5" />
          </div>

          {/* TRACK 1: Video / Visuals (Top Half) */}
          <div className="absolute top-0 inset-x-0 h-12 border-b border-[#1b2433] flex items-center px-1">
            <span className="absolute left-2 top-1 text-[9px] font-mono text-stone-400 uppercase tracking-wider z-20">
              TRACK 1: VISUALS
            </span>

            {visualCues.map((cue, i) => {
              const startPct = (cue.timestampStart / totalDuration) * 100;
              const widthPct = (cue.duration / totalDuration) * 100;
              const isCueActive = currentTime >= cue.timestampStart && currentTime < cue.timestampEnd;

              return (
                <div
                  key={cue.id}
                  style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                  className={`absolute top-1 bottom-1 rounded border text-[9px] font-mono px-1 flex items-center justify-between overflow-hidden transition ${
                    isCueActive
                      ? 'bg-amber-500/25 border-amber-400 text-amber-200'
                      : 'bg-[#151f2e] border-[#243347] text-stone-400'
                  }`}
                >
                  <span className="truncate">#{cue.cueNumber}</span>
                  <span className="text-[8px] opacity-75">{cue.duration}s</span>
                </div>
              );
            })}
          </div>

          {/* TRACK 2: Narration Voiceover Audio (Bottom Half) */}
          <div className="absolute bottom-0 inset-x-0 h-12 flex items-center px-1">
            <span className="absolute left-2 bottom-1 text-[9px] font-mono text-stone-400 uppercase tracking-wider z-20">
              TRACK 2: VOICEOVER
            </span>

            {voiceSegments.map((seg, i) => {
              const segStart = voiceSegments.slice(0, i).reduce((a, s) => a + s.durationSeconds, 0);
              const startPct = (segStart / totalDuration) * 100;
              const widthPct = (seg.durationSeconds / totalDuration) * 100;

              return (
                <div
                  key={seg.id}
                  style={{ left: `${startPct}%`, width: `${widthPct}%` }}
                  className="absolute top-1 bottom-1 rounded border border-[#203147] bg-[#101c2b] text-[9px] font-mono text-stone-300 px-1.5 flex items-center truncate"
                >
                  <span className="truncate">Beat {seg.beatNumber}: {seg.title}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};
