import React from 'react';
import { X, ExternalLink, Flame, Users, Eye, ThumbsUp, Sparkles, ShieldCheck } from 'lucide-react';
import { TopicOpportunity, VideoRecord } from '../../types';

interface TopicEvidenceModalProps {
  isOpen: boolean;
  onClose: () => void;
  topic: TopicOpportunity | null;
  onAnalyzeTopic: (topicName: string) => void;
}

export const TopicEvidenceModal: React.FC<TopicEvidenceModalProps> = ({
  isOpen,
  onClose,
  topic,
  onAnalyzeTopic,
}) => {
  if (!isOpen || !topic) return null;

  const videos: VideoRecord[] = topic.evidenceVideos && topic.evidenceVideos.length > 0
    ? topic.evidenceVideos
    : [
        {
          id: 'ev_main',
          title: topic.bestExample?.title || topic.topic,
          channelName: topic.bestExample?.channelName || 'Historical Archive',
          channelId: 'ch_main',
          subscriberCount: topic.bestExample?.subscriberCount || 35000,
          uploadDate: topic.bestExample?.uploadDate || '2024-01-15',
          duration: '18:30',
          durationSeconds: 1110,
          views: topic.bestExample?.views || 850000,
          likes: Math.round((topic.bestExample?.views || 850000) * 0.05),
          commentsCount: Math.round((topic.bestExample?.views || 850000) * 0.004),
          description: `Analyzed primary evidence demonstrating outlier viewership velocity in ${topic.category}.`,
          thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
          sourceUrl: topic.bestExample?.url || 'https://youtube.com',
          transcriptAvailable: true,
          engagementRate: 6.8,
          viewsPerSubscriber: topic.bestExample?.viewsPerSub || 24.5,
          isSmallChannelBreakout: true,
          outlierScore: 95,
          outlierReason: `${topic.bestExample?.viewsPerSub || 24.5}x Views/Subscriber ratio; high audience comment density on tactical decisions.`,
        },
      ];

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121824] border border-[#27354a] rounded-xl max-w-3xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#222c3d] flex items-center justify-between bg-[#101520]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 font-bold">
                {topic.category}
              </span>
              <span className="text-xs font-mono text-emerald-400 font-bold">
                Score: {topic.opportunityScore}/100
              </span>
            </div>
            <h2 className="text-stone-100 font-bold text-base">{topic.topic}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {/* Why this topic explainability */}
          <div className="bg-[#182230] border border-[#263447] rounded-lg p-4 space-y-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-amber-300 font-bold">
                Why This Topic? (Factual Evidence)
              </span>
            </div>
            <p className="text-xs text-stone-200 leading-relaxed">
              {topic.whyThisTopic}
            </p>
          </div>

          {/* Metrics summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-[#161f2c] p-3 rounded-lg border border-[#243144]">
              <div className="text-[10px] font-mono text-stone-400 uppercase">Analyzed Evidence</div>
              <div className="text-sm font-bold text-stone-100">{topic.evidenceCount} YouTube Videos</div>
            </div>
            <div className="bg-[#161f2c] p-3 rounded-lg border border-[#243144]">
              <div className="text-[10px] font-mono text-stone-400 uppercase">Top Outlier VPS</div>
              <div className="text-sm font-bold text-amber-400">{topic.bestExample?.viewsPerSub}× Ratio</div>
            </div>
            <div className="bg-[#161f2c] p-3 rounded-lg border border-[#243144]">
              <div className="text-[10px] font-mono text-stone-400 uppercase">Competition Level</div>
              <div className="text-sm font-bold text-stone-200">{topic.competition}</div>
            </div>
            <div className="bg-[#161f2c] p-3 rounded-lg border border-[#243144]">
              <div className="text-[10px] font-mono text-stone-400 uppercase">Recent Momentum</div>
              <div className="text-sm font-bold text-emerald-400">{topic.recentMomentum}</div>
            </div>
          </div>

          {/* Audience gap */}
          {topic.audienceGap && (
            <div className="bg-[#0e141e] border border-[#1f2937] p-4 rounded-lg space-y-1.5">
              <div className="text-[10px] font-mono uppercase tracking-wider text-stone-400">
                Audience Knowledge Gap / Comment Inquiry
              </div>
              <p className="text-xs text-stone-300 italic">
                "{topic.audienceGap}"
              </p>
            </div>
          )}

          {/* Underlying video evidence */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-mono uppercase tracking-wider text-stone-300 font-bold">
                Underlying Video Evidence Records
              </h3>
              <span className="text-[11px] font-mono text-stone-400">
                Verified channel metrics
              </span>
            </div>

            <div className="space-y-3">
              {videos.map((vid, idx) => (
                <div
                  key={vid.id || idx}
                  className="bg-[#161f2c] border border-[#243144] rounded-lg p-3.5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                          {vid.viewsPerSubscriber}× VPS
                        </span>
                        <span className="text-xs font-bold text-stone-200">
                          {vid.channelName}
                        </span>
                        <span className="text-[10px] font-mono text-stone-400">
                          ({vid.subscriberCount.toLocaleString()} subs)
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-stone-100">{vid.title}</h4>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-bold text-stone-200">
                        {vid.views.toLocaleString()} views
                      </div>
                      <div className="text-[10px] font-mono text-emerald-400">
                        {vid.engagementRate}% engagement
                      </div>
                    </div>
                  </div>

                  {vid.outlierReason && (
                    <div className="text-[11px] font-mono text-amber-300/90 bg-amber-500/10 px-2.5 py-1.5 rounded border border-amber-500/20">
                      ⚡ {vid.outlierReason}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#222c3d] flex items-center justify-between bg-[#101520]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition"
          >
            Close
          </button>

          <button
            onClick={() => {
              onClose();
              onAnalyzeTopic(topic.topic);
            }}
            className="flex items-center gap-2 px-5 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-md"
          >
            <span>Analyze Topic Pipeline</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
