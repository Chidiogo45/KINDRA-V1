import React from 'react';
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  HelpCircle,
  XCircle,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  BookOpen,
} from 'lucide-react';
import { FactCheckReport, DocumentaryProject } from '../../types';
import { FactCheckBadge } from '../common/ScoreBadge';

interface FactCheckViewProps {
  project: DocumentaryProject;
  factCheckReport: FactCheckReport | null;
  onRunFactCheck: () => void;
  onNextStage: () => void;
  isLoading: boolean;
}

export const FactCheckView: React.FC<FactCheckViewProps> = ({
  project,
  factCheckReport,
  onRunFactCheck,
  onNextStage,
  isLoading,
}) => {
  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Header */}
      <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <h2 className="text-stone-100 font-bold text-lg">Historical Fact-Check & Verification Report</h2>
          </div>
          <p className="text-stone-400 text-xs">
            Sentence-by-sentence evaluation against primary archives and academic historiography.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRunFactCheck}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#192434] hover:bg-[#223046] text-amber-400 font-semibold text-xs transition border border-amber-500/30 disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{factCheckReport ? 'Re-Run Verification' : 'Execute Fact-Check Scan'}</span>
          </button>

          {factCheckReport && (
            <button
              onClick={onNextStage}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-sm"
            >
              <span>Produce Voiceover</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {factCheckReport && (
        <div className="space-y-6">
          {/* Summary Metric Counters */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-[#121824] border border-emerald-500/30 rounded-xl p-4 text-center">
              <div className="text-[10px] font-mono uppercase text-stone-400">Verified Claims</div>
              <div className="text-2xl font-black text-emerald-400 mt-1 font-mono">
                {factCheckReport.verifiedCount || 0}
              </div>
            </div>

            <div className="bg-[#121824] border border-sky-500/30 rounded-xl p-4 text-center">
              <div className="text-[10px] font-mono uppercase text-stone-400">Supported</div>
              <div className="text-2xl font-black text-sky-400 mt-1 font-mono">
                {factCheckReport.supportedCount || 0}
              </div>
            </div>

            <div className="bg-[#121824] border border-amber-500/30 rounded-xl p-4 text-center">
              <div className="text-[10px] font-mono uppercase text-stone-400">Disputed</div>
              <div className="text-2xl font-black text-amber-400 mt-1 font-mono">
                {factCheckReport.disputedCount || 0}
              </div>
            </div>

            <div className="bg-[#121824] border border-stone-700 rounded-xl p-4 text-center">
              <div className="text-[10px] font-mono uppercase text-stone-400">Unverified</div>
              <div className="text-2xl font-black text-stone-300 mt-1 font-mono">
                {factCheckReport.unverifiedCount || 0}
              </div>
            </div>

            <div className="bg-[#121824] border border-rose-500/30 rounded-xl p-4 text-center">
              <div className="text-[10px] font-mono uppercase text-stone-400">Incorrect</div>
              <div className="text-2xl font-black text-rose-400 mt-1 font-mono">
                {factCheckReport.incorrectCount || 0}
              </div>
            </div>
          </div>

          {/* Fact Check Items */}
          <div className="space-y-3">
            {factCheckReport.items?.map((item) => (
              <div
                key={item.id}
                className="bg-[#121824] border border-[#222c3d] rounded-xl p-5 space-y-3 shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1c2636] pb-2.5">
                  <div className="flex items-center gap-2">
                    <FactCheckBadge status={item.status} />
                    <span className="text-[11px] font-mono text-stone-400">
                      Evaluated against verified archives
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-stone-400">Script Narration Sentence:</div>
                  <p className="text-stone-100 text-xs md:text-sm font-serif italic bg-[#0e141f] p-3 rounded border border-[#1b2535]">
                    "{item.sentence}"
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                      Extracted Claim:
                    </span>
                    <p className="text-stone-300">{item.extractedClaim}</p>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase text-emerald-400 font-bold">
                      Evidence & Source Reference:
                    </span>
                    <p className="text-stone-300">{item.evidenceFound}</p>
                    {item.sourceReference && (
                      <p className="text-[11px] text-stone-400 font-mono">
                        Ref: {item.sourceReference}
                      </p>
                    )}
                  </div>
                </div>

                {item.suggestedCorrection && (
                  <div className="text-xs text-rose-300 font-mono bg-rose-500/10 p-2.5 rounded border border-rose-500/20">
                    <strong>Suggested Correction:</strong> {item.suggestedCorrection}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
