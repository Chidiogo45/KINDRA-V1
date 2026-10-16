import React, { useState, useRef } from 'react';
import {
  Mic,
  Play,
  Pause,
  Volume2,
  Sparkles,
  Download,
  ArrowRight,
  Radio,
  CheckCircle2,
  RefreshCw,
  Clock,
  Layers,
  Sliders,
} from 'lucide-react';
import { VoiceOption, VoiceSegment, DocumentaryProject, ScriptBeat } from '../../types';
import { WaveformVisualizer } from '../common/WaveformVisualizer';
import { GeneratedVoiceoverSection } from './GeneratedVoiceoverSection';

interface VoiceoverEngineViewProps {
  project: DocumentaryProject;
  voices: VoiceOption[];
  scriptBeats: ScriptBeat[];
  onGeneratePreview: (text: string, voiceName: string, directive?: string) => Promise<any>;
  onGenerateAllSegments: (voiceName: string, overallDirective: string) => void;
  onGenerateSingleSegment?: (segmentIndex: number, beat: ScriptBeat, voiceName: string, directive?: string) => void;
  onUpdateVoiceSegment: (segmentIndex: number, updatedAudio: any) => void;
  onNextStage: () => void;
  isLoading: boolean;
}

export const VoiceoverEngineView: React.FC<VoiceoverEngineViewProps> = ({
  project,
  voices,
  scriptBeats,
  onGeneratePreview,
  onGenerateAllSegments,
  onGenerateSingleSegment,
  onUpdateVoiceSegment,
  onNextStage,
  isLoading,
}) => {
  const [selectedVoice, setSelectedVoice] = useState<string>(
    project.voiceover?.selectedVoiceId || 'Fenrir'
  );
  const [overallDirective, setOverallDirective] = useState<string>(
    project.voiceover?.overallDeliveryInstruction ||
      'Measured, authoritative, and atmospheric documentary cadence with deliberate historical pauses.'
  );

  // Audio Playback state
  const [previewText, setPreviewText] = useState(
    scriptBeats[0]?.narrationText?.substring(0, 180) ||
      'In the third week of February 1943, three hundred miles east of Kyiv, the snow was four feet deep. To the Soviet General Staff in Moscow, the map showed only victory.'
  );
  const [previewAudioUrl, setPreviewAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState(false);
  const [previewProgress, setPreviewProgress] = useState(0);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleAuditionVoice = async (voiceName: string) => {
    try {
      const res = await onGeneratePreview(previewText, voiceName, overallDirective);
      if (res?.audioDataUrl) {
        setPreviewAudioUrl(res.audioDataUrl);
        playAudio(res.audioDataUrl);
      }
    } catch (err) {
      console.error('Audition error:', err);
    }
  };

  const playAudio = (url: string) => {
    if (previewAudioRef.current) {
      previewAudioRef.current.pause();
    }
    const audio = new Audio(url);
    previewAudioRef.current = audio;
    setIsPlayingPreview(true);

    audio.ontimeupdate = () => {
      if (audio.duration) {
        setPreviewProgress((audio.currentTime / audio.duration) * 100);
      }
    };

    audio.onended = () => {
      setIsPlayingPreview(false);
      setPreviewProgress(0);
    };

    audio.play();
  };

  const togglePreviewPlay = () => {
    if (!previewAudioRef.current && previewAudioUrl) {
      playAudio(previewAudioUrl);
      return;
    }
    if (previewAudioRef.current) {
      if (isPlayingPreview) {
        previewAudioRef.current.pause();
        setIsPlayingPreview(false);
      } else {
        previewAudioRef.current.play();
        setIsPlayingPreview(true);
      }
    }
  };

  const segments = project.voiceover?.segments || [];

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Mic className="w-5 h-5 text-amber-500" />
            <h2 className="text-stone-100 font-bold text-lg">Documentary Voiceover & Narration Engine</h2>
          </div>
          <p className="text-stone-400 text-xs">
            Direct integration with Google GenAI Voice Synthesis (`gemini-3.1-flash-tts-preview`) with historical delivery directives.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => onGenerateAllSegments(selectedVoice, overallDirective)}
            disabled={isLoading || scriptBeats.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-sm disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{segments.length > 0 ? 'Regenerate All Segments' : 'Generate Full Voiceover'}</span>
          </button>

          {segments.length > 0 && (
            <button
              onClick={onNextStage}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-[#1a2332] hover:bg-[#233044] text-stone-100 font-bold text-xs transition border border-[#2d3e58]"
            >
              <span>Archival Visuals</span>
              <ArrowRight className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>
      </div>

      {/* Voice Selection Matrix */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
            Select Documentary Voice Archetype
          </h3>
          <span className="text-xs font-mono text-stone-400">Native High-Definition Gemini Voices</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {voices.map((voice) => {
            const isSelected = selectedVoice === voice.geminiVoiceName;

            return (
              <div
                key={voice.id}
                onClick={() => setSelectedVoice(voice.geminiVoiceName)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-[#182333] border-amber-500 shadow-md ring-1 ring-amber-500/50'
                    : 'bg-[#121824] border-[#222c3d] hover:border-stone-600'
                }`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-stone-100">{voice.name}</span>
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {voice.editorialCategory}
                      </span>
                    </div>

                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isSelected ? 'bg-amber-500 border-amber-500' : 'border-stone-700'
                      }`}
                    >
                      {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-stone-950" />}
                    </div>
                  </div>

                  <p className="text-stone-300 text-xs leading-relaxed">{voice.description}</p>
                  <p className="text-[11px] text-stone-400 font-mono">
                    <strong className="text-stone-300">Recommended:</strong> {voice.recommendedUse}
                  </p>
                </div>

                <div className="pt-3 mt-3 border-t border-[#1c2636] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-stone-400">{voice.timbre}</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAuditionVoice(voice.geminiVoiceName);
                    }}
                    className="text-xs font-mono text-amber-400 hover:text-amber-300 flex items-center gap-1"
                  >
                    <Play className="w-3 h-3" />
                    <span>Audition</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Audition & Delivery Controls Panel */}
      <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-amber-500" />
            <h3 className="text-stone-100 font-bold text-xs uppercase font-mono tracking-wider">
              Audition Sandbox & Delivery Directive
            </h3>
          </div>
          <span className="text-[11px] font-mono text-stone-400">
            Selected: <strong className="text-amber-400">{selectedVoice}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-mono uppercase text-stone-400 mb-1">
              Sample Audition Text:
            </label>
            <textarea
              rows={3}
              value={previewText}
              onChange={(e) => setPreviewText(e.target.value)}
              className="w-full bg-[#16202d] border border-[#29384e] rounded-lg p-3 text-xs text-stone-100 leading-relaxed focus:outline-none focus:border-amber-500 font-serif"
            />
          </div>

          <div>
            <label className="block text-[11px] font-mono uppercase text-stone-400 mb-1">
              Voiceover Tone & Pace Directive:
            </label>
            <textarea
              rows={3}
              value={overallDirective}
              onChange={(e) => setOverallDirective(e.target.value)}
              placeholder="e.g. Grave, measured, atmospheric cadence; deliberate pause before stating dispatches..."
              className="w-full bg-[#16202d] border border-[#29384e] rounded-lg p-3 text-xs text-stone-100 leading-relaxed focus:outline-none focus:border-amber-500 font-mono"
            />
          </div>
        </div>

        {/* Live Audio Player Bar */}
        <div className="bg-[#0e141f] border border-[#1e2a3c] rounded-xl p-3.5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              onClick={() => handleAuditionVoice(selectedVoice)}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shrink-0"
            >
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span>{isLoading ? 'Synthesizing...' : 'Synthesize Audio Preview'}</span>
            </button>

            {previewAudioUrl && (
              <button
                onClick={togglePreviewPlay}
                className="w-8 h-8 rounded-full bg-[#18212e] hover:bg-[#233042] text-amber-400 flex items-center justify-center border border-amber-500/30 transition shrink-0"
              >
                {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
              </button>
            )}
          </div>

          <div className="flex-1 w-full max-w-md">
            <WaveformVisualizer isPlaying={isPlayingPreview} progressPercent={previewProgress} />
          </div>
        </div>
      </div>

      {/* Generated Voiceover Section */}
      <GeneratedVoiceoverSection
        project={project}
        voices={voices}
        scriptBeats={scriptBeats}
        selectedVoice={selectedVoice}
        overallDirective={overallDirective}
        onGenerateAllSegments={onGenerateAllSegments}
        onGenerateSingleSegment={onGenerateSingleSegment}
        onNextStage={onNextStage}
        isLoading={isLoading}
      />
    </div>
  );
};
