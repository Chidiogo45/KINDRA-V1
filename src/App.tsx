import React, { useState, useEffect } from 'react';
import {
  DocumentaryProject,
  ProjectStage,
  MarketIntelligenceData,
  ResearchWorkspaceData,
  DocumentaryOutline,
  OutlineBeat,
  ScriptBeat,
  RetentionAudit,
  FactCheckReport,
  VoiceOption,
  VisualCue,
  VisualAsset,
  DocumentaryAngle,
  NarrativeMode,
} from './types';
import { ApiClient } from './services/api';
import { Header } from './components/common/Header';
import { PipelineBar } from './components/common/PipelineBar';
import { LiveProgressOverlay } from './components/common/LiveProgressOverlay';
import { DashboardView } from './components/workspace/DashboardView';
import { ProjectSettingsModal } from './components/workspace/ProjectSettingsModal';
import { MarketIntelligenceView } from './components/market/MarketIntelligenceView';
import { TitleStudioView } from './components/titles/TitleStudioView';
import { ResearchWorkspaceView } from './components/research/ResearchWorkspaceView';
import { OutlineEditorView } from './components/story/OutlineEditorView';
import { ScriptEditorView } from './components/story/ScriptEditorView';
import { FactCheckView } from './components/story/FactCheckView';
import { VoiceoverEngineView } from './components/voice/VoiceoverEngineView';
import { VisualIntelligenceView } from './components/visuals/VisualIntelligenceView';
import { RoughCutTimelineView } from './components/timeline/RoughCutTimelineView';
import { ExportPackageView } from './components/export/ExportPackageView';

