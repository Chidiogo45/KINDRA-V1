import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Sparkles,
  RefreshCw,
  Plus,
  Trash2,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Layers,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { DocumentaryOutline, OutlineBeat, NarrativeMode, DocumentaryProject } from '../../types';

interface OutlineEditorViewProps {
  project: DocumentaryProject;
  outline: DocumentaryOutline | null;
  onGenerateOutline: (mode: NarrativeMode, targetDuration: number, targetWpm: number) => void;
  onRegenerateBeat: (beatNumber: number, currentBeat: OutlineBeat, direction: string) => void;
  onUpdateOutline: (updated: DocumentaryOutline) => void;
  onNextStage: () => void;
  isLoading: boolean;
}

export const OutlineEditorView: React.FC<OutlineEditorViewProps> = ({
  project,
  outline,
  onGenerateOutline,
  onRegenerateBeat,
  onUpdateOutline,
  onNextStage,
  isLoading,
}) => {
  const [selectedBeatForRegen, setSelectedBeatForRegen] = useState<OutlineBeat | null>(null);
  const [regenDirection, setRegenDirection] = useState('');
  const [expandedBeatId, setExpandedBeatId] = useState<string | null>(null);

  const handleRegenSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBeatForRegen) return;
    onRegenerateBeat(selectedBeatForRegen.beatNumber, selectedBeatForRegen, regenDirection);
    setSelectedBeatForRegen(null);
    setRegenDirection('');
  };

  const totalCalculatedWords =
    outline?.beats?.reduce((acc, b) => acc + (b.targetWordCount || 0), 0) || 0;
  const totalCalculatedSeconds =
    outline?.beats?.reduce((acc, b) => acc + (b.targetDurationSeconds || 0), 0) || 0;

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Header Controls */}
      <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Layers className="w-5 h-5 text-amber-500" />
            <h2 className="text-stone-100 font-bold text-lg">Documentary Story Outline & Beat Architecture</h2>
          </div>
          <p className="text-stone-400 text-xs">
            Structured narrative beats designed for high viewer retention, psychological curiosity, and causal progression.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() =>
              onGenerateOutline(
                project.narrativeMode,
                project.targetDurationMinutes,
                project.targetWpm
              )
            }
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#192434] hover:bg-[#223046] text-amber-400 font-semibold text-xs transition border border-amber-500/30 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{outline ? 'Re-Architect Outline' : 'Generate Structured Beats'}</span>
          </button>

          {outline && outline.beats?.length > 0 && (
            <button
              onClick={onNextStage}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-sm"
            >
              <span>Draft Full Script</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {outline && (
        <div className="space-y-6">
          {/* Target Specs Summary Bar */}
          <div className="bg-[#101622] border border-[#202c3e] rounded-xl p-4 flex flex-wrap items-center justify-between gap-4 text-xs font-mono">
            <div className="flex items-center gap-4 text-stone-300">
              <div>
                Mode: <strong className="text-amber-400">{outline.narrativeMode}</strong>
              </div>
              <span>•</span>
              <div>
                Target Cadence: <strong className="text-stone-100">{outline.targetWpm} WPM</strong>
              </div>
              <span>•</span>
              <div>
                Beats: <strong className="text-stone-100">{outline.beats?.length || 0} Total</strong>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-stone-400">
                Total Budget: <strong className="text-amber-300">{Math.round(totalCalculatedSeconds / 60)} min ({totalCalculatedWords} words)</strong>
              </span>
            </div>
          </div>

          {/* Beats Grid */}
          <div className="space-y-3">
            {outline.beats?.map((beat, idx) => {
              const isExpanded = expandedBeatId === beat.id;

              return (
                <div
                  key={beat.id}
                  className="bg-[#121824] border border-[#222c3d] rounded-xl p-4 space-y-3 transition"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <span className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-bold text-xs flex items-center justify-center border border-amber-500/30">
                        {beat.beatNumber || idx + 1}
                      </span>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#1c2534] text-stone-300 border border-[#2a374c]">
                            {beat.beatType}
                          </span>
                          <h3 className="text-stone-100 font-bold text-sm">{beat.title}</h3>
                        </div>
                        <p className="text-stone-300 text-xs mt-1">{beat.summary}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[11px] font-mono text-stone-400 bg-stone-900 px-2 py-1 rounded">
                        ~{beat.targetDurationSeconds}s ({beat.targetWordCount}w)
                      </span>

                      <button
                        onClick={() => setSelectedBeatForRegen(beat)}
                        title="Granular Beat Regeneration"
                        className="p-1.5 rounded-lg bg-[#18212e] hover:bg-[#233042] text-amber-400 border border-amber-500/20 transition text-xs flex items-center gap-1 font-mono"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Rewrite</span>
                      </button>

                      <button
                        onClick={() => setExpandedBeatId(isExpanded ? null : beat.id)}
                        className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Psychological & Visual Mechanics */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-[#1c2636] grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="bg-[#0e141e] p-3 rounded-lg border border-[#1a2332] space-y-1">
                        <div className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                          Viewer Knowledge State:
                        </div>
                        <p className="text-stone-300">{beat.viewerCurrentKnowledge}</p>
                      </div>

                      <div className="bg-[#0e141e] p-3 rounded-lg border border-[#1a2332] space-y-1">
                        <div className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                          Curiosity Propulsion:
                        </div>
                        <p className="text-stone-300">{beat.viewerCuriosityDriver}</p>
                      </div>

                      <div className="bg-[#0e141e] p-3 rounded-lg border border-[#1a2332] space-y-1">
                        <div className="text-[10px] font-mono uppercase text-stone-400 font-bold">
                          Dramatic Shift:
                        </div>
                        <p className="text-stone-300">{beat.dramaticShift}</p>
                      </div>

                      <div className="bg-[#0e141e] p-3 rounded-lg border border-[#1a2332] space-y-1">
                        <div className="text-[10px] font-mono uppercase text-stone-400 font-bold">
                          Suggested Visual Treatment:
                        </div>
                        <p className="text-stone-300 italic">{beat.suggestedVisualStyle}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Granular Section Regeneration Modal */}
      {selectedBeatForRegen && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-[#27354a] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222c3d] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-stone-100 font-bold text-sm">
                  Regenerate Beat #{selectedBeatForRegen.beatNumber}: {selectedBeatForRegen.title}
                </h3>
              </div>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed bg-[#0e141e] p-3 rounded border border-[#1c2636]">
              {selectedBeatForRegen.summary}
            </p>

            <form onSubmit={handleRegenSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase text-stone-400 mb-1">
                  Creator Editorial Direction:
                </label>
                <textarea
                  rows={3}
                  value={regenDirection}
                  onChange={(e) => setRegenDirection(e.target.value)}
                  placeholder="e.g., Deepen the logistical breakdown of Soviet fuel shortages; make the turning point more sudden..."
                  className="w-full bg-[#18212e] border border-[#2c3a50] rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBeatForRegen(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-sm"
                >
                  {isLoading ? 'Re-writing...' : 'Apply Regeneration'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
