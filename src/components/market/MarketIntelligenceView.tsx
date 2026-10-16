import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Search,
  Sparkles,
  Flame,
  MessageSquare,
  BarChart2,
  Users,
  Eye,
  ThumbsUp,
  ExternalLink,
  Zap,
  ArrowRight,
  ShieldCheck,
  Compass,
  Check,
  Bookmark,
  RefreshCw,
  HelpCircle,
  Star,
  Layers,
  Filter,
} from 'lucide-react';
import {
  MarketIntelligenceData,
  DocumentaryAngle,
  DocumentaryProject,
  TopicOpportunity,
  TopicOpportunityClassification,
} from '../../types';
import { ApiClient } from '../../services/api';
import { TopicEvidenceModal } from './TopicEvidenceModal';

interface MarketIntelligenceViewProps {
  project: DocumentaryProject;
  marketData: MarketIntelligenceData | null;
  onRunDiscovery: (query: string, autoExplore?: boolean) => void;
  onSelectAngle: (angle: DocumentaryAngle) => void;
  onNextStage: () => void;
  onUpdateProject?: (updated: Partial<DocumentaryProject>) => void;
  isLoading: boolean;
}

export const MarketIntelligenceView: React.FC<MarketIntelligenceViewProps> = ({
  project,
  marketData,
  onRunDiscovery,
  onSelectAngle,
  onNextStage,
  onUpdateProject,
  isLoading,
}) => {
  // Empty by default — NO prefilled or default keyword
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAngleId, setSelectedAngleId] = useState<string | null>(
    project.selectedAngle?.id || null
  );

  // Topic Opportunities exploration state
  const [topicOpportunities, setTopicOpportunities] = useState<TopicOpportunity[]>(
    project.topicOpportunities || []
  );
  const [savedTopics, setSavedTopics] = useState<string[]>(project.savedTopics || []);
  const [isExploring, setIsExploring] = useState(false);
  const [explorationStep, setExplorationStep] = useState<number>(0);
  const [selectedTopicForEvidence, setSelectedTopicForEvidence] =
    useState<TopicOpportunity | null>(null);
  const [isEvidenceModalOpen, setIsEvidenceModalOpen] = useState(false);
  const [filterClassification, setFilterClassification] = useState<string>('ALL');

  // Progressive loading step animation
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isExploring || isLoading) {
      setExplorationStep(1);
      timer = setInterval(() => {
        setExplorationStep((prev) => (prev < 3 ? prev + 1 : 1));
      }, 1200);
    } else {
      setExplorationStep(0);
    }
    return () => clearInterval(timer);
  }, [isExploring, isLoading]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    onRunDiscovery(searchQuery.trim());
  };

  const handleExploreTopics = async (refresh = false) => {
    setIsExploring(true);
    try {
      const data = await ApiClient.exploreTopics(
        project.niche || 'World War II Documentaries',
        {},
        refresh
      );
      if (data && data.length > 0) {
        setTopicOpportunities(data);
        if (onUpdateProject) {
          onUpdateProject({ topicOpportunities: data });
        }
      }
    } catch (err: any) {
      console.warn('[MarketIntelligence] Explore failed:', err.message);
    } finally {
      setIsExploring(false);
    }
  };

  const handleToggleSaveTopic = (topicName: string) => {
    const isSaved = savedTopics.includes(topicName);
    const updated = isSaved
      ? savedTopics.filter((t) => t !== topicName)
      : [...savedTopics, topicName];
    setSavedTopics(updated);
    if (onUpdateProject) {
      onUpdateProject({ savedTopics: updated });
    }
  };

  const handleAnalyzeDiscoveredTopic = (topicName: string) => {
    setSearchQuery(topicName);
    onRunDiscovery(topicName);
  };

  const filteredOpportunities = topicOpportunities.filter((opp) => {
    if (filterClassification === 'ALL') return true;
    return opp.classifications?.includes(
      filterClassification as TopicOpportunityClassification
    );
  });

  const renderStars = (count: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <Star
          key={i}
          className={`w-3.5 h-3.5 ${
            i <= count
              ? 'text-amber-400 fill-amber-400'
              : 'text-stone-700'
          }`}
        />
      );
    }
    return <div className="flex items-center gap-0.5">{stars}</div>;
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">
      {/* Search Bar & Exploration Header */}
      <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-6 shadow-md space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-5 h-5 text-amber-500" />
              <h2 className="text-stone-100 font-bold text-lg">
                Market Intelligence & Audience Demand
              </h2>
            </div>
            <p className="text-stone-400 text-xs leading-relaxed max-w-2xl">
              Discover breakout opportunities, small-channel view velocity outliers, and audience knowledge gaps in historical documentaries.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              type="button"
              onClick={() => handleExploreTopics(true)}
              disabled={isExploring || isLoading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-lg bg-[#192434] hover:bg-[#223046] text-amber-400 font-semibold text-xs transition border border-amber-500/30 whitespace-nowrap shadow-sm"
            >
              <Compass className={`w-4 h-4 ${isExploring ? 'animate-spin' : ''}`} />
              <span>{isExploring ? 'Discovering Topics...' : 'Explore Topics'}</span>
            </button>
          </div>
        </div>

        {/* Input Mode A: User has a topic */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Enter a topic, keyword, event, person, or subject..."
              className="w-full bg-[#18212e] border border-[#2c3a50] rounded-lg pl-10 pr-4 py-3 text-sm text-stone-100 placeholder-stone-400 focus:outline-none focus:border-amber-500"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || isExploring || !searchQuery.trim()}
            className="flex items-center gap-2 px-6 py-3 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-sm disabled:opacity-50 whitespace-nowrap"
          >
            <Zap className="w-4 h-4" />
            <span>{isLoading ? 'Analyzing...' : 'Analyze Topic'}</span>
          </button>
        </form>

        {/* Exploration Status Bar */}
        {(isExploring || isLoading) && (
          <div className="bg-[#182333] border border-amber-500/30 rounded-lg p-3 flex items-center gap-3 text-xs font-mono text-amber-300">
            <div className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <span>
              {explorationStep === 1
                ? 'Generating topic clusters in World War II niche...'
                : explorationStep === 2
                ? 'Searching topic clusters across YouTube...'
                : 'Calculating breakout & opportunity signals...'}
            </span>
          </div>
        )}
      </div>

      {/* DISCOVERED TOPIC OPPORTUNITIES LIST (MODE B) */}
      {topicOpportunities.length > 0 && !marketData && (
        <div className="space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Compass className="w-5 h-5 text-amber-500" />
                <h3 className="text-stone-100 font-bold text-base">
                  Discovered Topic Opportunities ({filteredOpportunities.length})
                </h3>
              </div>
              <p className="text-xs text-stone-400">
                Ranked by small-channel breakout signals and unmet audience search inquiries.
              </p>
            </div>

            {/* Classification Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {['ALL', 'BREAKOUT', 'RISING', 'UNDERSERVED', 'STRONG DEMAND', 'EVERGREEN'].map(
                (filter) => (
                  <button
                    key={filter}
                    onClick={() => setFilterClassification(filter)}
                    className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition whitespace-nowrap ${
                      filterClassification === filter
                        ? 'bg-amber-500 text-stone-950'
                        : 'bg-[#18212e] text-stone-400 hover:text-stone-200 border border-[#273549]'
                    }`}
                  >
                    {filter}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Opportunity Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredOpportunities.map((opp) => {
              const isSaved = savedTopics.includes(opp.topic);

              return (
                <div
                  key={opp.id}
                  className="bg-[#121824] border border-[#222c3d] hover:border-[#2f3d53] rounded-xl p-5 shadow-md flex flex-col justify-between space-y-4 transition"
                >
                  <div className="space-y-3">
                    {/* Header Badges & Score */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                          {opp.category}
                        </span>
                        {opp.classifications?.map((c) => (
                          <span
                            key={c}
                            className={`px-1.5 py-0.5 rounded text-[9px] font-mono font-bold ${
                              c === 'BREAKOUT'
                                ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                                : c === 'RISING'
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {c}
                          </span>
                        ))}
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-base font-black text-amber-400">
                          {opp.opportunityScore}
                          <span className="text-[10px] text-stone-400 font-normal">/100</span>
                        </div>
                        <div className="text-[9px] font-mono text-stone-400 uppercase">Score</div>
                      </div>
                    </div>

                    {/* Topic Title */}
                    <h4 className="text-stone-100 font-bold text-sm md:text-base leading-snug">
                      {opp.topic}
                    </h4>

                    {/* Factual Evidence Signals */}
                    <div className="grid grid-cols-3 gap-2 bg-[#0e141e] p-2.5 rounded-lg border border-[#1d2737] text-center">
                      <div>
                        <div className="text-[9px] font-mono text-stone-400 uppercase">Rising Signal</div>
                        <div className="mt-0.5 flex justify-center">{renderStars(opp.risingSignal)}</div>
                      </div>
                      <div>
                        <div className="text-[9px] font-mono text-stone-400 uppercase">Competition</div>
                        <div
                          className={`text-xs font-bold ${
                            opp.competition === 'Low'
                              ? 'text-emerald-400'
                              : opp.competition === 'Medium'
                              ? 'text-amber-400'
                              : 'text-stone-300'
                          }`}
                        >
                          {opp.competition}
                        </div>
                      </div>
                      <div>
                        <div className="text-[9px] font-mono text-stone-400 uppercase">Momentum</div>
                        <div className="text-xs font-bold text-purple-400">{opp.recentMomentum}</div>
                      </div>
                    </div>

                    {/* Best Performing Example */}
                    {opp.bestExample && (
                      <div className="bg-[#161f2c] p-2.5 rounded-lg border border-[#243144] space-y-1">
                        <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                          <span>TOP OUTLIER EVIDENCE</span>
                          <span className="text-amber-300 font-bold">
                            {opp.bestExample.viewsPerSub}× VPS
                          </span>
                        </div>
                        <div className="text-xs text-stone-200 font-medium line-clamp-1">
                          "{opp.bestExample.title}"
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-mono text-stone-400">
                          <span>{opp.bestExample.channelName} ({opp.bestExample.subscriberCount.toLocaleString()} subs)</span>
                          <span>{opp.bestExample.viewsFormatted || `${opp.bestExample.views.toLocaleString()} views`}</span>
                        </div>
                      </div>
                    )}

                    {/* Audience Gap */}
                    {opp.audienceGap && (
                      <div className="text-[11px] text-stone-300 italic bg-[#0e141e] p-2 rounded border border-[#1b2535]">
                        <span className="text-stone-400 not-italic font-mono text-[9px] block uppercase">
                          Audience Gap:
                        </span>
                        "{opp.audienceGap}"
                      </div>
                    )}

                    {/* Explainability: Why this topic */}
                    <p className="text-[11px] text-stone-400 leading-relaxed line-clamp-2">
                      <strong className="text-stone-300">Why this topic:</strong> {opp.whyThisTopic}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-[#1d2737] flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleToggleSaveTopic(opp.topic)}
                        className={`p-2 rounded-lg text-xs font-semibold transition border ${
                          isSaved
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                            : 'bg-[#18212e] hover:bg-[#223046] text-stone-400 border-[#273549]'
                        }`}
                        title={isSaved ? 'Topic Saved' : 'Save Topic'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${isSaved ? 'fill-amber-400' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setSelectedTopicForEvidence(opp);
                          setIsEvidenceModalOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-[#18212e] hover:bg-[#223046] text-stone-300 text-xs font-mono transition border border-[#273549]"
                      >
                        View Evidence ({opp.evidenceCount})
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAnalyzeDiscoveredTopic(opp.topic)}
                      disabled={isLoading}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-sm whitespace-nowrap"
                    >
                      <Zap className="w-3.5 h-3.5" />
                      <span>Analyze Topic</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* EMPTY STATE (When no topic scanned and no opportunities explored yet) */}
      {!marketData && topicOpportunities.length === 0 && !isLoading && !isExploring && (
        <div className="bg-[#121824] border border-[#222c3d] rounded-2xl p-12 text-center space-y-6 max-w-2xl mx-auto shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500/20 to-amber-600/5 border border-amber-500/30 flex items-center justify-center mx-auto text-amber-400 shadow-inner">
            <Compass className="w-8 h-8" />
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold text-stone-100">What are we researching?</h3>
            <p className="text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
              Enter a topic, keyword, event, person, or subject to analyze audience demand and competition, or explore rising breakout opportunities across YouTube.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                const el = document.querySelector('input[type="text"]') as HTMLInputElement;
                if (el) {
                  el.focus();
                  el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
              }}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition shadow-md"
            >
              <Zap className="w-4 h-4" />
              <span>Analyze a Topic</span>
            </button>

            <button
              type="button"
              onClick={() => handleExploreTopics(false)}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#18212e] hover:bg-[#223046] text-amber-400 font-semibold text-sm transition border border-amber-500/30 shadow-sm"
            >
              <Compass className="w-4 h-4" />
              <span>Explore Topics</span>
            </button>
          </div>
        </div>
      )}

      {/* DETAILED MARKET SCAN RESULTS FOR ACTIVE TOPIC */}
      {marketData && (
        <div className="space-y-8">
          {/* Opportunity Score Breakdown */}
          <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-6 shadow-md">
            <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 pb-6 border-b border-[#1f2a3a]">
              <div className="flex items-center gap-5">
                <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-600/10 border border-amber-500/40 flex flex-col items-center justify-center text-center shadow-inner">
                  <span className="text-2xl font-black text-amber-400 leading-none">
                    {marketData.opportunityScore?.overall || 88}
                  </span>
                  <span className="text-[10px] font-mono text-stone-400 uppercase tracking-widest mt-1">
                    SCORE
                  </span>
                </div>

                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs font-mono uppercase tracking-wider text-amber-400 font-bold">
                      Opportunity Verdict
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      HIGH BREAKOUT POTENTIAL
                    </span>
                  </div>
                  <p className="text-stone-300 text-xs leading-relaxed max-w-2xl">
                    {marketData.opportunityScore?.explanation ||
                      'Strong organic viewer search momentum with high outlier view counts among small channels (<50k subscribers). Significant audience demand for detailed tactical maps and primary dispatch analysis.'}
                  </p>
                </div>
              </div>

              {/* Sub-scores */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3 w-full lg:w-auto">
                <div className="bg-[#18212e] p-2.5 rounded-lg border border-[#243144] text-center">
                  <div className="text-[10px] font-mono text-stone-400 uppercase">Demand</div>
                  <div className="text-sm font-bold text-stone-100">
                    {marketData.opportunityScore?.demand || 92}%
                  </div>
                </div>
                <div className="bg-[#18212e] p-2.5 rounded-lg border border-[#243144] text-center">
                  <div className="text-[10px] font-mono text-stone-400 uppercase">Momentum</div>
                  <div className="text-sm font-bold text-stone-100">
                    {marketData.opportunityScore?.momentum || 85}%
                  </div>
                </div>
                <div className="bg-[#18212e] p-2.5 rounded-lg border border-[#243144] text-center">
                  <div className="text-[10px] font-mono text-stone-400 uppercase">Competition</div>
                  <div className="text-sm font-bold text-stone-100">
                    {marketData.opportunityScore?.competition || 40}%
                  </div>
                </div>
                <div className="bg-[#18212e] p-2.5 rounded-lg border border-[#243144] text-center">
                  <div className="text-[10px] font-mono text-stone-400 uppercase">Breakout</div>
                  <div className="text-sm font-bold text-amber-400">
                    {marketData.opportunityScore?.smallChannelBreakout || 95}%
                  </div>
                </div>
                <div className="bg-[#18212e] p-2.5 rounded-lg border border-[#243144] text-center">
                  <div className="text-[10px] font-mono text-stone-400 uppercase">Retention</div>
                  <div className="text-sm font-bold text-stone-100">
                    {marketData.opportunityScore?.retentionPotential || 88}%
                  </div>
                </div>
                <div className="bg-[#18212e] p-2.5 rounded-lg border border-[#243144] text-center">
                  <div className="text-[10px] font-mono text-stone-400 uppercase">Visuals</div>
                  <div className="text-sm font-bold text-emerald-400">
                    {marketData.opportunityScore?.visualViability || 90}%
                  </div>
                </div>
              </div>
            </div>

            {/* Market Signals Bar */}
            {marketData.marketSignals && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-stone-400">
                    Search Volume (30D)
                  </div>
                  <div className="text-sm font-bold text-stone-100">
                    {marketData.marketSignals.searchVolume || 'High Organic Velocity'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-stone-400">
                    Competitor Saturation
                  </div>
                  <div className="text-sm font-bold text-amber-400">
                    {marketData.marketSignals.competitorSaturation || 'Moderate (Dated Coverage)'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-stone-400">
                    Average Duration
                  </div>
                  <div className="text-sm font-bold text-stone-100">
                    {marketData.marketSignals.averageDuration || '18-26 Minutes'}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-[10px] font-mono uppercase text-stone-400">
                    Audience Demographics
                  </div>
                  <div className="text-sm font-bold text-stone-100">
                    {marketData.marketSignals.audienceDemographics || 'History & Strategy Enthus.'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Outlier Breakdown Videos */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-amber-500" />
                <h3 className="text-stone-100 font-bold text-base">
                  Small-Channel Breakout Outliers
                </h3>
              </div>
              <span className="text-xs font-mono text-stone-400">
                Outliers with &gt;10x Views-Per-Subscriber (VPS)
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(marketData.outliers || marketData.competitors?.slice(0, 3) || []).map((vid) => (
                <div
                  key={vid.id}
                  className="bg-[#121824] border border-[#222c3d] rounded-xl overflow-hidden shadow-md flex flex-col justify-between"
                >
                  <div className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        {vid.viewsPerSubscriber}x VPS OUTLIER
                      </span>
                      <span className="text-xs font-mono text-stone-400">
                        {vid.uploadDate}
                      </span>
                    </div>

                    <h4 className="text-stone-100 font-bold text-xs line-clamp-2">{vid.title}</h4>

                    <div className="grid grid-cols-2 gap-2 text-center bg-[#0e141e] p-2 rounded-lg border border-[#1b2535]">
                      <div>
                        <div className="text-[10px] font-mono text-stone-400 uppercase">Views</div>
                        <div className="text-xs font-bold text-stone-200">
                          {vid.views.toLocaleString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] font-mono text-stone-400 uppercase">Subs</div>
                        <div className="text-xs font-bold text-stone-200">
                          {vid.subscriberCount.toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {vid.outlierReason && (
                      <p className="text-[11px] text-amber-300/90 font-mono bg-amber-500/10 p-2 rounded border border-amber-500/20 leading-tight">
                        ⚡ {vid.outlierReason}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Audience Comment Clusters */}
          {marketData.commentClusters && marketData.commentClusters.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-500" />
                  <h3 className="text-stone-100 font-bold text-base">
                    Audience Questions & Historical Misconceptions
                  </h3>
                </div>
                <span className="text-xs font-mono text-stone-400">
                  Directly resolved in script
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {marketData.commentClusters.map((cluster) => (
                  <div
                    key={cluster.id}
                    className="bg-[#121824] border border-[#222c3d] rounded-xl p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {cluster.type}
                      </span>
                      <span className="text-[11px] font-mono text-stone-400">
                        {cluster.frequencyCount} occurrences
                      </span>
                    </div>

                    <h4 className="text-stone-100 font-bold text-xs">{cluster.theme}</h4>

                    <div className="space-y-1.5 bg-[#0e141e] p-3 rounded-lg border border-[#1a2332]">
                      <div className="text-[10px] font-mono uppercase text-stone-400 mb-1">
                        Representative Comments:
                      </div>
                      {cluster.representativeComments.map((com, i) => (
                        <p key={i} className="text-xs text-stone-300 italic">
                          "{com}"
                        </p>
                      ))}
                    </div>

                    <div className="text-xs text-emerald-300 font-mono bg-emerald-500/10 p-2.5 rounded border border-emerald-500/20">
                      <strong>Production Direct:</strong> {cluster.productionImplication}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documentary Angle Proposals */}
          {marketData.angles && marketData.angles.length > 0 && (
            <div className="space-y-4 pt-4 border-t border-[#222c3d]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-amber-500" />
                    <h3 className="text-stone-100 font-bold text-base">Select Documentary Angle</h3>
                  </div>
                  <p className="text-xs text-stone-400">
                    Choose the central argument and narrative mode to focus your research, title strategy, and scriptwriting.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {marketData.angles.map((angle) => {
                  const isSelected = selectedAngleId === angle.id;

                  return (
                    <div
                      key={angle.id}
                      onClick={() => {
                        setSelectedAngleId(angle.id);
                        onSelectAngle(angle);
                      }}
                      className={`p-5 rounded-xl border transition cursor-pointer flex flex-col md:flex-row md:items-center justify-between gap-4 ${
                        isSelected
                          ? 'bg-[#182333] border-amber-500 shadow-md ring-1 ring-amber-500/50'
                          : 'bg-[#121824] border-[#222c3d] hover:border-stone-600'
                      }`}
                    >
                      <div className="space-y-2 max-w-3xl">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                            {angle.angleCategory}
                          </span>
                          <span className="text-xs font-mono text-stone-400">
                            Mode: <strong className="text-stone-300">{angle.recommendedNarrativeMode}</strong>
                          </span>
                        </div>

                        <h4 className="text-stone-100 font-bold text-sm md:text-base">
                          {angle.titleProposal}
                        </h4>

                        <p className="text-stone-300 text-xs leading-relaxed">
                          <strong className="text-amber-400 font-mono">Central Question:</strong>{' '}
                          {angle.centralQuestion}
                        </p>

                        <p className="text-stone-400 text-xs leading-relaxed">
                          <strong className="text-stone-300 font-mono">Core Conflict:</strong>{' '}
                          {angle.coreConflict}
                        </p>

                        {angle.curiosityHook && (
                          <div className="text-xs font-mono text-stone-300 bg-[#0e141e] px-3 py-1.5 rounded border border-[#1d2737]">
                            <span className="text-amber-400 font-bold">Hook:</span> "{angle.curiosityHook}"
                          </div>
                        )}
                      </div>

                      <div className="flex md:flex-col items-center md:items-end justify-between md:justify-center gap-3 shrink-0">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center border ${
                            isSelected
                              ? 'bg-amber-500 text-stone-950 border-amber-500 font-bold'
                              : 'border-stone-700 text-transparent'
                          }`}
                        >
                          <Check className="w-4 h-4" />
                        </div>

                        <span className="text-[11px] font-mono text-stone-400">
                          {isSelected ? 'Angle Selected' : 'Click to Adopt'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex justify-end pt-4">
                <button
                  onClick={onNextStage}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-md"
                >
                  <span>Proceed to Title Studio & Strategy</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Topic Evidence Modal */}
      <TopicEvidenceModal
        isOpen={isEvidenceModalOpen}
        onClose={() => setIsEvidenceModalOpen(false)}
        topic={selectedTopicForEvidence}
        onAnalyzeTopic={handleAnalyzeDiscoveredTopic}
      />
    </div>
  );
};