export default function App() {
  const [projects, setProjects] = useState<DocumentaryProject[]>([]);
  const [currentProject, setCurrentProject] = useState<DocumentaryProject | null>(null);
  const [voices, setVoices] = useState<VoiceOption[]>([]);

  // UI state
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [subMessage, setSubMessage] = useState('');
  const [progressPercent, setProgressPercent] = useState<number | undefined>(undefined);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Initial Load from Server
  useEffect(() => {
    async function init() {
      try {
        const [loadedProjects, loadedVoices] = await Promise.all([
          ApiClient.getProjects(),
          ApiClient.getVoiceOptions(),
        ]);
        setProjects(loadedProjects);
        setVoices(loadedVoices);

        // If there is a project, select the most recent one or start on dashboard
        if (loadedProjects.length > 0) {
          setCurrentProject(loadedProjects[0]);
        }
      } catch (err) {
        console.error('Initialization error:', err);
      }
    }
    init();
  }, []);

  // Save Project Helper with optimistic update
  const persistProject = async (updated: DocumentaryProject) => {
    setIsSaving(true);
    setCurrentProject(updated);
    setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    try {
      const saved = await ApiClient.saveProject(updated);
      if (saved && saved.id) {
        setCurrentProject(saved);
        setProjects((prev) => prev.map((p) => (p.id === saved.id ? saved : p)));
      }
    } catch (err) {
      console.warn('[KINDRA Save] Project state preserved in active session and local store:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // 1. Create New Project
  const handleNewProject = async (
    subject = '',
    title = 'New Documentary Project'
  ) => {
    setIsLoading(true);
    setStatusMessage('Initializing Documentary Project...');
    try {
      const newProj: Partial<DocumentaryProject> = {
        title,
        subject,
        stage: 'INTELLIGENCE',
        niche: 'World War II Documentaries',
        narrativeMode: 'Strategic',
        targetDurationMinutes: 10,
        targetWpm: 145,
        notes: '',
        scriptBeats: [],
        visualCues: [],
        visualAssets: [],
        voiceover: {
          selectedVoiceId: 'Fenrir',
          overallDeliveryInstruction:
            'Measured, authoritative, and atmospheric documentary cadence with deliberate historical pauses.',
          segments: [],
        },
      };

      const created = await ApiClient.createProject(newProj);
      setProjects([created, ...projects]);
      setCurrentProject(created);

      // Only trigger discovery scan if subject was explicitly passed
      if (subject.trim()) {
        handleRunDiscovery(subject.trim(), false, created);
      }
    } catch (err) {
      console.error('Create project error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Select / Open Project
  const handleSelectProject = async (id: string) => {
    if (!id) {
      setCurrentProject(null);
      return;
    }
    try {
      const proj = await ApiClient.getProject(id);
      setCurrentProject(proj);
    } catch (err) {
      console.error('Load project error:', err);
    }
  };

  // 3. Delete Project
  const handleDeleteProject = async (id: string) => {
    try {
      await ApiClient.deleteProject(id);
      const remaining = projects.filter((p) => p.id !== id);
      setProjects(remaining);
      if (currentProject?.id === id) {
        setCurrentProject(remaining[0] || null);
      }
    } catch (err) {
      console.error('Delete project error:', err);
    }
  };

  // Stage Switcher
  const handleStageSelect = (stage: ProjectStage) => {
    if (!currentProject) return;
    const updated = { ...currentProject, stage };
    persistProject(updated);
  };

  // 4. Market Discovery
  const handleRunDiscovery = async (
    query: string,
    autoExplore = false,
    targetProj = currentProject
  ) => {
    if (!targetProj) return;
    setIsLoading(true);
    setStatusMessage(`Scanning YouTube Market Intelligence for "${query}"...`);
    setSubMessage('Analyzing video velocities, small-channel outliers, and audience comments...');
    try {
      const marketData = await ApiClient.discoverMarket(query, autoExplore);
      const updated: DocumentaryProject = {
        ...targetProj,
        subject: query,
        marketData,
        stage: 'INTELLIGENCE',
      };
      await persistProject(updated);
    } catch (err) {
      console.error('Market discovery error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 5. Select Angle
  const handleSelectAngle = async (angle: DocumentaryAngle) => {
    if (!currentProject) return;
    const updated: DocumentaryProject = {
      ...currentProject,
      selectedAngle: angle,
      title: angle.titleProposal || currentProject.title,
      narrativeMode: angle.recommendedNarrativeMode || currentProject.narrativeMode,
    };
    await persistProject(updated);
  };

  // 6. Run Historical Research
  const handleRunResearch = async () => {
    if (!currentProject) return;
    setIsLoading(true);
    setStatusMessage('Executing Multi-Source Historical Research...');
    setSubMessage('Validating fact sheet claims, chronological timeline dispatches, and archival sources...');
    try {
      const researchData = await ApiClient.runResearch(
        currentProject.subject,
        currentProject.selectedAngle?.titleProposal || currentProject.title,
        currentProject.selectedAngle?.centralQuestion || currentProject.subject,
        currentProject.marketData?.commentClusters?.map((c) => c.theme) || []
      );

      const updated: DocumentaryProject = {
        ...currentProject,
        researchData,
        stage: 'RESEARCH',
      };
      await persistProject(updated);
    } catch (err) {
      console.error('Research error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 7. Generate Outline
  const handleGenerateOutline = async (
    mode: NarrativeMode,
    durationMin: number,
    wpm: number
  ) => {
    if (!currentProject) return;
    setIsLoading(true);
    setStatusMessage('Architecting Story Structure & Dramatic Beats...');
    setSubMessage(`Calibrating ${durationMin} minutes at ${wpm} WPM for continuous viewer curiosity...`);
    try {
      const outline = await ApiClient.generateOutline(
        currentProject.subject,
        currentProject.selectedAngle,
        mode,
        durationMin,
        wpm,
        currentProject.researchData
      );

      const updated: DocumentaryProject = {
        ...currentProject,
        outline,
        narrativeMode: mode,
        targetDurationMinutes: durationMin,
        targetWpm: wpm,
        stage: 'OUTLINE',
      };
      await persistProject(updated);
    } catch (err) {
      console.error('Outline error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 8. Regenerate Outline Beat
  const handleRegenerateOutlineBeat = async (
    beatNumber: number,
    currentBeat: OutlineBeat,
    direction: string
  ) => {
    if (!currentProject || !currentProject.outline) return;
    setIsLoading(true);
    setStatusMessage(`Regenerating Beat #${beatNumber}...`);
    try {
      const updatedBeat = await ApiClient.regenerateOutlineSection(
        beatNumber,
        currentBeat,
        currentProject.subject,
        currentProject.narrativeMode,
        direction
      );

      const beats = currentProject.outline.beats.map((b) =>
        b.beatNumber === beatNumber ? updatedBeat : b
      );

      const updated: DocumentaryProject = {
        ...currentProject,
        outline: { ...currentProject.outline, beats },
      };
      await persistProject(updated);
    } catch (err) {
      console.error('Regenerate beat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 9. Generate Full Script
  const handleGenerateScript = async () => {
    if (!currentProject || !currentProject.outline) return;
    setIsLoading(true);
    setStatusMessage('Drafting Master Documentary Narration Script...');
    setSubMessage('Applying anti-AI constraints, concrete historical nouns, and voice actor directives...');
    try {
      const scriptBeats = await ApiClient.generateScript(
        currentProject.outline,
        currentProject.subject,
        currentProject.researchData,
        currentProject.targetWpm
      );

      const updated: DocumentaryProject = {
        ...currentProject,
        scriptBeats,
        stage: 'SCRIPT',
      };
      await persistProject(updated);

      // Auto-run retention audit
      handleAuditRetention(updated);
    } catch (err) {
      console.error('Script generate error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 10. Regenerate Script Beat
  const handleRegenerateScriptBeat = async (beat: ScriptBeat, instruction: string) => {
    if (!currentProject) return;
    setIsLoading(true);
    setStatusMessage(`Rewriting Narration for Beat #${beat.beatNumber}...`);
    try {
      const updatedBeat = await ApiClient.regenerateScriptBeat(
        beat,
        instruction,
        currentProject.researchData
      );

      const beats = currentProject.scriptBeats.map((b) =>
        b.id === beat.id ? updatedBeat : b
      );

      const updated: DocumentaryProject = {
        ...currentProject,
        scriptBeats: beats,
      };
      await persistProject(updated);
    } catch (err) {
      console.error('Rewrite script beat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 11. Run Retention Audit
  const handleAuditRetention = async (targetProj = currentProject) => {
    if (!targetProj || !targetProj.scriptBeats || targetProj.scriptBeats.length === 0) return;
    setIsLoading(true);
    setStatusMessage('Auditing Script Retention & Pacing...');
    setSubMessage('Detecting dead beats, repetitive information, and tension drops...');
    try {
      const retentionAudit = await ApiClient.auditScriptRetention(
        targetProj.scriptBeats,
        targetProj.subject
      );

      const updated: DocumentaryProject = {
        ...targetProj,
        retentionAudit,
      };
      await persistProject(updated);
    } catch (err) {
      console.error('Retention audit error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 12. Run Fact Check
  const handleRunFactCheck = async () => {
    if (!currentProject || !currentProject.scriptBeats) return;
    setIsLoading(true);
    setStatusMessage('Evaluating Sentence-by-Sentence Fact Verification...');
    setSubMessage('Cross-referencing claims against primary archives and academic consensus...');
    try {
      const factCheckReport = await ApiClient.runFactCheck(
        currentProject.scriptBeats,
        currentProject.researchData,
        currentProject.subject
      );

      const updated: DocumentaryProject = {
        ...currentProject,
        factCheckReport,
        stage: 'FACT_CHECK',
      };
      await persistProject(updated);
    } catch (err) {
      console.error('Fact check error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 13. TTS Audio Preview
  const handleGenerateTTSPreview = async (
    text: string,
    voiceName: string,
    directive?: string
  ) => {
    setIsLoading(true);
    setStatusMessage(`Synthesizing Gemini Voice Preview (${voiceName})...`);
    try {
      const res = await ApiClient.generateTTSAudio(text, voiceName, directive);
      return res;
    } finally {
      setIsLoading(false);
    }
  };

  // 14. Generate All Voiceover Segments
  const handleGenerateAllVoiceSegments = async (
    voiceName: string,
    overallDirective: string
  ) => {
    if (!currentProject || !currentProject.scriptBeats) return;
    setIsLoading(true);
    setStatusMessage(`Synthesizing Full Documentary Voiceover with Gemini Voice "${voiceName}"...`);

    const beats = currentProject.scriptBeats;
    const newSegments: any[] = [];

    try {
      for (let i = 0; i < beats.length; i++) {
        const beat = beats[i];
        setStatusMessage(`Synthesizing Narration Beat ${i + 1} of ${beats.length}...`);
        setProgressPercent(Math.round(((i + 1) / beats.length) * 100));

        const res = await ApiClient.generateTTSAudio(
          beat.narrationText,
          voiceName,
          beat.deliveryDirective || overallDirective
        );

        newSegments.push({
          id: `seg_${Date.now()}_${i}`,
          beatId: beat.id,
          beatNumber: beat.beatNumber || i + 1,
          title: beat.title,
          narrationSnippet: beat.narrationText.substring(0, 100) + '...',
          narrationText: beat.narrationText,
          audioBase64: res.audioBase64,
          audioDataUrl: res.audioDataUrl,
          durationSeconds: res.durationSeconds || beat.estimatedDurationSeconds || 60,
          voiceId: voiceName,
          deliveryDirective: beat.deliveryDirective || overallDirective,
          filename: `0${i + 1}_beat_${beat.title.toLowerCase().replace(/\s+/g, '_')}.wav`,
          status: 'COMPLETED' as const,
          wordCount: beat.wordCount || beat.narrationText.split(/\s+/).length,
        });
      }

      const updated: DocumentaryProject = {
        ...currentProject,
        voiceover: {
          selectedVoiceId: voiceName,
          overallDeliveryInstruction: overallDirective,
          segments: newSegments,
        },
        stage: 'VOICE',
      };
      await persistProject(updated);
    } catch (err) {
      console.error('All voice segments error:', err);
    } finally {
      setIsLoading(false);
      setProgressPercent(undefined);
    }
  };

  // 14b. Generate Single Voiceover Segment
  const handleGenerateSingleVoiceSegment = async (
    segmentIndex: number,
    beat: ScriptBeat,
    voiceName: string,
    directive?: string
  ) => {
    if (!currentProject) return;
    setIsLoading(true);
    setStatusMessage(`Synthesizing Beat #${beat.beatNumber || segmentIndex + 1} with voice "${voiceName}"...`);
    try {
      const res = await ApiClient.generateTTSAudio(
        beat.narrationText,
        voiceName,
        directive || beat.deliveryDirective || currentProject.voiceover?.overallDeliveryInstruction
      );

      const existingSegments = currentProject.voiceover?.segments ? [...currentProject.voiceover.segments] : [];
      const updatedSegment = {
        id: existingSegments[segmentIndex]?.id || `seg_${Date.now()}_${segmentIndex}`,
        beatId: beat.id,
        beatNumber: beat.beatNumber || segmentIndex + 1,
        title: beat.title,
        narrationSnippet: beat.narrationText.substring(0, 100) + '...',
        narrationText: beat.narrationText,
        audioBase64: res.audioBase64,
        audioDataUrl: res.audioDataUrl,
        durationSeconds: res.durationSeconds || beat.estimatedDurationSeconds || 60,
        voiceId: voiceName,
        deliveryDirective: directive || beat.deliveryDirective,
        filename: `0${segmentIndex + 1}_beat_${beat.title.toLowerCase().replace(/\s+/g, '_')}.wav`,
        status: 'COMPLETED' as const,
        wordCount: beat.wordCount || beat.narrationText.split(/\s+/).length,
      };

      if (segmentIndex < existingSegments.length) {
        existingSegments[segmentIndex] = updatedSegment;
      } else {
        existingSegments.push(updatedSegment);
      }

      const updated: DocumentaryProject = {
        ...currentProject,
        voiceover: {
          selectedVoiceId: voiceName,
          overallDeliveryInstruction: currentProject.voiceover?.overallDeliveryInstruction || '',
          segments: existingSegments,
        },
      };
      await persistProject(updated);
    } catch (err) {
      console.error('Single voice segment error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 15. Extract Visual Cues (3-5s Rhythm)
  const handleExtractVisualCues = async () => {
    if (!currentProject || !currentProject.scriptBeats) return;
    setIsLoading(true);
    setStatusMessage('Extracting 3-5s Rhythm Visual Requirements...');
    setSubMessage('Mapping narration sentences to archival search queries and representation standards...');
    try {
      const visualCues = await ApiClient.extractVisualCues(
        currentProject.scriptBeats,
        currentProject.subject
      );

      // Auto search first batch of visual assets
      const searchRes = await ApiClient.searchVisualAssets(
        currentProject.subject,
        visualCues[0],
        false
      );

      // Match first asset to first cue
      if (searchRes.length > 0) {
        visualCues[0].selectedAssetId = searchRes[0].id;
      }

      const updated: DocumentaryProject = {
        ...currentProject,
        visualCues,
        visualAssets: searchRes,
        stage: 'VISUALS',
      };
      await persistProject(updated);
    } catch (err) {
      console.error('Extract cues error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 16. Search Visual Assets
  const handleSearchVisualAssets = async (
    query: string,
    cue?: VisualCue,
    fallbackBroaden = false
  ) => {
    if (!currentProject) return;
    setIsLoading(true);
    setStatusMessage(`Searching Verified Archival Collections for "${query || cue?.requiredMeaning}"...`);
    try {
      const newAssets = await ApiClient.searchVisualAssets(query, cue, fallbackBroaden);

      // Merge newly discovered assets
      const existing = currentProject.visualAssets || [];
      const merged = [...existing];
      newAssets.forEach((ast) => {
        if (!merged.some((m) => m.id === ast.id)) {
          merged.push(ast);
        }
      });

      const updated: DocumentaryProject = {
        ...currentProject,
        visualAssets: merged,
      };
      await persistProject(updated);
    } catch (err) {
      console.error('Search assets error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // 17. Select Asset for Cue
  const handleSelectAssetForCue = async (cueId: string, asset: VisualAsset) => {
    if (!currentProject || !currentProject.visualCues) return;
    const updatedCues = currentProject.visualCues.map((c) => {
      if (c.id === cueId) {
        return { ...c, selectedAssetId: asset.id };
      }
      return c;
    });

    const updated: DocumentaryProject = {
      ...currentProject,
      visualCues: updatedCues,
    };
    await persistProject(updated);
  };

  return (
    <div className="min-h-screen bg-[#0b0e14] text-stone-100 flex flex-col font-sans antialiased selection:bg-amber-500/30 selection:text-amber-200 overflow-x-hidden w-full">
      {/* Top Header */}
      <Header
        currentProject={currentProject}
        projects={projects}
        onSelectProject={handleSelectProject}
        onNewProject={() => handleNewProject()}
        onOpenSettings={() => setIsSettingsOpen(true)}
        isSaving={isSaving}
      />

      {/* Pipeline Navigation Bar (when inside a project) */}
      {currentProject && (
        <PipelineBar
          currentStage={currentProject.stage}
          onSelectStage={handleStageSelect}
        />
      )}

      {/* Main Workspace Stage Router */}
      <main className="flex-1 pb-16 overflow-x-hidden w-full">
        {!currentProject ? (
          <DashboardView
            projects={projects}
            onOpenProject={handleSelectProject}
            onNewProject={handleNewProject}
            onQuickExplore={(topic) => handleNewProject(topic, `Documentary: ${topic}`)}
          />
        ) : (
          <>
            {currentProject.stage === 'INTELLIGENCE' && (
              <MarketIntelligenceView
                project={currentProject}
                marketData={currentProject.marketData || null}
                onRunDiscovery={handleRunDiscovery}
                onSelectAngle={handleSelectAngle}
                onNextStage={() => handleStageSelect('TITLES')}
                onUpdateProject={(updated) =>
                  persistProject({ ...currentProject, ...updated })
                }
                isLoading={isLoading}
              />
            )}

            {currentProject.stage === 'TITLES' && (
              <TitleStudioView
                project={currentProject}
                onUpdateProject={(updated) =>
                  persistProject({ ...currentProject, ...updated })
                }
                onNextStage={handleRunResearch}
              />
            )}

            {currentProject.stage === 'RESEARCH' && (
              <ResearchWorkspaceView
                project={currentProject}
                researchData={currentProject.researchData || null}
                onRunResearch={handleRunResearch}
                onUpdateResearch={(updated) =>
                  persistProject({ ...currentProject, researchData: updated })
                }
                onNextStage={() =>
                  handleGenerateOutline(
                    currentProject.narrativeMode,
                    currentProject.targetDurationMinutes,
                    currentProject.targetWpm
                  )
                }
                isLoading={isLoading}
              />
            )}

            {currentProject.stage === 'OUTLINE' && (
              <OutlineEditorView
                project={currentProject}
                outline={currentProject.outline || null}
                onGenerateOutline={handleGenerateOutline}
                onRegenerateBeat={handleRegenerateOutlineBeat}
                onUpdateOutline={(updated) =>
                  persistProject({ ...currentProject, outline: updated })
                }
                onNextStage={handleGenerateScript}
                isLoading={isLoading}
              />
            )}

            {currentProject.stage === 'SCRIPT' && (
              <ScriptEditorView
                project={currentProject}
                scriptBeats={currentProject.scriptBeats || []}
                retentionAudit={currentProject.retentionAudit || null}
                onGenerateScript={handleGenerateScript}
                onRegenerateBeat={handleRegenerateScriptBeat}
                onAuditRetention={() => handleAuditRetention()}
                onUpdateBeats={(updated) =>
                  persistProject({ ...currentProject, scriptBeats: updated })
                }
                onNextStage={handleRunFactCheck}
                isLoading={isLoading}
              />
            )}

            {currentProject.stage === 'FACT_CHECK' && (
              <FactCheckView
                project={currentProject}
                factCheckReport={currentProject.factCheckReport || null}
                onRunFactCheck={handleRunFactCheck}
                onNextStage={() => handleStageSelect('VOICE')}
                isLoading={isLoading}
              />
            )}

            {currentProject.stage === 'VOICE' && (
              <VoiceoverEngineView
                project={currentProject}
                voices={voices}
                scriptBeats={currentProject.scriptBeats || []}
                onGeneratePreview={handleGenerateTTSPreview}
                onGenerateAllSegments={handleGenerateAllVoiceSegments}
                onGenerateSingleSegment={handleGenerateSingleVoiceSegment}
                onUpdateVoiceSegment={(idx, audio) => {}}
                onNextStage={handleExtractVisualCues}
                isLoading={isLoading}
              />
            )}

            {currentProject.stage === 'VISUALS' && (
              <VisualIntelligenceView
                project={currentProject}
                scriptBeats={currentProject.scriptBeats || []}
                visualCues={currentProject.visualCues || []}
                visualAssets={currentProject.visualAssets || []}
                onExtractCues={handleExtractVisualCues}
                onSearchAssets={handleSearchVisualAssets}
                onSelectAssetForCue={handleSelectAssetForCue}
                onNextStage={() => handleStageSelect('ROUGH_CUT')}
                isLoading={isLoading}
              />
            )}

            {currentProject.stage === 'ROUGH_CUT' && (
              <RoughCutTimelineView
                project={currentProject}
                visualCues={currentProject.visualCues || []}
                visualAssets={currentProject.visualAssets || []}
                voiceSegments={currentProject.voiceover?.segments || []}
                onNextStage={() => handleStageSelect('EXPORT_READY')}
              />
            )}

            {currentProject.stage === 'EXPORT_READY' && (
              <ExportPackageView project={currentProject} />
            )}
          </>
        )}
      </main>

      {/* Global Progress Overlay for Intelligence & Processing tasks */}
      <LiveProgressOverlay
        isLoading={isLoading}
        statusMessage={statusMessage}
        subMessage={subMessage}
        progressPercent={progressPercent}
      />

      {/* Project Settings Modal */}
      {currentProject && (
        <ProjectSettingsModal
          isOpen={isSettingsOpen}
          onClose={() => setIsSettingsOpen(false)}
          project={currentProject}
          onSave={persistProject}
          onDelete={handleDeleteProject}
        />
      )}
    </div>
  );
}
