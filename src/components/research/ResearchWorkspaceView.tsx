import React, { useState } from 'react';
import {
  Search,
  BookOpen,
  Calendar,
  Users,
  Shield,
  Plus,
  ArrowRight,
  ExternalLink,
  HelpCircle,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { ResearchWorkspaceData, ResearchClaim, TimelineEvent, DocumentaryProject } from '../../types';
import { ConfidenceBadge } from '../common/ScoreBadge';

interface ResearchWorkspaceViewProps {
  project: DocumentaryProject;
  researchData: ResearchWorkspaceData | null;
  onRunResearch: () => void;
  onUpdateResearch: (updated: ResearchWorkspaceData) => void;
  onNextStage: () => void;
  isLoading: boolean;
}

export const ResearchWorkspaceView: React.FC<ResearchWorkspaceViewProps> = ({
  project,
  researchData,
  onRunResearch,
  onUpdateResearch,
  onNextStage,
  isLoading,
}) => {
  const [activeTab, setActiveTab] = useState<'claims' | 'timeline' | 'entities' | 'disputes'>('claims');
  const [newClaimText, setNewClaimText] = useState('');
  const [newClaimSource, setNewClaimSource] = useState('');
  const [showAddClaim, setShowAddClaim] = useState(false);

  const handleAddClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClaimText.trim() || !researchData) return;

    const newClaim: ResearchClaim = {
      id: `clm_user_${Date.now()}`,
      claim: newClaimText.trim(),
      category: 'FACT',
      primarySource: newClaimSource.trim() || 'Creator Archive Reference',
      sourceType: 'Primary Archive',
      confidence: 'HIGH',
      verified: true,
      supportingEvidence: 'Manually verified and provided by creator from archival records.',
    };

    const updated = {
      ...researchData,
      claims: [newClaim, ...(researchData.claims || [])],
    };
    onUpdateResearch(updated);
    setNewClaimText('');
    setNewClaimSource('');
    setShowAddClaim(false);
  };

  const handleToggleVerify = (claimId: string) => {
    if (!researchData) return;
    const updatedClaims = researchData.claims.map((c) => {
      if (c.id === claimId) {
        return { ...c, verified: !c.verified };
      }
      return c;
    });
    onUpdateResearch({ ...researchData, claims: updatedClaims });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-amber-500" />
            <h2 className="text-stone-100 font-bold text-lg">Historical Research & Source Hierarchy</h2>
          </div>
          <p className="text-stone-400 text-xs">
            Multi-source historical claim extraction, primary archive traceability, and transparent uncertainty tracking.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onRunResearch}
            disabled={isLoading}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#192434] hover:bg-[#223046] text-amber-400 font-semibold text-xs transition border border-amber-500/30 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            <span>{isLoading ? 'Synthesizing...' : 'Run Deep Historical Research'}</span>
          </button>

          {researchData && (
            <button
              onClick={onNextStage}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-sm"
            >
              <span>Build Outline</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {researchData && (
        <div className="space-y-6">
          {/* Historical Briefing Summary */}
          <div className="bg-[#101622] border border-[#202c3e] rounded-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                Operational Briefing & Thesis
              </span>
              <span className="text-[11px] font-mono text-stone-400">
                Subject: <strong className="text-stone-300">{researchData.subject}</strong>
              </span>
            </div>
            <p className="text-stone-200 text-xs leading-relaxed">{researchData.topicSummary}</p>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center justify-between border-b border-[#222c3d] pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('claims')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'claims'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-[#161f2b]'
                }`}
              >
                Fact Sheet ({researchData.claims?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('timeline')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'timeline'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-[#161f2b]'
                }`}
              >
                Chronological Timeline ({researchData.timeline?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('entities')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'entities'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-[#161f2b]'
                }`}
              >
                Key People & Equipment
              </button>

              <button
                onClick={() => setActiveTab('disputes')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'disputes'
                    ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-[#161f2b]'
                }`}
              >
                Disputed Points & Historiography
              </button>
            </div>

            {activeTab === 'claims' && (
              <button
                onClick={() => setShowAddClaim(!showAddClaim)}
                className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-mono transition"
              >
                <Plus className="w-4 h-4" />
                <span>Add Primary Claim</span>
              </button>
            )}
          </div>

          {/* Add Claim Form */}
          {showAddClaim && (
            <form onSubmit={handleAddClaim} className="bg-[#141d2a] border border-[#2b3a4f] rounded-xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-stone-200">Inject Archival Claim</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  value={newClaimText}
                  onChange={(e) => setNewClaimText(e.target.value)}
                  placeholder="Factual statement with specific numbers, dates, or orders..."
                  className="bg-[#101622] border border-[#273549] rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500 md:col-span-2"
                />
                <input
                  type="text"
                  value={newClaimSource}
                  onChange={(e) => setNewClaimSource(e.target.value)}
                  placeholder="Primary Archive reference (e.g. NARA T-311 Roll 268 / War Diary)..."
                  className="bg-[#101622] border border-[#273549] rounded-lg px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500 md:col-span-2"
                />
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddClaim(false)}
                  className="px-3 py-1.5 rounded-lg text-xs text-stone-400 hover:text-stone-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs"
                >
                  Save to Fact Sheet
                </button>
              </div>
            </form>
          )}

          {/* TAB 1: Fact Sheet Claims */}
          {activeTab === 'claims' && (
            <div className="space-y-3">
              {researchData.claims?.map((item) => (
                <div
                  key={item.id}
                  className={`bg-[#121824] border rounded-xl p-4 transition ${
                    item.verified ? 'border-[#222c3d]' : 'border-amber-500/30'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-[#1c2534] text-stone-300 border border-[#2a374c]">
                          {item.category}
                        </span>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-sky-500/10 text-sky-300 border border-sky-500/20">
                          {item.sourceType}
                        </span>
                        <ConfidenceBadge level={item.confidence} />
                      </div>

                      <p className="text-stone-100 text-xs md:text-sm font-medium leading-relaxed">
                        {item.claim}
                      </p>

                      <div className="text-[11px] text-stone-400 font-mono flex items-center gap-1.5">
                        <strong className="text-amber-400">Source:</strong> {item.primarySource}
                      </div>

                      {item.supportingEvidence && (
                        <p className="text-[11px] text-stone-400 italic bg-[#0e141f] p-2 rounded border border-[#1b2432]">
                          Evidence: {item.supportingEvidence}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 pt-2 md:pt-0">
                      <label className="flex items-center gap-1.5 text-xs text-stone-400 cursor-pointer font-mono select-none">
                        <input
                          type="checkbox"
                          checked={item.verified}
                          onChange={() => handleToggleVerify(item.id)}
                          className="rounded bg-stone-900 border-stone-700 text-amber-500 focus:ring-0"
                        />
                        <span>Verified</span>
                      </label>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: Chronological Timeline */}
          {activeTab === 'timeline' && (
            <div className="space-y-3 relative before:absolute before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#222c3d]">
              {researchData.timeline?.map((ev) => (
                <div key={ev.id} className="relative pl-10">
                  <div className="absolute left-2.5 top-3.5 w-3.5 h-3.5 rounded-full bg-amber-500 border-4 border-[#121824]" />

                  <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-4 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                          {ev.dateStr}
                        </span>
                        <h4 className="text-stone-100 font-bold text-sm">{ev.title}</h4>
                      </div>
                      <span className="text-[11px] font-mono text-stone-400">
                        Ref: {ev.sourceRef}
                      </span>
                    </div>

                    <p className="text-stone-300 text-xs leading-relaxed">{ev.description}</p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] font-mono pt-2 border-t border-[#1c2636]">
                      <div className="text-stone-400">
                        <span className="text-stone-300">Location:</span> {ev.location}
                      </div>
                      <div className="text-stone-400">
                        <span className="text-stone-300">Key Actors:</span> {ev.keyActors?.join(', ')}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 3: Key People & Equipment */}
          {activeTab === 'entities' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* People */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Key Historical Commanders
                </h3>
                {researchData.people?.map((p) => (
                  <div key={p.id} className="bg-[#121824] border border-[#222c3d] rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-stone-100 font-bold text-xs">{p.name}</h4>
                      <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded">
                        {p.roleOrType}
                      </span>
                    </div>
                    <p className="text-stone-300 text-xs">{p.historicalContext}</p>
                    {p.keyActions && (
                      <ul className="text-[11px] text-stone-400 font-mono list-disc list-inside">
                        {p.keyActions.map((act, i) => (
                          <li key={i}>{act}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>

              {/* Units & Equipment */}
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold flex items-center gap-1.5">
                  <Layers className="w-4 h-4" /> Military Units & Equipment Specs
                </h3>
                {researchData.unitsAndEquipment?.map((u) => (
                  <div key={u.id} className="bg-[#121824] border border-[#222c3d] rounded-xl p-4 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <h4 className="text-stone-100 font-bold text-xs">{u.name}</h4>
                      <span className="text-[10px] font-mono text-sky-300 bg-sky-500/10 px-2 py-0.5 rounded">
                        {u.roleOrType}
                      </span>
                    </div>
                    {u.equipmentSpecs && (
                      <div className="text-[11px] font-mono text-amber-300 bg-[#0e141f] p-1.5 rounded border border-[#1d2737]">
                        Specs: {u.equipmentSpecs}
                      </div>
                    )}
                    <p className="text-stone-300 text-xs">{u.historicalContext}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: Disputed Points & Open Questions */}
          {activeTab === 'disputes' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Contested Points & Historiographical Debates
                </h3>
                {researchData.disputedPoints?.map((d, i) => (
                  <div key={i} className="bg-[#121824] border border-[#222c3d] rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-stone-100 font-bold text-xs">{d.issue}</h4>
                      <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                        {d.status}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                      <div className="bg-[#0e141e] p-3 rounded-lg border border-[#1c2636]">
                        <span className="text-[10px] font-mono text-stone-400 block mb-1 uppercase font-bold">
                          Perspective A:
                        </span>
                        <p className="text-stone-300">{d.sideA}</p>
                      </div>
                      <div className="bg-[#0e141e] p-3 rounded-lg border border-[#1c2636]">
                        <span className="text-[10px] font-mono text-stone-400 block mb-1 uppercase font-bold">
                          Perspective B:
                        </span>
                        <p className="text-stone-300">{d.sideB}</p>
                      </div>
                    </div>

                    <div className="text-[11px] font-mono text-emerald-300 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                      <strong>Modern Consensus:</strong> {d.evidenceSummary}
                    </div>
                  </div>
                ))}
              </div>

              {researchData.openQuestions && researchData.openQuestions.length > 0 && (
                <div className="bg-[#101622] border border-[#202c3e] rounded-xl p-4 space-y-2">
                  <h4 className="text-xs font-mono uppercase tracking-wider text-stone-400 font-bold">
                    Open Historical Questions
                  </h4>
                  <ul className="text-xs text-stone-300 space-y-1 list-disc list-inside">
                    {researchData.openQuestions.map((q, i) => (
                      <li key={i}>{q}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
