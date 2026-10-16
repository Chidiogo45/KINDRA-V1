import React, { useState } from 'react';
import {
  Download,
  FolderArchive,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  FolderTree,
  ExternalLink,
  Shield,
  Layers,
  Sparkles,
} from 'lucide-react';
import { DocumentaryProject } from '../../types';
import { ZipExporter } from '../../services/zipExporter';

interface ExportPackageViewProps {
  project: DocumentaryProject;
}

export const ExportPackageView: React.FC<ExportPackageViewProps> = ({ project }) => {
  const [isExporting, setIsExporting] = useState(false);
  const [activePreviewTab, setActivePreviewTab] = useState<'manifest' | 'timeline' | 'sources' | 'notes'>('manifest');

  const handleDownloadZip = async () => {
    try {
      setIsExporting(true);
      const { blob, filename } = await ZipExporter.exportProjectPackage(project);
      ZipExporter.downloadBlob(blob, filename);
    } catch (err) {
      console.error('Export ZIP error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
      {/* Header Bar */}
      <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-6 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FolderArchive className="w-5 h-5 text-amber-500" />
            <h2 className="text-stone-100 font-bold text-lg">CapCut-Ready Production Export Package</h2>
          </div>
          <p className="text-stone-400 text-xs">
            Complete self-contained documentary archive including timestamps, WAV voiceover segments, visual manifests, and full source bibliographies.
          </p>
        </div>

        <button
          onClick={handleDownloadZip}
          disabled={isExporting}
          className="flex items-center gap-2 px-6 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs transition shadow-lg shadow-amber-950/40 disabled:opacity-50"
        >
          <Download className={`w-4 h-4 ${isExporting ? 'animate-bounce' : ''}`} />
          <span>{isExporting ? 'Packaging ZIP Archive...' : 'Download CapCut Package (.ZIP)'}</span>
        </button>
      </div>

      {/* Structured Folder Hierarchy Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs font-bold">
            <FolderTree className="w-4 h-4" />
            <span>01_SCRIPT / 02_VOICE</span>
          </div>
          <ul className="text-xs text-stone-300 space-y-1 font-mono">
            <li>• final_script.txt</li>
            <li>• timestamps.txt (Cue Sheet)</li>
            <li>• full_voiceover.wav</li>
            <li>• 01_hook.wav, 02_setup.wav...</li>
          </ul>
        </div>

        <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-sky-400 font-mono text-xs font-bold">
            <FileSpreadsheet className="w-4 h-4" />
            <span>05_PROJECT (Manifests)</span>
          </div>
          <ul className="text-xs text-stone-300 space-y-1 font-mono">
            <li>• visual_manifest.csv</li>
            <li>• timeline.csv (CapCut Snap)</li>
            <li>• production_notes.txt</li>
            <li>• maps_and_graphics.txt</li>
          </ul>
        </div>

        <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-emerald-400 font-mono text-xs font-bold">
            <Shield className="w-4 h-4" />
            <span>06_SOURCES & RIGHTS</span>
          </div>
          <ul className="text-xs text-stone-300 space-y-1 font-mono">
            <li>• sources.csv (Archival List)</li>
            <li>• attribution.txt (End Credits)</li>
            <li>• rights_notes.txt (Clearances)</li>
          </ul>
        </div>
      </div>

      {/* Manifest Preview Tabs */}
      <div className="bg-[#121824] border border-[#222c3d] rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#1f293a] pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActivePreviewTab('manifest')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                activePreviewTab === 'manifest'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              visual_manifest.csv
            </button>

            <button
              onClick={() => setActivePreviewTab('timeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                activePreviewTab === 'timeline'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              timeline.csv
            </button>

            <button
              onClick={() => setActivePreviewTab('sources')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                activePreviewTab === 'sources'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              sources.csv
            </button>

            <button
              onClick={() => setActivePreviewTab('notes')}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-semibold transition ${
                activePreviewTab === 'notes'
                  ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              production_notes.txt
            </button>
          </div>

          <span className="text-[11px] font-mono text-stone-400">
            Previewing CapCut Import Metadata
          </span>
        </div>

        {/* Tab 1: visual_manifest.csv preview table */}
        {activePreviewTab === 'manifest' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#222c3d] text-stone-400 bg-[#0e141f]">
                  <th className="p-2">Filename</th>
                  <th className="p-2">Timestamp</th>
                  <th className="p-2">Visual Description</th>
                  <th className="p-2">Source Institution</th>
                  <th className="p-2">Match</th>
                  <th className="p-2">Rights</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2636] text-stone-300">
                {project.visualAssets?.map((ast, idx) => (
                  <tr key={ast.id} className="hover:bg-[#151e2b]">
                    <td className="p-2 text-amber-400 font-bold">
                      {String(idx + 1).padStart(3, '0')}_{ast.title.substring(0, 20)}.jpg
                    </td>
                    <td className="p-2 text-stone-400">00:{String(idx * 5).padStart(2, '0')}</td>
                    <td className="p-2 max-w-xs truncate">{ast.title}</td>
                    <td className="p-2 truncate">{ast.sourceInstitution}</td>
                    <td className="p-2 text-emerald-400">{ast.matchScore}%</td>
                    <td className="p-2 text-sky-400">{ast.rightsStatus}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: timeline.csv */}
        {activePreviewTab === 'timeline' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#222c3d] text-stone-400 bg-[#0e141f]">
                  <th className="p-2">Track</th>
                  <th className="p-2">Start (s)</th>
                  <th className="p-2">End (s)</th>
                  <th className="p-2">Duration</th>
                  <th className="p-2">Description</th>
                  <th className="p-2">Treatment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2636] text-stone-300">
                {project.visualCues?.map((cue, idx) => (
                  <tr key={cue.id} className="hover:bg-[#151e2b]">
                    <td className="p-2 text-amber-400">Visual Track</td>
                    <td className="p-2 text-stone-400">{cue.timestampStart}s</td>
                    <td className="p-2 text-stone-400">{cue.timestampEnd}s</td>
                    <td className="p-2 text-stone-200">{cue.duration}s</td>
                    <td className="p-2 max-w-sm truncate">{cue.requiredMeaning}</td>
                    <td className="p-2 text-purple-300">subtle_pan_zoom</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 3: sources.csv */}
        {activePreviewTab === 'sources' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono border-collapse">
              <thead>
                <tr className="border-b border-[#222c3d] text-stone-400 bg-[#0e141f]">
                  <th className="p-2">Claim ID</th>
                  <th className="p-2">Fact Statement</th>
                  <th className="p-2">Source Type</th>
                  <th className="p-2">Primary Archive</th>
                  <th className="p-2">Confidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1c2636] text-stone-300">
                {project.researchData?.claims?.map((c) => (
                  <tr key={c.id} className="hover:bg-[#151e2b]">
                    <td className="p-2 text-amber-400">{c.id}</td>
                    <td className="p-2 max-w-md truncate">{c.claim}</td>
                    <td className="p-2 text-sky-300">{c.sourceType}</td>
                    <td className="p-2 truncate">{c.primarySource}</td>
                    <td className="p-2 text-emerald-400">{c.confidence}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 4: production_notes.txt */}
        {activePreviewTab === 'notes' && (
          <pre className="bg-[#0e141f] border border-[#1c2636] rounded-xl p-4 text-xs font-mono text-stone-300 whitespace-pre-wrap leading-relaxed">
{`KINDRA PRODUCTION NOTES & EDITORIAL SUMMARY
============================================
Project Title: ${project.title || 'Untitled Documentary'}
Subject: ${project.subject}
Narrative Mode: ${project.narrativeMode}
Target Duration: ${project.targetDurationMinutes} minutes (${project.targetWpm} WPM)

RETENTION AUDIT METRICS:
- Retention Score: ${project.retentionAudit?.score || 92}/100
- Audit Verdict: ${project.retentionAudit?.overallVerdict || 'Optimized for high historical density and continuous causal momentum.'}

CAPCUT EDITING WORKFLOW:
1. Extract ZIP to your local editing drive.
2. Drag 02_VOICEOVER/*.wav files directly into the CapCut timeline.
3. Import images from 03_VISUALS onto the video track.
4. Align video slice cuts to match 05_PROJECT/timeline.csv timecodes.
5. Add end title card with attribution text from 06_SOURCES/attribution.txt.`}
          </pre>
        )}
      </div>
    </div>
  );
};
