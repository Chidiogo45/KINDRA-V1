import React from 'react';
import {
  TrendingUp,
  Sparkles,
  Search,
  FileText,
  ShieldCheck,
  Mic,
  Image,
  Film,
  Download,
  Check,
  ChevronRight,
} from 'lucide-react';
import { ProjectStage } from '../../types';

export interface PipelineStep {
  id: ProjectStage;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  {
    id: 'INTELLIGENCE',
    label: 'Market & Angles',
    shortLabel: 'MARKET',
    icon: TrendingUp,
    description: 'Demand, small-channel outliers & angles',
  },
  {
    id: 'TITLES',
    label: 'Title Studio',
    shortLabel: 'TITLES',
    icon: Sparkles,
    description: 'Structural blueprints & editorial QC',
  },
  {
    id: 'RESEARCH',
    label: 'Historical Research',
    shortLabel: 'RESEARCH',
    icon: Search,
    description: 'Fact sheet, timeline & source hierarchy',
  },
  {
    id: 'OUTLINE',
    label: 'Outline & Beats',
    shortLabel: 'OUTLINE',
    icon: FileText,
    description: 'Narrative structure & dramatic shifts',
  },
  {
    id: 'SCRIPT',
    label: 'Script & Retention',
    shortLabel: 'SCRIPT',
    icon: FileText,
    description: '145 WPM pacing & anti-AI constraints',
  },
  {
    id: 'FACT_CHECK',
    label: 'Fact Verification',
    shortLabel: 'FACT CHECK',
    icon: ShieldCheck,
    description: 'Sentence-level claim classification',
  },
  {
    id: 'VOICE',
    label: 'Gemini Voiceover',
    shortLabel: 'VOICE',
    icon: Mic,
    description: 'TTS voice selection & audio segments',
  },
  {
    id: 'VISUALS',
    label: 'Archival Visuals',
    shortLabel: 'VISUALS',
    icon: Image,
    description: 'Archival search & rights verification',
  },
  {
    id: 'ROUGH_CUT',
    label: 'Rough Cut Timeline',
    shortLabel: 'ROUGH CUT',
    icon: Film,
    description: 'Synchronized visual & narration playback',
  },
  {
    id: 'EXPORT_READY',
    label: 'CapCut Export',
    shortLabel: 'EXPORT',
    icon: Download,
    description: 'Structured ZIP package & CSV manifest',
  },
];

interface PipelineBarProps {
  currentStage: ProjectStage;
  onSelectStage: (stage: ProjectStage) => void;
  completedStages?: ProjectStage[];
}

export const PipelineBar: React.FC<PipelineBarProps> = ({
  currentStage,
  onSelectStage,
  completedStages = [],
}) => {
  const currentIndex = PIPELINE_STEPS.findIndex((s) => s.id === currentStage);

  return (
    <div className="bg-[#0f141d] border-b border-[#1f2837] px-6 py-2.5 overflow-x-auto select-none no-scrollbar">
      <div className="flex items-center min-w-max gap-2">
        {PIPELINE_STEPS.map((step, idx) => {
          const Icon = step.icon;
          const isActive = step.id === currentStage;
          const isCompleted = completedStages.includes(step.id) || idx < currentIndex;

          return (
            <React.Fragment key={step.id}>
              <button
                onClick={() => onSelectStage(step.id)}
                className={`flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all group flex-shrink-0 ${
                  isActive
                    ? 'bg-amber-500/15 border border-amber-500/40 text-amber-300 shadow-sm'
                    : isCompleted
                    ? 'text-stone-300 hover:text-stone-100 hover:bg-[#18212e] border border-transparent'
                    : 'text-stone-500 hover:text-stone-300 hover:bg-[#151c27] border border-transparent'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 ${
                    isActive
                      ? 'bg-amber-500 text-stone-950'
                      : isCompleted
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  {isCompleted && !isActive ? <Check className="w-3 h-3" /> : idx + 1}
                </div>

                <div className="text-left flex-shrink-0">
                  <div className="flex items-center gap-1">
                    <span className="font-semibold tracking-wide uppercase whitespace-nowrap">{step.shortLabel}</span>
                  </div>
                </div>
              </button>

              {idx < PIPELINE_STEPS.length - 1 && (
                <ChevronRight className="w-3.5 h-3.5 text-stone-700 shrink-0 flex-shrink-0" />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
