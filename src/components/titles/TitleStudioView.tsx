import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Flame,
  Search,
  Check,
  RefreshCw,
  Sliders,
  ArrowRight,
  ShieldCheck,
  Bookmark,
  Edit3,
  Lightbulb,
  FileText,
  TrendingUp,
  Eye,
  Lock,
  Unlock,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  DocumentaryProject,
  ResearchedTitleAnalysis,
  GeneratedTitleCandidate,
  TitleStudioData,
} from '../../types';
import { ApiClient } from '../../services/api';

interface TitleStudioViewProps {
  project: DocumentaryProject;
  onUpdateProject: (updated: Partial<DocumentaryProject>) => void;
  onNextStage: () => void;
}

export const TitleStudioView: React.FC<TitleStudioViewProps> = ({
  project,
  onUpdateProject,
  onNextStage,
}) => {
  const currentTopic = project.subject || project.topic || project.title || 'Battle of Kharkov 1943';
  const currentAngle = project.selectedAngle || project.marketData?.angles?.[0];

  const [researchedTitles, setResearchedTitles] = useState<ResearchedTitleAnalysis[]>(
    project.titleStudioData?.researchedTitles || []
  );
  const [candidates, setCandidates] = useState<GeneratedTitleCandidate[]>(
    project.titleStudioData?.candidates || []
  );
  const [selectedInspiration, setSelectedInspiration] = useState<ResearchedTitleAnalysis | null>(
    null
  );
  const [approvedTitle, setApprovedTitle] = useState<string>(
    project.approvedTitle || project.title || ''
  );
  const [approvedCandidate, setApprovedCandidate] = useState<GeneratedTitleCandidate | null>(
    project.approvedTitleCandidate || null
  );

  const [isLoadingResearch, setIsLoadingResearch] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [customInstruction, setCustomInstruction] = useState('');
  const [activeMode, setActiveMode] = useState<string>('default');
  const [editingCandidateId, setEditingCandidateId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Load initial research and titles if empty
  useEffect(() => {
    if (researchedTitles.length === 0) {
      handleLoadResearch();
    }
  }, [currentTopic]);

  const handleLoadResearch = async (refresh = false) => {
    setIsLoadingResearch(true);
    setStatusMessage('Analyzing high-performing documentary titles and rhetorical blueprints...');
    try {
      const data = await ApiClient.researchTitles(
        currentTopic,
        currentAngle?.titleProposal,
        currentAngle?.centralQuestion,
        project.niche || 'World War II Documentaries',
        refresh
      );
      if (data && data.length > 0) {
        setResearchedTitles(data);
        if (candidates.length === 0) {
          // Auto generate initial candidate set
          handleGenerateCandidates({
            researchedList: data,
            inspiration: data[0],
            mode: 'default',
          });
        }
      }
    } catch (err: any) {
      console.warn('[TitleStudio] Research load failed:', err.message);
    } finally {
      setIsLoadingResearch(false);
      setStatusMessage(null);
    }
  };

  const handleGenerateCandidates = async (options?: {
    researchedList?: ResearchedTitleAnalysis[];
    inspiration?: ResearchedTitleAnalysis | null;
    mode?: string;
    instruction?: string;
  }) => {
    const insp = options?.inspiration !== undefined ? options.inspiration : selectedInspiration;
    const mode = options?.mode || activeMode;
    const inst = options?.instruction !== undefined ? options.instruction : customInstruction;

    setIsGenerating(true);
    setStatusMessage(
      mode === 'similar_structure' && insp
        ? `Generating titles using blueprint "${insp.structure}"...`
        : mode === 'more_curious'
        ? 'Refining candidates for higher historical curiosity...'
        : mode === 'more_direct'
        ? 'Refining candidates for maximum factual clarity...'
        : 'Generating multi-strategy documentary title candidates...'
    );

    try {
      const data = await ApiClient.generateTitles({
        topic: currentTopic,
        angle: currentAngle,
        inspirationTitle: insp?.videoTitle,
        structuralBlueprint: insp?.structure,
        regenerationMode: mode,
        customInstruction: inst.trim() || undefined,
      });

      if (data && data.length > 0) {
        setCandidates(data);

        // Update project state without clearing an already approved title
        const updatedStudioData: TitleStudioData = {
          researchedTitles,
          selectedInspirationTitleId: insp?.id,
          candidates: data,
          approvedTitle: approvedTitle || undefined,
          approvedTitleCandidate: approvedCandidate || undefined,
          activeInstruction: inst,
          lastResearchedAt: new Date().toISOString(),
        };

        onUpdateProject({
          titleStudioData: updatedStudioData,
        });
      }
    } catch (err: any) {
      console.warn('[TitleStudio] Generation failed:', err.message);
    } finally {
      setIsGenerating(false);
      setStatusMessage(null);
    }
  };

  const handleSelectInspiration = (item: ResearchedTitleAnalysis) => {
    setSelectedInspiration(item);
    setActiveMode('similar_structure');
    handleGenerateCandidates({ inspiration: item, mode: 'similar_structure' });
  };

  const handleApproveTitle = (candidate: GeneratedTitleCandidate) => {
    setApprovedTitle(candidate.title);
    setApprovedCandidate(candidate);

    const updatedCandidates = candidates.map((c) => ({
      ...c,
      isApproved: c.id === candidate.id,
    }));
    setCandidates(updatedCandidates);

    const updatedStudioData: TitleStudioData = {
      researchedTitles,
      selectedInspirationTitleId: selectedInspiration?.id,
      candidates: updatedCandidates,
      approvedTitle: candidate.title,
      approvedTitleCandidate: candidate,
      lastResearchedAt: new Date().toISOString(),
    };

    onUpdateProject({
      title: candidate.title,
      approvedTitle: candidate.title,
      approvedTitleCandidate: candidate,
      titleStudioData: updatedStudioData,
    });
  };

  const handleSaveInlineEdit = (candidateId: string) => {
    if (!editingText.trim()) {
      setEditingCandidateId(null);
      return;
    }
    const updated = candidates.map((c) => {
      if (c.id === candidateId) {
        const isCurrentlyApproved = approvedCandidate?.id === candidateId || approvedTitle === c.title;
        if (isCurrentlyApproved) {
          setApprovedTitle(editingText.trim());
          onUpdateProject({ title: editingText.trim(), approvedTitle: editingText.trim() });
        }
        return {
          ...c,
          title: editingText.trim(),
          userEdited: true,
        };
      }
      return c;
    });

    setCandidates(updated);
    setEditingCandidateId(null);

    onUpdateProject({
      titleStudioData: {
        researchedTitles,
        candidates: updated,
        approvedTitle: approvedTitle || undefined,
        approvedTitleCandidate: approvedCandidate || undefined,
      },
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
      {/* Header & Approved Title Banner */}
      <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-6 shadow-md space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="w-5 h-5 text-amber-500" />
              <h2 className="text-stone-100 font-bold text-lg">
                Title Intelligence & Strategy Generator
              </h2>
            </div>
            <p className="text-stone-400 text-xs leading-relaxed max-w-3xl">
              Analyze structural blueprints from high-performing historical videos, generate distinct rhetorical angles, and approve a defensible documentary title.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => handleLoadResearch(true)}
              disabled={isLoadingResearch}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#18212e] hover:bg-[#223046] text-stone-300 text-xs font-mono transition border border-[#2c3a50]"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingResearch ? 'animate-spin' : ''}`} />
              <span>Refresh Market Titles</span>
            </button>

            <button
              onClick={onNextStage}
              className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-md whitespace-nowrap"
            >
              <span>Proceed to Historical Research</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Approved Title Callout */}
        <div className="bg-[#182230] border border-amber-500/30 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                APPROVED DOCUMENTARY TITLE
              </span>
              {approvedCandidate?.strategyLabel && (
                <span className="text-xs font-mono text-stone-400">
                  Strategy: <strong className="text-stone-200">{approvedCandidate.strategyLabel}</strong>
                </span>
              )}
            </div>
            <h3 className="text-base md:text-lg font-bold text-stone-100">
              "{approvedTitle || project.title || 'Untitled Documentary'}"
            </h3>
            {approvedCandidate?.structuralBlueprint && (
              <div className="text-[11px] font-mono text-stone-400">
                Blueprint: <span className="text-amber-400/90">{approvedCandidate.structuralBlueprint}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded border border-emerald-500/20">
              <Check className="w-4 h-4" />
              <span>Title Locked & Active</span>
            </div>
          </div>
        </div>

        {/* Selected Angle Context */}
        {currentAngle && (
          <div className="bg-[#0e141e] border border-[#1f2937] rounded-lg p-3 flex items-center justify-between text-xs text-stone-300">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Active Angle
              </span>
              <span className="font-bold text-stone-100">{currentAngle.titleProposal}</span>
            </div>
            <span className="text-[11px] font-mono text-stone-400 hidden sm:inline">
              Mode: {currentAngle.recommendedNarrativeMode}
            </span>
          </div>
        )}
      </div>

      {/* SECTION 1: Researched High-Performing Video Titles & Blueprints */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-500" />
            <h3 className="text-stone-100 font-bold text-base">
              Researched High-Performing Titles & Structural Blueprints
            </h3>
          </div>
          <span className="text-xs font-mono text-stone-400">
            {researchedTitles.length} analyzed YouTube models
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {researchedTitles.map((item) => {
            const isSelected = selectedInspiration?.id === item.id;

            return (
              <div
                key={item.id}
                className={`bg-[#121824] border rounded-xl p-4 space-y-3.5 transition flex flex-col justify-between ${
                  isSelected
                    ? 'border-amber-500 ring-1 ring-amber-500/50 bg-[#162130]'
                    : 'border-[#222c3d] hover:border-stone-600'
                }`}
              >
                <div className="space-y-2.5">
                  {/* Top Stats */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        {item.viewsPerSubscriber}× VPS
                      </span>
                      <span className="text-[11px] font-bold text-stone-300 truncate max-w-[140px]">
                        {item.channelName}
                      </span>
                    </div>

                    <div className="text-[11px] font-mono font-bold text-stone-200">
                      {item.views.toLocaleString()} views
                    </div>
                  </div>

                  {/* Title */}
                  <h4 className="text-stone-100 font-bold text-xs md:text-sm leading-snug">
                    "{item.videoTitle}"
                  </h4>

                  {/* Structural Blueprint */}
                  <div className="bg-[#0e141e] p-2.5 rounded-lg border border-[#1b2535] space-y-1">
                    <div className="text-[9px] font-mono uppercase tracking-wider text-stone-400">
                      Structural Blueprint:
                    </div>
                    <div className="text-xs font-mono text-amber-400/95 font-semibold">
                      {item.structure}
                    </div>
                  </div>

                  {/* Curiosity mechanism & framing */}
                  <div className="space-y-1 text-[11px] text-stone-300 leading-tight">
                    <div>
                      <strong className="text-stone-400 font-mono">Mechanism:</strong>{' '}
                      {item.curiosityMechanism}
                    </div>
                    <div>
                      <strong className="text-stone-400 font-mono">Framing:</strong>{' '}
                      {item.emotionalFraming}
                    </div>
                    <div>
                      <strong className="text-stone-400 font-mono">Promise:</strong>{' '}
                      <span className="italic text-stone-400">{item.impliedPromise}</span>
                    </div>
                  </div>
                </div>

                {/* Inspiration Action Button */}
                <div className="pt-2 border-t border-[#1d2737] flex items-center justify-between">
                  <span className="text-[10px] font-mono text-stone-400">
                    {item.titleLength} chars • {item.subjectPlacement} subject
                  </span>

                  <button
                    onClick={() => handleSelectInspiration(item)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      isSelected
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-[#1a2536] hover:bg-[#25344c] text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>{isSelected ? 'Inspiration Active' : 'Use as Inspiration'}</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SECTION 2: Title Generation & Regeneration Controls */}
      <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-6 shadow-md space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#1f2a3a]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Sliders className="w-5 h-5 text-amber-500" />
              <h3 className="text-stone-100 font-bold text-base">
                Title Strategy Generator & Regeneration Controls
              </h3>
            </div>
            <p className="text-stone-400 text-xs">
              Generate distinct documentary strategies and apply targeted editorial modifications.
            </p>
          </div>

          {statusMessage && (
            <div className="text-xs font-mono text-amber-300 bg-amber-500/10 px-3 py-1.5 rounded border border-amber-500/30 animate-pulse">
              ⚡ {statusMessage}
            </div>
          )}
        </div>

        {/* Transformation Modes Bar */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => {
              setActiveMode('default');
              handleGenerateCandidates({ mode: 'default' });
            }}
            disabled={isGenerating}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono transition border ${
              activeMode === 'default'
                ? 'bg-amber-500 text-stone-950 border-amber-500'
                : 'bg-[#18212e] text-stone-300 border-[#2c3a50] hover:bg-[#202c3d]'
            }`}
          >
            Regenerate Multi-Strategy
          </button>

          <button
            onClick={() => {
              setActiveMode('similar_structure');
              handleGenerateCandidates({ mode: 'similar_structure' });
            }}
            disabled={isGenerating}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono transition border ${
              activeMode === 'similar_structure'
                ? 'bg-amber-500 text-stone-950 border-amber-500'
                : 'bg-[#18212e] text-stone-300 border-[#2c3a50] hover:bg-[#202c3d]'
            }`}
          >
            Similar Structure
          </button>

          <button
            onClick={() => {
              setActiveMode('more_direct');
              handleGenerateCandidates({ mode: 'more_direct' });
            }}
            disabled={isGenerating}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono transition border ${
              activeMode === 'more_direct'
                ? 'bg-amber-500 text-stone-950 border-amber-500'
                : 'bg-[#18212e] text-stone-300 border-[#2c3a50] hover:bg-[#202c3d]'
            }`}
          >
            More Direct
          </button>

          <button
            onClick={() => {
              setActiveMode('more_curious');
              handleGenerateCandidates({ mode: 'more_curious' });
            }}
            disabled={isGenerating}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono transition border ${
              activeMode === 'more_curious'
                ? 'bg-amber-500 text-stone-950 border-amber-500'
                : 'bg-[#18212e] text-stone-300 border-[#2c3a50] hover:bg-[#202c3d]'
            }`}
          >
            More Curious
          </button>

          <button
            onClick={() => {
              setActiveMode('more_strategic');
              handleGenerateCandidates({ mode: 'more_strategic' });
            }}
            disabled={isGenerating}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono transition border ${
              activeMode === 'more_strategic'
                ? 'bg-amber-500 text-stone-950 border-amber-500'
                : 'bg-[#18212e] text-stone-300 border-[#2c3a50] hover:bg-[#202c3d]'
            }`}
          >
            More Strategic
          </button>

          <button
            onClick={() => {
              setActiveMode('more_human');
              handleGenerateCandidates({ mode: 'more_human' });
            }}
            disabled={isGenerating}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono transition border ${
              activeMode === 'more_human'
                ? 'bg-amber-500 text-stone-950 border-amber-500'
                : 'bg-[#18212e] text-stone-300 border-[#2c3a50] hover:bg-[#202c3d]'
            }`}
          >
            More Human
          </button>

          <button
            onClick={() => {
              setActiveMode('shorter');
              handleGenerateCandidates({ mode: 'shorter' });
            }}
            disabled={isGenerating}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold font-mono transition border ${
              activeMode === 'shorter'
                ? 'bg-amber-500 text-stone-950 border-amber-500'
                : 'bg-[#18212e] text-stone-300 border-[#2c3a50] hover:bg-[#202c3d]'
            }`}
          >
            Shorter
          </button>
        </div>

        {/* Custom Instruction Input */}
        <div className="flex gap-2">
          <input
            type="text"
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            placeholder="Custom directive (e.g., 'Emphasize the intelligence breakdown on February 18th')..."
            className="flex-1 bg-[#18212e] border border-[#2c3a50] rounded-lg px-4 py-2.5 text-sm text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={() => {
              setActiveMode('custom_instruction');
              handleGenerateCandidates({ mode: 'custom_instruction' });
            }}
            disabled={isGenerating || !customInstruction.trim()}
            className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-sm disabled:opacity-50"
          >
            Apply Instruction
          </button>
        </div>
      </div>

      {/* SECTION 3: Title Comparison View & Quality Control Scores */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-amber-500" />
            <h3 className="text-stone-100 font-bold text-base">
              Title Candidate Comparison & Editorial Quality Control
            </h3>
          </div>
          <span className="text-[11px] font-mono text-stone-400 italic">
            * Editorial AI assessments, not predictions of YouTube algorithmic performance.
          </span>
        </div>

        {/* Comparison Table / Cards */}
        <div className="space-y-3">
          {candidates.map((cand, idx) => {
            const isApproved = approvedTitle === cand.title || cand.isApproved;
            const isEditing = editingCandidateId === cand.id;

            return (
              <div
                key={cand.id || idx}
                className={`bg-[#121824] border rounded-xl p-5 transition space-y-4 ${
                  isApproved
                    ? 'border-amber-500 ring-1 ring-amber-500/50 bg-[#162130]'
                    : 'border-[#222c3d] hover:border-stone-600'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  {/* Title & Strategy */}
                  <div className="space-y-2 flex-1 max-w-4xl">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                        {cand.strategyLabel || cand.strategy}
                      </span>
                      {isApproved && (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold">
                          ✓ APPROVED FOR SCRIPT
                        </span>
                      )}
                      {cand.structuralBlueprint && (
                        <span className="text-[11px] font-mono text-stone-400">
                          {cand.structuralBlueprint}
                        </span>
                      )}
                    </div>

                    {isEditing ? (
                      <div className="flex items-center gap-2 pt-1">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="flex-1 bg-[#18212e] border border-amber-500 rounded-lg px-3 py-2 text-sm text-stone-100 focus:outline-none"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveInlineEdit(cand.id)}
                          className="px-3 py-2 rounded bg-amber-500 text-stone-950 font-bold text-xs"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingCandidateId(null)}
                          className="px-3 py-2 rounded bg-stone-800 text-stone-300 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2.5 group">
                        <h4 className="text-base font-bold text-stone-100">
                          "{cand.title}"
                        </h4>
                        <button
                          onClick={() => {
                            setEditingCandidateId(cand.id);
                            setEditingText(cand.title);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
                          title="Edit Title Text"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-stone-400 italic">
                      {cand.critique}
                    </p>
                  </div>

                  {/* Quality Control Scores */}
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="grid grid-cols-5 gap-2 text-center bg-[#0e141e] p-2 rounded-lg border border-[#1b2535]">
                      <div className="px-1.5">
                        <div className="text-[9px] font-mono text-stone-400 uppercase">Clarity</div>
                        <div className="text-xs font-bold text-stone-100">{cand.clarityScore}/10</div>
                      </div>
                      <div className="px-1.5">
                        <div className="text-[9px] font-mono text-stone-400 uppercase">Curiosity</div>
                        <div className="text-xs font-bold text-amber-400">{cand.curiosityScore}/10</div>
                      </div>
                      <div className="px-1.5">
                        <div className="text-[9px] font-mono text-stone-400 uppercase">Specific</div>
                        <div className="text-xs font-bold text-stone-100">{cand.specificityScore}/10</div>
                      </div>
                      <div className="px-1.5">
                        <div className="text-[9px] font-mono text-stone-400 uppercase">Accuracy</div>
                        <div className="text-xs font-bold text-emerald-400">{cand.accuracyScore}/10</div>
                      </div>
                      <div className="px-1.5 border-l border-[#222d3d]">
                        <div className="text-[9px] font-mono text-stone-400 uppercase">Overall</div>
                        <div className="text-xs font-black text-amber-400">{cand.overallScore}</div>
                      </div>
                    </div>

                    <button
                      onClick={() => handleApproveTitle(cand)}
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition shadow-sm ${
                        isApproved
                          ? 'bg-emerald-600 text-stone-100'
                          : 'bg-amber-500 hover:bg-amber-400 text-stone-950'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>{isApproved ? 'Approved' : 'Approve Title'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Pipeline Advance */}
      <div className="flex items-center justify-between pt-4 border-t border-[#222c3d]">
        <div className="text-xs text-stone-400 font-mono">
          Approved: <strong className="text-stone-200">"{approvedTitle || project.title}"</strong>
        </div>

        <button
          onClick={onNextStage}
          className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-md"
        >
          <span>Proceed to Historical Research</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
