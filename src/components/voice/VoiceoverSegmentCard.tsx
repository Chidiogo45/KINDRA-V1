import React, { useState, useRef, useEffect } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  RefreshCw,
  Download,
  Copy,
  Check,
  Sliders,
  ChevronDown,
  ChevronUp,
  Clock,
  Sparkles,
} from 'lucide-react';
import { VoiceOption, VoiceSegment, ScriptBeat } from '../../types';
import { WaveformThumbnail } from './WaveformThumbnail';

interface VoiceoverSegmentCardProps {
  segment: VoiceSegment;
  index: number;
  beat?: ScriptBeat;
  voices: VoiceOption[];
  currentVoiceName: string;
  isPlaying: boolean;
  onPlay: (index: number) => void;
  onPause: () => void;
  onRegenerate: (index: number, voiceName: string, directive: string) => Promise<void> | void;
  isRegenerating: boolean;
}

export const VoiceoverSegmentCard: React.FC<VoiceoverSegmentCardProps> = ({
  segment,
  index,
  beat,
  voices,
  currentVoiceName,
  isPlaying,
  onPlay,
  onPause,
  onRegenerate,
  isRegenerating,
}) => {
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(segment.durationSeconds || 60);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showTweakDrawer, setShowTweakDrawer] = useState(false);
  const [copied, setCopied] = useState(false);

  // Segment granular directive and voice state
  const [customDirective, setCustomDirective] = useState(
    segment.deliveryDirective || beat?.deliveryDirective || 'Measured, authoritative cadence with deliberate historical pauses.'
  );
  const [segmentVoice, setSegmentVoice] = useState(segment.voiceId || currentVoiceName);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioSource = segment.audioDataUrl || segment.audioUrl || (segment.audioBase64 ? `data:audio/wav;base64,${segment.audioBase64}` : null);

  // Synchronize audio element
  useEffect(() => {
    if (!audioSource) return;

    if (!audioRef.current) {
      const audio = new Audio(audioSource);
      audioRef.current = audio;

      audio.onloadedmetadata = () => {
        if (audio.duration && !isNaN(audio.duration) && isFinite(audio.duration)) {
          setDuration(audio.duration);
        }
      };

      audio.ontimeupdate = () => {
        setCurrentTime(audio.currentTime);
      };

      audio.onended = () => {
        setCurrentTime(0);
        onPause();
      };
    } else {
      // Update src if changed
      if (audioRef.current.src !== audioSource) {
        audioRef.current.src = audioSource;
        audioRef.current.load();
      }
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [audioSource]);

  // Handle play/pause state from parent
  useEffect(() => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.playbackRate = playbackRate;
      audioRef.current.muted = isMuted;
      audioRef.current.play().catch((err) => {
        console.warn('Audio playback error:', err);
        onPause();
      });
    } else {
      audioRef.current.pause();
    }
  }, [isPlaying, playbackRate, isMuted]);

  const togglePlay = () => {
    if (isPlaying) {
      onPause();
    } else {
      onPlay(index);
    }
  };

  const handleSeek = (percent: number) => {
    const targetTime = (percent / 100) * duration;
    setCurrentTime(targetTime);
    if (audioRef.current) {
      audioRef.current.currentTime = targetTime;
      if (!isPlaying) {
        onPlay(index);
      }
    }
  };

  const handleRestart = () => {
    setCurrentTime(0);
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      if (!isPlaying) {
        onPlay(index);
      }
    }
  };

  const cyclePlaybackRate = () => {
    const rates = [1, 1.15, 1.25, 1.5];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    const nextRate = rates[nextIdx];
    setPlaybackRate(nextRate);
    if (audioRef.current) {
      audioRef.current.playbackRate = nextRate;
    }
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    if (audioRef.current) {
      audioRef.current.muted = next;
    }
  };

  const handleCopyText = () => {
    const textToCopy = segment.narrationText || beat?.narrationText || segment.narrationSnippet || '';
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRegenerateSegment = async () => {
    await onRegenerate(index, segmentVoice, customDirective);
  };

  // Duration formatting
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const wordCount = segment.wordCount || beat?.wordCount || (segment.narrationText ? segment.narrationText.trim().split(/\s+/).length : 0);
  const calculatedWpm = duration > 0 && wordCount > 0 ? Math.round((wordCount / duration) * 60) : 145;

  const narrationText = segment.narrationText || beat?.narrationText || segment.narrationSnippet || '';
  const beatTitle = segment.title || beat?.title || `Segment ${index + 1}`;
  const beatNumber = segment.beatNumber || index + 1;
  const beatType = beat?.beatType || 'BEAT';

  return (
    <div
      className={`rounded-xl border transition-all duration-200 overflow-hidden ${
        isPlaying
          ? 'bg-[#151d2b] border-amber-500/80 shadow-lg shadow-amber-950/20 ring-1 ring-amber-500/30'
          : 'bg-[#121824] border-[#222c3d] hover:border-[#2f3d54]'
      }`}
    >
      {/* Top Header Row */}
      <div className="p-4 pb-3 flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-[#1b2433]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#192231] border border-[#2b394e] flex items-center justify-center shrink-0">
            <span className="font-mono font-bold text-xs text-amber-400">
              {beatNumber < 10 ? `0${beatNumber}` : beatNumber}
            </span>
          </div>

          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="text-stone-100 font-bold text-sm tracking-tight">{beatTitle}</h4>
              <span className="text-[10px] font-mono text-stone-400">· {beatType}</span>
              <span className="text-[10px] font-mono text-amber-400/90">
                · {segment.voiceId || currentVoiceName}
              </span>
            </div>

            {/* Clean Typographic Metadata (Zero-Pill Compliance) */}
            <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono text-stone-400 mt-0.5">
              <span className="text-stone-300 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-stone-400" />
                {formatTime(duration)} ({Math.round(duration)}s)
              </span>
              <span aria-hidden="true">·</span>
              <span>{wordCount} words</span>
              <span aria-hidden="true">·</span>
              <span className={calculatedWpm >= 135 && calculatedWpm <= 155 ? 'text-emerald-400' : 'text-stone-400'}>
                {calculatedWpm} WPM
              </span>
              <span aria-hidden="true">·</span>
              <span className="text-stone-400">
                {audioSource ? 'Synthesized' : 'Awaiting Audio'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls: Granular Tweak, Regenerate, Download */}
        <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
          <button
            onClick={() => setShowTweakDrawer(!showTweakDrawer)}
            title="Granular Delivery Directive & Voice"
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition border ${
              showTweakDrawer
                ? 'bg-amber-500/15 text-amber-300 border-amber-500/40'
                : 'bg-[#18212e] text-stone-300 hover:text-stone-100 border-[#2b3a4f] hover:border-stone-500'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Refine Cadence</span>
          </button>

          <button
            onClick={handleRegenerateSegment}
            disabled={isRegenerating}
            title="Regenerate this specific voiceover segment"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#18212e] hover:bg-amber-500/20 text-stone-300 hover:text-amber-400 text-xs font-mono transition border border-[#2b3a4f] hover:border-amber-500/40 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRegenerating ? 'animate-spin text-amber-400' : ''}`} />
            <span>{isRegenerating ? 'Synthesizing...' : 'Regenerate'}</span>
          </button>

          {audioSource && (
            <a
              href={audioSource}
              download={segment.filename || `0${beatNumber}_beat_${beatTitle.toLowerCase().replace(/\s+/g, '_')}.wav`}
              title="Download segment WAV"
              className="p-1.5 rounded-lg bg-[#18212e] hover:bg-[#233042] text-stone-400 hover:text-stone-200 transition border border-[#2b3a4f]"
            >
              <Download className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Main Interactive Waveform & Player Row */}
      <div className="p-4 pt-3.5 space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {/* Individual Player Controls */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={togglePlay}
              disabled={!audioSource || isRegenerating}
              className={`w-9 h-9 rounded-lg flex items-center justify-center transition shadow-sm ${
                isPlaying
                  ? 'bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold'
                  : 'bg-[#1a2434] hover:bg-[#253248] text-amber-400 border border-[#2c3d56]'
              } disabled:opacity-40 disabled:cursor-not-allowed`}
              aria-label={isPlaying ? 'Pause segment' : 'Play segment'}
            >
              {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
            </button>

            <button
              onClick={handleRestart}
              disabled={!audioSource}
              title="Restart segment from beginning"
              className="p-2 rounded-lg bg-[#18212e] hover:bg-[#222e40] text-stone-400 hover:text-stone-200 border border-[#28364a] transition disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            <div className="font-mono text-xs text-stone-300 w-24 tabular-nums">
              <span>{formatTime(currentTime)}</span>
              <span className="text-stone-400"> / {formatTime(duration)}</span>
            </div>
          </div>

          {/* Visual Waveform Thumbnail with Interactive Scrubbing */}
          <div className="flex-1 w-full min-w-0">
            <WaveformThumbnail
              segmentId={segment.id || `seg_${index}`}
              durationSeconds={duration}
              progressPercent={progressPercent}
              isPlaying={isPlaying}
              onSeek={handleSeek}
              height={40}
              barCount={52}
              interactive={!!audioSource}
            />
          </div>

          {/* Secondary Controls (Speed & Volume) */}
          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            <button
              onClick={cyclePlaybackRate}
              title="Playback speed"
              className="px-2 py-1 rounded bg-[#18212e] hover:bg-[#222e40] text-[11px] font-mono text-stone-300 border border-[#28364a] transition"
            >
              {playbackRate}x
            </button>

            <button
              onClick={toggleMute}
              title={isMuted ? 'Unmute' : 'Mute'}
              className="p-1.5 rounded bg-[#18212e] hover:bg-[#222e40] text-stone-400 hover:text-stone-200 border border-[#28364a] transition"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Spoken Narration Script Preview & Directive */}
        <div className="bg-[#0e141f] border border-[#1b2535] rounded-lg p-3 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-stone-400">
            <span className="uppercase text-stone-400 font-medium">Spoken Narration Script</span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyText}
                className="flex items-center gap-1 hover:text-stone-200 transition"
                title="Copy narration text"
              >
                {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              {narrationText.length > 140 && (
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="flex items-center gap-0.5 text-amber-400 hover:text-amber-300 transition"
                >
                  <span>{isExpanded ? 'Less' : 'More'}</span>
                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                </button>
              )}
            </div>
          </div>

          <p
            className={`text-xs text-stone-200 font-serif leading-relaxed italic ${
              isExpanded ? '' : 'line-clamp-2'
            }`}
          >
            "{narrationText}"
          </p>

          {/* Quiet Delivery Directive note */}
          {(segment.deliveryDirective || beat?.deliveryDirective) && (
            <div className="pt-2 border-t border-[#16202e] flex items-start gap-1.5 text-[11px] font-mono text-stone-400">
              <span className="text-amber-400/80 font-bold shrink-0">Cadence Directive:</span>
              <span className="text-stone-300 leading-normal">
                {segment.deliveryDirective || beat?.deliveryDirective}
              </span>
            </div>
          )}
        </div>

        {/* Granular Tweak Drawer (Collapsible) */}
        {showTweakDrawer && (
          <div className="bg-[#0b1019] border border-amber-500/30 rounded-lg p-3.5 space-y-3 animation-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-amber-400">
                <Sliders className="w-3.5 h-3.5" />
                <span>Granular Segment Voice & Cadence Directives</span>
              </div>
              <button
                onClick={() => setShowTweakDrawer(false)}
                className="text-stone-400 hover:text-stone-200 text-xs font-mono"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-mono text-stone-400 mb-1">
                  Voice Archetype:
                </label>
                <select
                  value={segmentVoice}
                  onChange={(e) => setSegmentVoice(e.target.value)}
                  className="w-full bg-[#141b27] border border-[#2b3a4f] rounded-lg px-2.5 py-1.5 text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                >
                  {voices.map((v) => (
                    <option key={v.id} value={v.geminiVoiceName}>
                      {v.name} ({v.editorialCategory}) - {v.timbre}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-mono text-stone-400 mb-1">
                  Delivery Directive for Beat #{beatNumber}:
                </label>
                <input
                  type="text"
                  value={customDirective}
                  onChange={(e) => setCustomDirective(e.target.value)}
                  placeholder="e.g. Somber tone, 1.5s silence after casualty count, drop pitch on final phrase"
                  className="w-full bg-[#141b27] border border-[#2b3a4f] rounded-lg px-3 py-1.5 text-xs text-stone-100 font-mono focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#182333]">
              <span className="text-[11px] font-mono text-stone-400">
                Regenerating will re-synthesize this beat only with Gemini high-definition voice synthesis.
              </span>

              <button
                onClick={handleRegenerateSegment}
                disabled={isRegenerating}
                className="flex items-center gap-2 px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition disabled:opacity-50"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isRegenerating ? 'Synthesizing...' : 'Apply & Regenerate Beat'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
