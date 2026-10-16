import React, { useState } from 'react';
import { DocumentaryProject, NarrativeMode } from '../../types';
import { X, Save, Trash2, Sliders, Shield, BookOpen, Clock, FileText } from 'lucide-react';

interface ProjectSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: DocumentaryProject;
  onSave: (updated: DocumentaryProject) => void;
  onDelete: (id: string) => void;
}

const NARRATIVE_MODES: { value: NarrativeMode; label: string; desc: string }[] = [
  {
    value: 'Strategic',
    label: 'Strategic & Command',
    desc: 'High-level doctrine, staff dispatches, maneuver maps, macro decisions.',
  },
  {
    value: 'Character',
    label: 'Character & Memoir',
    desc: 'Personal journals, commander rivalry, boots-on-the-ground human stakes.',
  },
  {
    value: 'Investigative',
    label: 'Investigative & Forensic',
    desc: 'Unpacking historical myths, intelligence failures, declassified telegrams.',
  },
  {
    value: 'Chronological',
    label: 'Strict Chronological',
    desc: 'Hour-by-hour campaign timeline, escalating tactical friction.',
  },
  {
    value: 'Thematic',
    label: 'Thematic Deep Dive',
    desc: 'Logistics, weather, intelligence, doctrine, armor comparisons.',
  },
];

export const ProjectSettingsModal: React.FC<ProjectSettingsModalProps> = ({
  isOpen,
  onClose,
  project,
  onSave,
  onDelete,
}) => {
  const [title, setTitle] = useState(project.title);
  const [subject, setSubject] = useState(project.subject);
  const [narrativeMode, setNarrativeMode] = useState<NarrativeMode>(project.narrativeMode);
  const [targetDurationMinutes, setTargetDurationMinutes] = useState(project.targetDurationMinutes);
  const [targetWpm, setTargetWpm] = useState(project.targetWpm);
  const [notes, setNotes] = useState(project.notes || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      ...project,
      title: title.trim() || 'Untitled Documentary',
      subject: subject.trim() || 'Historical Campaign',
      narrativeMode,
      targetDurationMinutes: Number(targetDurationMinutes) || 10,
      targetWpm: Number(targetWpm) || 145,
      notes,
    });
    onClose();
  };

  const totalWords = (Number(targetDurationMinutes) || 10) * (Number(targetWpm) || 145);

  return (
    <div className="fixed inset-0 bg-stone-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-[#121824] border border-[#27354a] rounded-xl max-w-2xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#222c3d] flex items-center justify-between bg-[#101520]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-500" />
            <h2 className="text-stone-100 font-bold text-base">Project Architecture Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-stone-800 text-stone-400 hover:text-stone-200 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-5 overflow-y-auto">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-400 mb-1.5">
              Documentary Working Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-[#18212e] border border-[#2c3a50] rounded-lg px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="e.g., The 48-Hour Mirage: Kharkov 1943"
            />
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-400 mb-1.5">
              Historical Subject / Campaign
            </label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[#18212e] border border-[#2c3a50] rounded-lg px-3.5 py-2.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="e.g., Third Battle of Kharkov (Feb-Mar 1943)"
            />
          </div>

          {/* Narrative Mode Selection */}
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-400 mb-2">
              Recommended Narrative Mode
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              {NARRATIVE_MODES.map((mode) => (
                <button
                  key={mode.value}
                  type="button"
                  onClick={() => setNarrativeMode(mode.value)}
                  className={`text-left p-3 rounded-lg border transition ${
                    narrativeMode === mode.value
                      ? 'bg-amber-500/10 border-amber-500/60 text-stone-100'
                      : 'bg-[#161f2b] border-[#253245] text-stone-300 hover:border-stone-600'
                  }`}
                >
                  <div className="font-semibold text-xs text-amber-400 mb-0.5">{mode.label}</div>
                  <div className="text-[11px] text-stone-400 leading-snug">{mode.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Pacing & Target Duration */}
          <div className="grid grid-cols-2 gap-4 bg-[#101622] p-4 rounded-lg border border-[#202b3c]">
            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-stone-300 mb-1">
                <Clock className="w-3.5 h-3.5 text-amber-500" />
                <span>Target Duration</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="2"
                  max="60"
                  value={targetDurationMinutes}
                  onChange={(e) => setTargetDurationMinutes(Number(e.target.value))}
                  className="w-24 bg-[#18212e] border border-[#2c3a50] rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                />
                <span className="text-xs text-stone-400">minutes</span>
              </div>
            </div>

            <div>
              <div className="flex items-center gap-1.5 text-xs font-mono text-stone-300 mb-1">
                <FileText className="w-3.5 h-3.5 text-amber-500" />
                <span>Narration Cadence</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="120"
                  max="180"
                  step="5"
                  value={targetWpm}
                  onChange={(e) => setTargetWpm(Number(e.target.value))}
                  className="w-24 bg-[#18212e] border border-[#2c3a50] rounded-lg px-3 py-1.5 text-sm text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                />
                <span className="text-xs text-stone-400">WPM</span>
              </div>
            </div>

            <div className="col-span-2 text-[11px] font-mono text-stone-400 bg-stone-900/60 px-3 py-1.5 rounded flex items-center justify-between">
              <span>Computed Target Script Length:</span>
              <span className="text-amber-300 font-bold">~{totalWords.toLocaleString()} words</span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-stone-400 mb-1.5">
              Creator Editorial Notes & Guardrails
            </label>
            <textarea
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-[#18212e] border border-[#2c3a50] rounded-lg px-3.5 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              placeholder="e.g. Focus specifically on Soviet fuel logistics; avoid over-emphasizing Tiger I mythology..."
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#222c3d] flex items-center justify-between bg-[#101520]">
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Are you sure you want to delete "${project.title}"?`)) {
                onDelete(project.id);
                onClose();
              }
            }}
            className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 transition px-3 py-1.5 rounded hover:bg-rose-500/10"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Delete Project</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-stone-400 hover:text-stone-200 transition"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold text-xs transition shadow-sm"
            >
              <Save className="w-4 h-4" />
              <span>Save Settings</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
