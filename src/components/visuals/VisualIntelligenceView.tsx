import React, { useState } from 'react';
import {
  Image,
  Sparkles,
  Search,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Shield,
  Layers,
  ArrowRight,
  Clock,
  HelpCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { VisualCue, VisualAsset, DocumentaryProject, ScriptBeat } from '../../types';
import {
  ConfidenceBadge,
  RightsBadge,
  MatchHierarchyBadge,
} from '../common/ScoreBadge';

interface VisualIntelligenceViewProps {
  project: DocumentaryProject;
  scriptBeats: ScriptBeat[];
  visualCues: VisualCue[];
  visualAssets: VisualAsset[];
  onExtractCues: () => void;
  onSearchAssets: (query: string, cue?: VisualCue, fallbackBroaden?: boolean) => void;
  onSelectAssetForCue: (cueId: string, asset: VisualAsset) => void;
  onNextStage: () => void;
  isLoading: boolean;
}

export const VisualIntelligenceView: React.FC<VisualIntelligenceViewProps> = ({
  project,
  scriptBeats,
  visualCues,
  visualAssets,
  onExtractCues,
  onSearchAssets,
  onSelectAssetForCue,
  onNextStage,
  isLoading,
}) => {
  const [selectedCueId, setSelectedCueId] = useState<string | null>(visualCues[0]?.id || null);
  const [customSearchQuery, setCustomSearchQuery] = useState('');

  const activeCue = visualCues.find((c) => c.id === selectedCueId) || visualCues[0];
  const assignedAssets = visualAssets.filter((a) => a.cueId === activeCue?.id);

  const handleSearchCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customSearchQuery.trim()) return;
    onSearchAssets(customSearchQuery.trim(), activeCue, false);
  };

  const totalCuesCount = visualCues.length;
  const resolvedCuesCount = visualCues.filter((c) => c.selectedAssetId).length;

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Image className="w-5 h-5 text-amber-500" />
            <h2 className="text-stone-100 font-bold text-lg">Archival Visual Intelligence & Match Hierarchy</h2>
          </div>
          <p className="text-stone-400 text-xs">
            Precise 3-5s visual rhythm calibration, verified archival collection queries, and transparent substitute labeling.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onExtractCues}
            disabled={isLoading || scriptBeats.length === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#192434] hover:bg-[#223046] text-amber-400 font-semibold text-xs transition border border-amber-500/30 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{visualCues.length > 0 ? 'Re-Analyze Script Cues' : 'Extract Visual Cues (3-5s Rhythm)'}</span>
          </button>

          {visualCues.length > 0 && (
            <button
              onClick={onNextStage}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-sm"
            >
              <span>Rough Cut Timeline</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {visualCues.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Visual Cues List (3-5s rhythm) */}
          <div className="lg:col-span-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                Script Visual Cues ({resolvedCuesCount}/{totalCuesCount} Assigned)
              </h3>
              <span className="text-[11px] font-mono text-stone-400">~3-5s per asset</span>
            </div>

            <div className="space-y-2.5 max-h-[750px] overflow-y-auto pr-1">
              {visualCues.map((cue, idx) => {
                const isSelected = cue.id === activeCue?.id;
                const isAssigned = !!cue.selectedAssetId;

                return (
                  <div
                    key={cue.id}
                    onClick={() => setSelectedCueId(cue.id)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer space-y-2 ${
                      isSelected
                        ? 'bg-[#182333] border-amber-500 shadow-md ring-1 ring-amber-500/50'
                        : 'bg-[#121824] border-[#222c3d] hover:border-stone-600'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono font-bold text-amber-300 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30">
                          #{cue.cueNumber || idx + 1}
                        </span>
                        <span className="text-[11px] font-mono text-stone-400">
                          {cue.timestampStart}s - {cue.timestampEnd}s ({cue.duration}s)
                        </span>
                      </div>

                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded ${
                          isAssigned
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        }`}
                      >
                        {isAssigned ? 'MATCHED' : 'AWAITING ASSET'}
                      </span>
                    </div>

                    <p className="text-stone-100 text-xs font-medium leading-snug line-clamp-2">
                      {cue.requiredMeaning}
                    </p>

                    <div className="text-[11px] text-stone-400 line-clamp-1 italic font-serif">
                      Narration: "{cue.narrationSnippet}"
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Archival Asset Discovery & Inspector */}
          <div className="lg:col-span-7 space-y-4">
            {activeCue ? (
              <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-5 space-y-5">
                {/* Active Cue Details */}
                <div className="space-y-2 border-b border-[#1c2636] pb-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider">
                      Target Cue #{activeCue.cueNumber} ({activeCue.duration}s duration)
                    </span>
                    <span className="text-[11px] font-mono text-stone-400 uppercase">
                      Type: {activeCue.preferredVisualType}
                    </span>
                  </div>

                  <h3 className="text-stone-100 font-bold text-sm leading-snug">
                    {activeCue.requiredMeaning}
                  </h3>

                  <div className="text-xs text-stone-300 bg-[#0e141f] p-3 rounded-lg border border-[#1a2332] space-y-1">
                    <div className="text-[10px] font-mono uppercase text-amber-400 font-bold">
                      Preferred Representation:
                    </div>
                    <p>{activeCue.preferredRepresentation}</p>
                  </div>

                  {activeCue.acceptableAlternatives && activeCue.acceptableAlternatives.length > 0 && (
                    <div className="text-[11px] text-stone-400 font-mono">
                      <span className="text-stone-300 font-semibold">Acceptable Alternatives:</span>{' '}
                      {activeCue.acceptableAlternatives.join('; ')}
                    </div>
                  )}
                </div>

                {/* Archival Search Bar */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono text-stone-300 uppercase">
                      Search Archival Collections (Bundesarchiv, NARA, Wikimedia)
                    </span>
                  </div>

                  <form onSubmit={handleSearchCustom} className="flex gap-2">
                    <input
                      type="text"
                      value={customSearchQuery}
                      onChange={(e) => setCustomSearchQuery(e.target.value)}
                      placeholder={activeCue.searchQueries?.[0] || 'Search archival photographs, maps, or records...'}
                      className="flex-1 bg-[#16202d] border border-[#29384e] rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                    />
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="px-4 py-2 rounded-lg bg-[#18212e] hover:bg-[#233042] text-amber-400 border border-amber-500/30 text-xs font-bold transition"
                    >
                      <Search className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onSearchAssets('', activeCue, true)}
                      disabled={isLoading}
                      className="px-3 py-2 rounded-lg bg-[#18212e] hover:bg-[#233042] text-stone-300 border border-[#2b3a4f] text-xs font-mono transition"
                      title="Broaden to campaign/theatre level"
                    >
                      Broaden Query
                    </button>
                  </form>
                </div>

                {/* Search Results / Candidates */}
                <div className="space-y-4 pt-2">
                  <h4 className="text-xs font-mono uppercase text-stone-400 font-bold">
                    Archival Visual Candidates ({assignedAssets.length} Available)
                  </h4>

                  {assignedAssets.length === 0 ? (
                    <div className="bg-[#0e141f] border border-[#1b2535] rounded-xl p-8 text-center space-y-3">
                      <Search className="w-8 h-8 text-stone-600 mx-auto" />
                      <p className="text-xs text-stone-400">
                        No assets fetched yet for this cue. Click search above to query historical collections.
                      </p>
                      <button
                        onClick={() => onSearchAssets(activeCue.searchQueries?.[0] || activeCue.requiredMeaning, activeCue)}
                        className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition"
                      >
                        Auto-Search Archival Collections
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {assignedAssets.map((asset) => {
                        const isAssignedToCue = activeCue.selectedAssetId === asset.id;

                        return (
                          <div
                            key={asset.id}
                            className={`bg-[#0e141f] border rounded-xl p-4 space-y-3 transition ${
                              isAssignedToCue ? 'border-amber-500 bg-[#121a26]' : 'border-[#1e2a3c]'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row gap-4">
                              {/* Thumbnail preview */}
                              <div className="w-full sm:w-44 h-32 bg-stone-900 rounded-lg overflow-hidden shrink-0 border border-stone-800 relative group">
                                <img
                                  src={asset.thumbnailUrl || asset.fullImageUrl}
                                  alt={asset.title}
                                  referrerPolicy="no-referrer"
                                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                                />
                                <div className="absolute top-2 left-2">
                                  <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-stone-950/80 text-amber-400 border border-amber-500/40">
                                    {asset.matchScore}% MATCH
                                  </span>
                                </div>
                              </div>

                              {/* Asset Details */}
                              <div className="space-y-2 flex-1">
                                <div className="flex flex-wrap items-center gap-1.5">
                                  <MatchHierarchyBadge level={asset.hierarchyLevel} />
                                  <RightsBadge status={asset.rightsStatus} license={asset.license} />
                                  <ConfidenceBadge level={asset.historicalConfidence} />
                                </div>

                                <h5 className="text-stone-100 font-bold text-xs leading-snug">{asset.title}</h5>

                                <p className="text-stone-300 text-xs line-clamp-2 leading-relaxed">
                                  {asset.description}
                                </p>

                                <div className="text-[11px] text-stone-400 font-mono flex flex-wrap items-center gap-x-4 gap-y-1">
                                  <span>
                                    <strong>Source:</strong> {asset.sourceInstitution}
                                  </span>
                                  {asset.dateOrPeriod && (
                                    <span>
                                      <strong>Date:</strong> {asset.dateOrPeriod}
                                    </span>
                                  )}
                                  {asset.location && (
                                    <span>
                                      <strong>Location:</strong> {asset.location}
                                    </span>
                                  )}
                                </div>

                                {/* Illustrative Substitute Notice */}
                                {asset.isIllustrativeSubstitute && (
                                  <div className="text-[11px] font-mono text-amber-300 bg-amber-500/10 p-2 rounded border border-amber-500/20">
                                    <strong>Illustrative Substitute:</strong> {asset.substituteExplanation || 'Used to accurately depict theater conditions.'}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Attribution & Selection Bar */}
                            <div className="pt-3 border-t border-[#1c2636] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                              <div className="text-[10px] font-mono text-stone-400 truncate max-w-sm">
                                Attribution: {asset.attributionRequirement}
                              </div>

                              <button
                                onClick={() => onSelectAssetForCue(activeCue.id, asset)}
                                className={`px-4 py-1.5 rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 ${
                                  isAssignedToCue
                                    ? 'bg-emerald-500 text-stone-950'
                                    : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                                }`}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>{isAssignedToCue ? 'Assigned to Cue' : 'Assign to Timeline'}</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center p-12 text-stone-500">Select a cue to search visual assets.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
