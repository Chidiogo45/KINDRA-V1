import React, { useState } from 'react';
import {
  FileText,
  Clock,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  TrendingDown,
  Volume2,
  HelpCircle,
} from 'lucide-react';
import { ScriptBeat, RetentionAudit, DocumentaryProject } from '../../types';

interface ScriptEditorViewProps {
  project: DocumentaryProject;
  scriptBeats: ScriptBeat[];
  retentionAudit: RetentionAudit | null;
  onGenerateScript: () => void;
  onRegenerateBeat: (beat: ScriptBeat, instruction: string) => void;
  onAuditRetention: () => void;
  onUpdateBeats: (updated: ScriptBeat[]) => void;
  onNextStage: () => void;
  isLoading: boolean;
}

export const ScriptEditorView: React.FC<ScriptEditorViewProps> = ({
  project,
  scriptBeats,
  retentionAudit,
  onGenerateScript,
  onRegenerateBeat,
  onAuditRetention,
  onUpdateBeats,
  onNextStage,
  isLoading,
}) => {
  const [selectedBeatForRewrite, setSelectedBeatForRewrite] = useState<ScriptBeat | null>(null);
  const [rewritePrompt, setRewritePrompt] = useState('');
  const [activeBeatId, setActiveBeatId] = useState<string | null>(scriptBeats[0]?.id || null);

  const totalWords = scriptBeats.reduce((acc, b) => acc + (b.wordCount || 0), 0);
  const totalSeconds = scriptBeats.reduce((acc, b) => acc + (b.estimatedDurationSeconds || 0), 0);
  const targetWords = project.targetDurationMinutes * project.targetWpm;
  const wordDiffPercent = Math.round(((totalWords - targetWords) / targetWords) * 100);

  const handleTextChange = (beatId: string, text: string) => {
    const words = text.trim().split(/\s+/).filter(Boolean).length;
    const estSeconds = Math.round((words / (project.targetWpm || 145)) * 60);

    const updated = scriptBeats.map((b) => {
      if (b.id === beatId) {
        return {
          ...b,
          narrationText: text,
          wordCount: words,
          estimatedDurationSeconds: estSeconds,
        };
      }
      return b;
    });
    onUpdateBeats(updated);
  };

  const handleDirectiveChange = (beatId: string, directive: string) => {
    const updated = scriptBeats.map((b) => {
      if (b.id === beatId) {
        return { ...b, deliveryDirective: directive };
      }
      return b;
    });
    onUpdateBeats(updated);
  };

  const handleRewriteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBeatForRewrite) return;
    onRegenerateBeat(selectedBeatForRewrite, rewritePrompt);
    setSelectedBeatForRewrite(null);
    setRewritePrompt('');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-amber-500" />
            <h2 className="text-stone-100 font-bold text-lg">Documentary Script & Retention Engine</h2>
          </div>
          <p className="text-stone-400 text-xs">
            Anti-AI natural historian voice, calibrated to {project.targetWpm} WPM documentary pacing with retention audit safeguards.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onGenerateScript}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#192434] hover:bg-[#223046] text-amber-400 font-semibold text-xs transition border border-amber-500/30 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{scriptBeats.length > 0 ? 'Regenerate Entire Script' : 'Draft Full Script'}</span>
          </button>

          {scriptBeats.length > 0 && (
            <button
              onClick={onAuditRetention}
              disabled={isLoading}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a2332] hover:bg-[#233044] text-stone-200 font-semibold text-xs transition border border-[#2d3e58]"
            >
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Run Retention Audit</span>
            </button>
          )}

          {scriptBeats.length > 0 && (
            <button
              onClick={onNextStage}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-sm"
            >
              <span>Verify Facts</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {scriptBeats.length > 0 && (
        <div className="space-y-6">
          {/* Target Duration & Pacing Progress Bar */}
          <div className="bg-[#101622] border border-[#202c3e] rounded-xl p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-4 text-stone-300">
                <span>
                  Words: <strong className="text-amber-300">{totalWords.toLocaleString()}</strong> / ~{targetWords.toLocaleString()} target
                </span>
                <span>•</span>
                <span>
                  Estimated Duration:{' '}
                  <strong className="text-stone-100">
                    {Math.floor(totalSeconds / 60)}m {totalSeconds % 60}s
                  </strong>{' '}
                  ({project.targetDurationMinutes}m target)
                </span>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    Math.abs(wordDiffPercent) <= 10
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {wordDiffPercent > 0 ? `+${wordDiffPercent}% word target` : `${wordDiffPercent}% word target`}
                </span>
              </div>
            </div>

            <div className="w-full bg-stone-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, (totalWords / targetWords) * 100)}%` }}
              />
            </div>
          </div>

          {/* Retention Audit Bar if available */}
          {retentionAudit && (
            <div className="bg-[#121927] border border-[#25364d] rounded-xl p-5 shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-amber-500/15 text-amber-400 font-mono font-black text-xl flex items-center justify-center border border-amber-500/30">
                    {retentionAudit.score}
                  </div>
                  <div>
                    <h3 className="text-xs font-mono uppercase font-bold text-amber-400">
                      Retention & Pacing Audit
                    </h3>
                    <p className="text-stone-300 text-xs">{retentionAudit.overallVerdict}</p>
                  </div>
                </div>
              </div>

              {retentionAudit.issues && retentionAudit.issues.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-[#1e2c3f]">
                  <div className="text-[10px] font-mono uppercase text-stone-400 font-bold">
                    Detected Retention Drag Issues:
                  </div>
                  {retentionAudit.issues.map((iss) => (
                    <div
                      key={iss.id}
                      className="bg-[#0e141f] border border-[#1e2a3c] rounded-lg p-3 text-xs flex flex-col md:flex-row md:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/20">
                            {iss.type}
                          </span>
                          <span className="text-stone-300 font-medium">{iss.description}</span>
                        </div>
                        <p className="text-[11px] text-stone-400 italic">Snippet: "{iss.locationSnippet}"</p>
                      </div>

                      <div className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 px-3 py-1.5 rounded border border-emerald-500/20 shrink-0">
                        Fix: {iss.suggestedFix}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Script Beats Editor */}
          <div className="space-y-4">
            {scriptBeats.map((beat, idx) => (
              <div
                key={beat.id}
                className="bg-[#121824] border border-[#222c3d] rounded-xl p-5 space-y-3 shadow-sm transition"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#1c2636] pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-xs flex items-center justify-center border border-amber-500/30">
                      {beat.beatNumber || idx + 1}
                    </span>
                    <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#1c2534] text-stone-300 border border-[#2a374c]">
                      {beat.beatType}
                    </span>
                    <h3 className="text-stone-100 font-bold text-sm">{beat.title}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] font-mono text-stone-400">
                      {beat.wordCount || 0} words (~{beat.estimatedDurationSeconds || 0}s)
                    </span>

                    <button
                      onClick={() => setSelectedBeatForRewrite(beat)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#18212e] hover:bg-[#223042] text-amber-400 border border-amber-500/20 text-xs font-mono transition"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Rewrite</span>
                    </button>
                  </div>
                </div>

                {/* Spoken Narration Textarea */}
                <div>
                  <textarea
                    rows={4}
                    value={beat.narrationText}
                    onChange={(e) => handleTextChange(beat.id, e.target.value)}
                    className="w-full bg-[#16202d] border border-[#29384e] rounded-lg p-3.5 text-xs md:text-sm text-stone-100 leading-relaxed focus:outline-none focus:border-amber-500 font-serif"
                    placeholder="Documentary spoken narration text..."
                  />
                </div>

                {/* Delivery Directive */}
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 bg-[#0e141f] p-2.5 rounded-lg border border-[#1b2535]">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-amber-400 shrink-0">
                    <Volume2 className="w-3.5 h-3.5" />
                    <span>Voice Actor Directive:</span>
                  </div>
                  <input
                    type="text"
                    value={beat.deliveryDirective || ''}
                    onChange={(e) => handleDirectiveChange(beat.id, e.target.value)}
                    placeholder="e.g. Measured, atmospheric cadence; deliberate pause before stating the casualty count..."
                    className="w-full bg-transparent text-xs text-stone-300 focus:outline-none font-mono placeholder-stone-600"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Granular Rewrite Modal */}
      {selectedBeatForRewrite && (
        <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#121824] border border-[#27354a] rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[#222c3d] pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-500" />
                <h3 className="text-stone-100 font-bold text-sm">
                  Rewrite Beat #{selectedBeatForRewrite.beatNumber}: {selectedBeatForRewrite.title}
                </h3>
              </div>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed bg-[#0e141e] p-3 rounded border border-[#1c2636] font-serif">
              "{selectedBeatForRewrite.narrationText}"
            </p>

            <form onSubmit={handleRewriteSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-mono uppercase text-stone-400 mb-1">
                  Rewrite Directives & Factual Emphasis:
                </label>
                <textarea
                  rows={3}
                  value={rewritePrompt}
                  onChange={(e) => setRewritePrompt(e.target.value)}
                  placeholder="e.g. Enhance concrete names of divisions, remove any generic cliches, tighten pacing for higher tension..."
                  className="w-full bg-[#18212e] border border-[#2c3a50] rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedBeatForRewrite(null)}
                  className="px-3 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs shadow-sm"
                >
                  {isLoading ? 'Rewriting...' : 'Apply Rewrite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
