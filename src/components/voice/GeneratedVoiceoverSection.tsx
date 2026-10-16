import React, { useState, useEffect, useRef } from 'react';
import {
  Mic,
  Play,
  Pause,
  RefreshCw,
  Download,
  Search,
  Filter,
  Volume2,
  CheckCircle2,
  Clock,
  Layers,
  Sparkles,
  ArrowRight,
  Sliders,
  Check,
  FileAudio,
} from 'lucide-react';
import { VoiceOption, VoiceSegment, ScriptBeat, DocumentaryProject } from '../../types';
import { VoiceoverSegmentCard } from './VoiceoverSegmentCard';

interface GeneratedVoiceoverSectionProps {
  project: DocumentaryProject;
  voices: VoiceOption[];
  scriptBeats: ScriptBeat[];
  selectedVoice: string;
  overallDirective: string;
  onGenerateAllSegments: (voiceName: string, overallDirective: string) => void;
  onGenerateSingleSegment?: (
    segmentIndex: number,
    beat: ScriptBeat,
    voiceName: string,
    directive?: string
  ) => Promise<void> | void;
  onNextStage: () => void;
  isLoading: boolean;
}

export const GeneratedVoiceoverSection: React.FC<GeneratedVoiceoverSectionProps> = ({
  project,
  voices,
  scriptBeats,
  selectedVoice,
  overallDirective,
  onGenerateAllSegments,
  onGenerateSingleSegment,
  onNextStage,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activePlayingIndex, setActivePlayingIndex] = useState<number | null>(null);
  const [isSequentialPlaying, setIsSequentialPlaying] = useState(false);
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null);
  const [copiedBatch, setCopiedBatch] = useState(false);

  // Combine segments and scriptBeats to ensure full coverage
  const rawSegments = project.voiceover?.segments || [];

  // Build complete list of segments mapped to beats
  const segments: VoiceSegment[] = (scriptBeats.length > 0 ? scriptBeats : rawSegments).map((item, idx) => {
    // If scriptBeats is used
    if ('narrationText' in item) {
      const beat = item as ScriptBeat;
      const matchedSegment = rawSegments.find(
        (s) => s.beatId === beat.id || s.beatNumber === (beat.beatNumber || idx + 1)
      ) || rawSegments[idx];

      if (matchedSegment) {
        return {
          ...matchedSegment,
          title: matchedSegment.title || beat.title,
          narrationSnippet: matchedSegment.narrationSnippet || beat.narrationText.substring(0, 120) + '...',
          narrationText: matchedSegment.narrationText || beat.narrationText,
          wordCount: matchedSegment.wordCount || beat.wordCount,
          durationSeconds: matchedSegment.durationSeconds || beat.estimatedDurationSeconds || 60,
        };
      }

      // Placeholder segment if not yet synthesized
      return {
        id: `seg_pending_${beat.id}`,
        beatId: beat.id,
        beatNumber: beat.beatNumber || idx + 1,
        title: beat.title,
        narrationSnippet: beat.narrationText.substring(0, 120) + '...',
        narrationText: beat.narrationText,
        filename: `0${idx + 1}_beat_${beat.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.wav`,
        durationSeconds: beat.estimatedDurationSeconds || 60,
        deliveryDirective: beat.deliveryDirective || overallDirective,
        status: 'PENDING' as const,
        voiceId: selectedVoice,
        wordCount: beat.wordCount,
      };
    } else {
      return item as VoiceSegment;
    }
  });

  // Calculate audio metrics
  const synthesizedSegments = segments.filter((s) => !!(s.audioDataUrl || s.audioUrl || s.audioBase64));
  const totalDurationSeconds = segments.reduce((acc, s) => acc + (s.durationSeconds || 0), 0);
  const totalWords = segments.reduce((acc, s) => acc + (s.wordCount || 0), 0);
  const avgWpm = totalDurationSeconds > 0 && totalWords > 0 ? Math.round((totalWords / totalDurationSeconds) * 60) : 145;

  // Filter segments
  const filteredSegments = segments.filter((seg) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = (seg.title || '').toLowerCase();
    const snippet = (seg.narrationSnippet || '').toLowerCase();
    const text = (seg.narrationText || '').toLowerCase();
    return title.includes(q) || snippet.includes(q) || text.includes(q) || `beat ${seg.beatNumber}`.includes(q);
  });

  // Handle Play / Pause for single segment
  const handlePlaySegment = (idx: number) => {
    setActivePlayingIndex(idx);
  };

  const handlePauseSegment = () => {
    if (isSequentialPlaying) {
      // Advance to next segment in sequential play mode
      if (activePlayingIndex !== null && activePlayingIndex + 1 < segments.length) {
        const nextIdx = activePlayingIndex + 1;
        if (segments[nextIdx].audioDataUrl || segments[nextIdx].audioUrl || segments[nextIdx].audioBase64) {
          setActivePlayingIndex(nextIdx);
          return;
        }
      }
      setIsSequentialPlaying(false);
    }
    setActivePlayingIndex(null);
  };

  // Continuous Sequential Playback ("Play All")
  const toggleSequentialPlay = () => {
    if (isSequentialPlaying) {
      setIsSequentialPlaying(false);
      setActivePlayingIndex(null);
    } else {
      // Start from first segment that has audio
      const firstPlayableIdx = segments.findIndex((s) => s.audioDataUrl || s.audioUrl || s.audioBase64);
      if (firstPlayableIdx !== -1) {
        setIsSequentialPlaying(true);
        setActivePlayingIndex(firstPlayableIdx);
      }
    }
  };

  // Granular single segment regeneration handler
  const handleRegenerateSingle = async (
    segmentIdx: number,
    voiceName: string,
    directive: string
  ) => {
    if (!onGenerateSingleSegment) return;
    const targetBeat = scriptBeats[segmentIdx] || {
      id: segments[segmentIdx]?.beatId || `beat_${segmentIdx + 1}`,
      beatNumber: segments[segmentIdx]?.beatNumber || segmentIdx + 1,
      title: segments[segmentIdx]?.title || `Beat ${segmentIdx + 1}`,
      narrationText: segments[segmentIdx]?.narrationText || segments[segmentIdx]?.narrationSnippet || '',
      wordCount: segments[segmentIdx]?.wordCount || 140,
      estimatedDurationSeconds: segments[segmentIdx]?.durationSeconds || 60,
      pacingNote: '145 WPM measured cadence',
      deliveryDirective: directive,
      isDeadBeatWarning: false,
    };

    setRegeneratingIndex(segmentIdx);
    try {
      await onGenerateSingleSegment(segmentIdx, targetBeat, voiceName, directive);
    } finally {
      setRegeneratingIndex(null);
    }
  };

  const formatTotalTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.round(secs % 60);
    return `${m}m ${s.toString().padStart(2, '0')}s`;
  };

  return (
    <section
      aria-labelledby="generated-voiceover-heading"
      className="space-y-4 pt-4 border-t border-[#1e2a3c]"
    >
      {/* Section Header */}
      <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-5 shadow-md space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <FileAudio className="w-5 h-5 text-amber-500" />
              <h3
                id="generated-voiceover-heading"
                className="text-stone-100 font-bold text-base tracking-tight"
              >
                Generated Voiceover
              </h3>
            </div>
            <p className="text-stone-400 text-xs">
              Processed high-definition narration tracks. Inspect waveforms, audition individual takes, and execute granular cadence regenerations per beat.
            </p>
          </div>

          {/* Master Section Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            {synthesizedSegments.length > 0 && (
              <button
                onClick={toggleSequentialPlay}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-mono font-bold transition border ${
                  isSequentialPlaying
                    ? 'bg-amber-500 text-stone-950 border-amber-500 shadow-md shadow-amber-950/40'
                    : 'bg-[#18212e] text-stone-200 hover:text-white border-[#2c3d55] hover:border-stone-500'
                }`}
              >
                {isSequentialPlaying ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                <span>{isSequentialPlaying ? 'Pause Sequential Play' : 'Play All Segments'}</span>
              </button>
            )}

            <button
              onClick={() => onGenerateAllSegments(selectedVoice, overallDirective)}
              disabled={isLoading || scriptBeats.length === 0}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-sm disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{synthesizedSegments.length > 0 ? 'Regenerate All' : 'Synthesize All Segments'}</span>
            </button>

            {synthesizedSegments.length > 0 && (
              <button
                onClick={onNextStage}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a2332] hover:bg-[#233044] text-stone-100 font-bold text-xs transition border border-[#2d3e58]"
              >
                <span>Proceed to Visuals</span>
                <ArrowRight className="w-3.5 h-3.5 text-amber-400" />
              </button>
            )}
          </div>
        </div>

        {/* Master Metrics Summary Strip (Clean Typographic Layout) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-[#1a2433]">
          <div className="bg-[#0e141f] rounded-lg p-2.5 border border-[#1b2536]">
            <span className="text-[10px] font-mono text-stone-400 uppercase block">Processed Tracks</span>
            <span className="text-stone-100 font-mono font-bold text-sm">
              {synthesizedSegments.length} of {segments.length} Ready
            </span>
          </div>

          <div className="bg-[#0e141f] rounded-lg p-2.5 border border-[#1b2536]">
            <span className="text-[10px] font-mono text-stone-400 uppercase block">Total Duration</span>
            <span className="text-amber-400 font-mono font-bold text-sm">
              {formatTotalTime(totalDurationSeconds)}
            </span>
          </div>

          <div className="bg-[#0e141f] rounded-lg p-2.5 border border-[#1b2536]">
            <span className="text-[10px] font-mono text-stone-400 uppercase block">Script Volume</span>
            <span className="text-stone-100 font-mono font-bold text-sm">
              {totalWords} Spoken Words
            </span>
          </div>

          <div className="bg-[#0e141f] rounded-lg p-2.5 border border-[#1b2536]">
            <span className="text-[10px] font-mono text-stone-400 uppercase block">Average Cadence</span>
            <span className="text-emerald-400 font-mono font-bold text-sm">
              {avgWpm} WPM · Measured
            </span>
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <div className="relative w-full sm:w-80">
            <Search className="w-3.5 h-3.5 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search segments by title or spoken text..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#0d131e] border border-[#222e40] rounded-lg pl-8 pr-3 py-1.5 text-xs text-stone-200 placeholder-stone-500 font-mono focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-stone-400 self-end sm:self-auto">
            <span>Showing {filteredSegments.length} of {segments.length} segments</span>
          </div>
        </div>
      </div>

      {/* Segments Audio List */}
      {filteredSegments.length > 0 ? (
        <div className="space-y-3">
          {filteredSegments.map((segment, idx) => {
            const actualIndex = segments.findIndex((s) => s.id === segment.id);
            const resolvedIndex = actualIndex !== -1 ? actualIndex : idx;
            const isPlayingThis = activePlayingIndex === resolvedIndex;
            const isRegeneratingThis = regeneratingIndex === resolvedIndex;

            return (
              <VoiceoverSegmentCard
                key={segment.id || `seg_${resolvedIndex}`}
                segment={segment}
                index={resolvedIndex}
                beat={scriptBeats[resolvedIndex]}
                voices={voices}
                currentVoiceName={selectedVoice}
                isPlaying={isPlayingThis}
                onPlay={handlePlaySegment}
                onPause={handlePauseSegment}
                onRegenerate={handleRegenerateSingle}
                isRegenerating={isRegeneratingThis}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-8 text-center space-y-3">
          <p className="text-stone-300 text-sm font-medium">
            {searchQuery
              ? `No segments found matching "${searchQuery}".`
              : 'No audio segments have been synthesized yet.'}
          </p>
          <button
            onClick={() => onGenerateAllSegments(selectedVoice, overallDirective)}
            disabled={isLoading || scriptBeats.length === 0}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition"
          >
            <Sparkles className="w-4 h-4" />
            <span>Generate Full Voiceover Narration</span>
          </button>
        </div>
      )}
    </section>
  );
};
