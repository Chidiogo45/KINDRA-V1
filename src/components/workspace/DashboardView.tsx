import React from 'react';
import {
  Film,
  Plus,
  TrendingUp,
  Clock,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  BookOpen,
  Calendar,
  Layers,
  ChevronRight,
  Compass,
} from 'lucide-react';
import { DocumentaryProject } from '../../types';

interface DashboardViewProps {
  projects: DocumentaryProject[];
  onOpenProject: (id: string) => void;
  onNewProject: (subject?: string, title?: string) => void;
  onQuickExplore: (topic: string) => void;
}

const HISTORICAL_STARTER_IDEAS = [
  {
    topic: 'Third Battle of Kharkov 1943',
    title: 'The 48-Hour Mirage: When Moscow Declared Victory 3 Days Too Soon',
    category: 'Operational Turning Point',
    era: 'Eastern Front 1943',
    hook: 'Soviet spearheads surging 30 miles a day suddenly hit a wall of calculated German counter-maneuvers.',
  },
  {
    topic: 'Battle of Samar 1944 (Taffy 3)',
    title: 'The Tin Cans That Bluffed the Yamato',
    category: 'Naval Combat & Tactial Audacity',
    era: 'Pacific 1944',
    hook: 'How a tiny escort carrier group convinced the world’s biggest battleships they were facing an entire fleet.',
  },
  {
    topic: 'Schweinfurt-Regensburg Mission 1943',
    title: 'Without Escort: The Raid That Broke the Eighth Air Force',
    category: 'Strategic Air Campaign',
    era: 'Western Europe 1943',
    hook: 'The mathematical illusion of the self-defending Flying Fortress formation shattered over Germany.',
  },
  {
    topic: 'Battle of Suomussalmi 1939',
    title: 'Ghost Patrols in the White Darkness',
    category: 'Asymmetric Tactical Defense',
    era: 'Winter War 1939',
    hook: 'Finnish ski troops annihilate two motorized divisions on a single forest road.',
  },
];

