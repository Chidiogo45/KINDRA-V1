import React from 'react';
import {
  Film,
  FolderOpen,
  Plus,
  Settings,
  Sparkles,
  CheckCircle2,
  HardDrive,
  Clock,
  Volume2,
} from 'lucide-react';
import { DocumentaryProject } from '../../types';

interface HeaderProps {
  currentProject: DocumentaryProject | null;
  projects: DocumentaryProject[];
  onSelectProject: (id: string) => void;
  onNewProject: () => void;
  onOpenSettings: () => void;
  isSaving?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  currentProject,
  projects,
  onSelectProject,
  onNewProject,
  onOpenSettings,
  isSaving = false,
}) => {
  return (
    <header className="h-16 bg-[#111620] border-b border-[#222c3d] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-40 select-none overflow-x-hidden w-full max-w-full">
      {/* Brand & Project Selector */}
      <div className="flex items-center gap-4 sm:gap-6 flex-shrink-0 min-w-0">
        <div className="flex items-center gap-3 cursor-pointer flex-shrink-0" onClick={() => onSelectProject('')}>
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-amber-700 flex items-center justify-center shadow-lg shadow-amber-950/40 flex-shrink-0">
            <Film className="w-5 h-5 text-stone-950 font-bold" />
          </div>
          <div className="flex-shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-extrabold tracking-wider text-stone-100 text-base">KINDRA</span>
              <span className="text-[10px] uppercase tracking-widest px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                Workstation V1
              </span>
            </div>
            <p className="text-[11px] text-stone-400 font-mono">Doc Intelligence Engine</p>
          </div>
        </div>

        <div className="h-6 w-px bg-stone-800 hidden sm:block flex-shrink-0" />

        {/* Project Switcher */}
        {currentProject ? (
          <div className="flex items-center gap-2 bg-[#18202c] px-3 py-1.5 rounded-lg border border-[#2a364a] text-sm flex-shrink-0 max-w-[200px] sm:max-w-xs md:max-w-sm">
            <span className="text-stone-400 text-xs uppercase tracking-wider font-mono hidden md:inline flex-shrink-0">Active Project:</span>
            <select
              value={currentProject.id}
              onChange={(e) => onSelectProject(e.target.value)}
              className="bg-transparent text-stone-100 font-medium focus:outline-none cursor-pointer pr-2 w-full truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id} className="bg-stone-900 text-stone-100">
                  {p.title || 'Untitled Project'} ({p.subject})
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-xs font-mono text-stone-400 hidden sm:block flex-shrink-0">Personal Creator Studio</div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
        {isSaving ? (
          <div className="flex items-center gap-1.5 text-xs text-amber-400/90 font-mono px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 flex-shrink-0">
            <Clock className="w-3.5 h-3.5 animate-spin flex-shrink-0" />
            <span className="hidden sm:inline">Syncing to Disk...</span>
          </div>
        ) : currentProject ? (
          <div className="flex items-center gap-1.5 text-xs text-emerald-400/80 font-mono px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 flex-shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
            <span className="hidden sm:inline">Workspace Saved</span>
          </div>
        ) : null}

        <button
          onClick={onNewProject}
          className="flex items-center gap-2 px-3 sm:px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-semibold text-xs transition shadow-sm flex-shrink-0"
        >
          <Plus className="w-4 h-4 flex-shrink-0" />
          <span className="hidden xs:inline">New Project</span>
        </button>

        {currentProject && (
          <button
            onClick={onOpenSettings}
            title="Project Settings"
            className="p-2 rounded-lg bg-[#18202c] hover:bg-[#222c3d] text-stone-300 hover:text-stone-100 transition border border-[#2a364a] flex-shrink-0"
          >
            <Settings className="w-4 h-4 flex-shrink-0" />
          </button>
        )}
      </div>
    </header>
  );
};