export const DashboardView: React.FC<DashboardViewProps> = ({
  projects,
  onOpenProject,
  onNewProject,
  onQuickExplore,
}) => {
  const latestProject = projects[0];

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-10">
      {/* Hero Welcome Banner */}
      <div className="relative rounded-2xl bg-gradient-to-r from-[#141b27] via-[#162030] to-[#121926] border border-[#26354b] p-8 shadow-xl overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl">
          <div className="flex items-center gap-2 mb-3">
            <span className="px-2.5 py-1 rounded-full text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
              Documentary Intelligence & Production
            </span>
            <span className="text-stone-400 text-xs font-mono">• The AI recommends. The creator decides.</span>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-stone-100 tracking-tight mb-3">
            Produce Authoritative Historical Documentaries in Hours.
          </h1>

          <p className="text-stone-300 text-sm leading-relaxed mb-6">
            From audience market breakout signals and primary archival research to retention-tuned scripts,
            authoritative Gemini voiceovers, and CapCut-ready visual packages.
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => onNewProject()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-sm transition shadow-lg shadow-amber-950/40"
            >
              <Plus className="w-4 h-4" />
              <span>Start New Documentary</span>
            </button>

            {latestProject && (
              <button
                onClick={() => onOpenProject(latestProject.id)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#1d2737] hover:bg-[#253247] text-stone-200 font-medium text-sm transition border border-[#2f3f58]"
              >
                <span>Continue: {latestProject.title || latestProject.subject}</span>
                <ArrowRight className="w-4 h-4 text-amber-400" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Active Workspaces / Recent Projects */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Layers className="w-5 h-5 text-amber-500" />
            <h2 className="text-stone-100 font-bold text-lg">Production Workspaces</h2>
            <span className="text-xs font-mono text-stone-400">({projects.length} Total)</span>
          </div>

          <button
            onClick={() => onNewProject()}
            className="text-xs font-medium text-amber-400 hover:text-amber-300 transition flex items-center gap-1"
          >
            <span>+ Create Project</span>
          </button>
        </div>

        {projects.length === 0 ? (
          <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-10 text-center space-y-4">
            <Film className="w-12 h-12 text-stone-600 mx-auto" />
            <div className="max-w-md mx-auto">
              <h3 className="text-stone-200 font-semibold text-base mb-1">No Documentary Projects Yet</h3>
              <p className="text-stone-400 text-xs leading-relaxed mb-4">
                Launch your first historical documentary pipeline or pick one of the curated campaign templates below.
              </p>
              <button
                onClick={() => onNewProject()}
                className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition"
              >
                Launch New Documentary
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map((proj) => {
              const stageLabels: Record<string, string> = {
                IDEA: 'Initial Concept',
                INTELLIGENCE: 'Market Intelligence',
                RESEARCH: 'Research & Sources',
                OUTLINE: 'Outline & Beats',
                SCRIPT: 'Script & Retention',
                FACT_CHECK: 'Fact Verification',
                VOICE: 'Voiceover Audio',
                VISUALS: 'Archival Visuals',
                ROUGH_CUT: 'Rough Cut Timeline',
                EXPORT_READY: 'Ready to Export',
              };

              return (
                <div
                  key={proj.id}
                  onClick={() => onOpenProject(proj.id)}
                  className="bg-[#131a26] hover:bg-[#182130] border border-[#222c3d] hover:border-amber-500/40 rounded-xl p-5 transition cursor-pointer flex flex-col justify-between group shadow-sm"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 uppercase">
                        {stageLabels[proj.stage] || proj.stage}
                      </span>
                      <span className="text-[11px] font-mono text-stone-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {proj.targetDurationMinutes} min ({proj.targetWpm} WPM)
                      </span>
                    </div>

                    <div>
                      <h3 className="text-stone-100 font-bold text-sm group-hover:text-amber-300 transition line-clamp-1 mb-1">
                        {proj.title || 'Untitled Documentary'}
                      </h3>
                      <p className="text-stone-400 text-xs line-clamp-2 leading-relaxed">
                        {proj.subject}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#1e2736] flex items-center justify-between text-xs">
                    <span className="text-stone-400 font-mono text-[11px]">
                      Mode: <strong className="text-stone-300">{proj.narrativeMode}</strong>
                    </span>
                    <span className="text-amber-400 font-semibold flex items-center gap-1 group-hover:translate-x-1 transition-transform">
                      Open Workstation <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Curated Historical Campaign Starters */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Compass className="w-5 h-5 text-amber-500" />
            <h2 className="text-stone-100 font-bold text-lg">Curated Documentary Starters</h2>
          </div>
          <span className="text-xs font-mono text-stone-400">High Outlier Potential & Rich Archival Evidence</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {HISTORICAL_STARTER_IDEAS.map((item, idx) => (
            <div
              key={idx}
              className="bg-[#121824] border border-[#222c3d] rounded-xl p-5 hover:border-[#2f3f58] transition flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                    {item.category}
                  </span>
                  <span className="text-[11px] font-mono text-stone-400">{item.era}</span>
                </div>

                <h3 className="text-stone-100 font-bold text-sm">{item.title}</h3>
                <p className="text-stone-300 text-xs leading-relaxed">{item.hook}</p>
              </div>

              <div className="pt-4 mt-3 border-t border-[#1e2736] flex items-center gap-2">
                <button
                  onClick={() => onNewProject(item.topic, item.title)}
                  className="flex-1 py-1.5 px-3 rounded-lg bg-[#182230] hover:bg-amber-500 hover:text-stone-950 text-stone-200 text-xs font-medium transition text-center"
                >
                  Create Project from Template
                </button>
                <button
                  onClick={() => onQuickExplore(item.topic)}
                  title="Run Market & Audience Discovery"
                  className="p-1.5 rounded-lg bg-[#182230] hover:bg-[#223044] text-stone-300 transition"
                >
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
