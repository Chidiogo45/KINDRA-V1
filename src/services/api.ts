import {
  DocumentaryProject,
  MarketIntelligenceData,
  ResearchWorkspaceData,
  DocumentaryOutline,
  ScriptBeat,
  RetentionAudit,
  FactCheckReport,
  VoiceOption,
  VisualCue,
  VisualAsset,
  DocumentaryAngle,
  NarrativeMode,
} from '../types';

const LOCAL_STORAGE_PROJECTS_KEY = 'kindra_projects_mirror';

function getLocalProjects(): DocumentaryProject[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_PROJECTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalProjects(projects: DocumentaryProject[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_PROJECTS_KEY, JSON.stringify(projects));
  } catch {
    // ignore quota errors
  }
}

async function safeFetchJson<T = any>(
  url: string,
  options?: RequestInit,
  fallbackError = 'Request failed',
  maxRetries = 2
): Promise<T> {
  let lastError: any = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      const contentType = res.headers.get('content-type') || '';

      if (!contentType.includes('application/json')) {
        const text = await res.text();
        if (!res.ok) {
          throw new Error(`Server status ${res.status}: ${res.statusText || fallbackError}`);
        }
        throw new Error(`Invalid response format from ${url}`);
      }

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error || fallbackError);
      }
      return json.data as T;
    } catch (err: any) {
      lastError = err;
      const isNetworkError =
        err?.name === 'TypeError' ||
        err?.message?.includes('Failed to fetch') ||
        err?.message?.includes('NetworkError') ||
        err?.message?.includes('network');

      if (isNetworkError && attempt < maxRetries) {
        // Wait briefly before retrying in case the server was restarting
        const backoff = 350 * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
      break;
    }
  }

  console.warn(`[API Info ${url}]:`, lastError?.message || lastError);
  throw lastError;
}

export class ApiClient {
  // Projects
  static async getProjects(): Promise<DocumentaryProject[]> {
    try {
      const data = await safeFetchJson<DocumentaryProject[]>('/api/projects', undefined, 'Failed to fetch projects');
      if (data && data.length > 0) {
        saveLocalProjects(data);
        return data;
      }
    } catch (err) {
      const local = getLocalProjects();
      if (local.length > 0) return local;
    }
    const local = getLocalProjects();
    return local;
  }

  static async getProject(id: string): Promise<DocumentaryProject> {
    if (!id) throw new Error('Missing project ID');
    try {
      const data = await safeFetchJson<DocumentaryProject>(
        `/api/projects/${encodeURIComponent(id)}`,
        undefined,
        'Failed to load project'
      );
      if (data) {
        const list = getLocalProjects().filter((p) => p.id !== id);
        saveLocalProjects([data, ...list]);
        return data;
      }
    } catch (err) {
      const local = getLocalProjects().find((p) => p.id === id);
      if (local) return local;
      throw err;
    }
    throw new Error('Project not found');
  }

  static async createProject(project: Partial<DocumentaryProject>): Promise<DocumentaryProject> {
    try {
      const created = await safeFetchJson<DocumentaryProject>(
        '/api/projects',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(project),
        },
        'Failed to create project'
      );
      if (created) {
        const list = getLocalProjects().filter((p) => p.id !== created.id);
        saveLocalProjects([created, ...list]);
        return created;
      }
    } catch (err) {
      // Fallback local creation if server offline
      const fallbackId = project.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const fallbackProj: DocumentaryProject = {
        ...(project as any),
        id: fallbackId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const list = getLocalProjects().filter((p) => p.id !== fallbackId);
      saveLocalProjects([fallbackProj, ...list]);
      return fallbackProj;
    }
    throw new Error('Could not create project');
  }

  static async saveProject(project: DocumentaryProject): Promise<DocumentaryProject> {
    if (!project) throw new Error('Missing project to save');
    const id = project.id;
    if (!id) {
      return this.createProject(project);
    }

    // Always mirror in localStorage immediately for zero data loss
    const currentLocal = getLocalProjects().filter((p) => p.id !== id);
    const updatedWithTimestamp = { ...project, updatedAt: new Date().toISOString() };
    saveLocalProjects([updatedWithTimestamp, ...currentLocal]);

    try {
      const saved = await safeFetchJson<DocumentaryProject>(
        `/api/projects/${encodeURIComponent(id)}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updatedWithTimestamp),
        },
        'Failed to save project'
      );
      if (saved) {
        saveLocalProjects([saved, ...currentLocal]);
        return saved;
      }
    } catch (err) {
      // If server is temporarily unreachable, return local copy safely
      console.warn('[ApiClient] Server save deferred, project safely retained in local session.');
      return updatedWithTimestamp;
    }
    return updatedWithTimestamp;
  }

  static async deleteProject(id: string): Promise<void> {
    if (!id) return;
    const remaining = getLocalProjects().filter((p) => p.id !== id);
    saveLocalProjects(remaining);
    try {
      await safeFetchJson<void>(
        `/api/projects/${encodeURIComponent(id)}`,
        { method: 'DELETE' },
        'Failed to delete project'
      );
    } catch (err) {
      // Local removal already executed
    }
  }

  // Market Discovery & Exploration
  static async exploreTopics(
    niche = 'World War II Documentaries',
    filters = {},
    refresh = false
  ): Promise<any[]> {
    return safeFetchJson<any[]>(
      '/api/market/explore-topics',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ niche, filters, refresh }),
      },
      'Topic exploration failed'
    );
  }

  static async discoverMarket(
    query: string,
    autoExplore = false,
    niche = 'World War II Documentaries',
    filters = {}
  ): Promise<MarketIntelligenceData> {
    return safeFetchJson<MarketIntelligenceData>(
      '/api/market/discover',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, autoExplore, niche, filters }),
      },
      'Market discovery failed'
    );
  }

  // Titles Research & Generation
  static async researchTitles(
    topic: string,
    angleTitle?: string,
    centralQuestion?: string,
    niche = 'World War II Documentaries',
    refresh = false
  ): Promise<any[]> {
    return safeFetchJson<any[]>(
      '/api/titles/research',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, angleTitle, centralQuestion, niche, refresh }),
      },
      'Title research failed'
    );
  }

  static async generateTitles(params: {
    topic?: string;
    angle?: any;
    inspirationTitle?: string;
    structuralBlueprint?: string;
    regenerationMode?: string;
    customInstruction?: string;
  }): Promise<any[]> {
    return safeFetchJson<any[]>(
      '/api/titles/generate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(params),
      },
      'Title generation failed'
    );
  }

  // Angles
  static async generateAngles(topic: string, subject: string, audienceGaps: string[] = []): Promise<DocumentaryAngle[]> {
    const data = await safeFetchJson<DocumentaryAngle[]>(
      '/api/angles/generate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, subject, audienceGaps }),
      },
      'Angle generation failed'
    );
    return data || [];
  }

  // Research
  static async runResearch(
    subject: string,
    angleTitle: string,
    centralQuestion: string,
    audienceGaps: string[] = []
  ): Promise<ResearchWorkspaceData> {
    return safeFetchJson<ResearchWorkspaceData>(
      '/api/research/run',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, angleTitle, centralQuestion, audienceGaps }),
      },
      'Research failed'
    );
  }

  // Outline
  static async generateOutline(
    subject: string,
    angle: any,
    narrativeMode: NarrativeMode = 'Strategic',
    targetDurationMinutes = 10,
    targetWpm = 145,
    researchData?: any
  ): Promise<DocumentaryOutline> {
    return safeFetchJson<DocumentaryOutline>(
      '/api/outline/generate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject, angle, narrativeMode, targetDurationMinutes, targetWpm, researchData }),
      },
      'Outline generation failed'
    );
  }

  static async regenerateOutlineSection(
    beatNumber: number,
    currentBeat: any,
    subject: string,
    narrativeMode: string,
    direction: string
  ): Promise<any> {
    return safeFetchJson<any>(
      '/api/outline/regenerate-section',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beatNumber, currentBeat, subject, narrativeMode, direction }),
      },
      'Beat regeneration failed'
    );
  }

  // Script
  static async generateScript(
    outline: DocumentaryOutline,
    subject: string,
    researchData?: any,
    targetWpm = 145
  ): Promise<ScriptBeat[]> {
    const data = await safeFetchJson<ScriptBeat[]>(
      '/api/script/generate',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ outline, subject, researchData, targetWpm }),
      },
      'Script generation failed'
    );
    return data || [];
  }

  static async regenerateScriptBeat(beat: ScriptBeat, instruction: string, researchData?: any): Promise<ScriptBeat> {
    return safeFetchJson<ScriptBeat>(
      '/api/script/regenerate-beat',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beat, instruction, researchData }),
      },
      'Script beat regeneration failed'
    );
  }

  static async auditScriptRetention(scriptBeats: ScriptBeat[], subject: string): Promise<RetentionAudit> {
    return safeFetchJson<RetentionAudit>(
      '/api/script/retention-audit',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptBeats, subject }),
      },
      'Retention audit failed'
    );
  }

  static async runFactCheck(scriptBeats: ScriptBeat[], researchData?: any, subject?: string): Promise<FactCheckReport> {
    return safeFetchJson<FactCheckReport>(
      '/api/script/fact-check',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptBeats, researchData, subject }),
      },
      'Fact check failed'
    );
  }

  // Voiceover / TTS
  static async getVoiceOptions(): Promise<VoiceOption[]> {
    const data = await safeFetchJson<VoiceOption[]>('/api/tts/voices', undefined, 'Failed to fetch voice options');
    return data || [];
  }

  static async generateTTSAudio(
    text: string,
    voiceName: string,
    deliveryDirective?: string
  ): Promise<{ audioBase64: string; audioDataUrl: string; durationSeconds: number; voiceUsed: string }> {
    return safeFetchJson<{ audioBase64: string; audioDataUrl: string; durationSeconds: number; voiceUsed: string }>(
      '/api/tts/generate-audio',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voiceName, deliveryDirective }),
      },
      'Audio generation failed'
    );
  }

  // Visuals
  static async extractVisualCues(scriptBeats: ScriptBeat[], subject: string): Promise<VisualCue[]> {
    const data = await safeFetchJson<VisualCue[]>(
      '/api/visuals/extract-cues',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptBeats, subject }),
      },
      'Visual cue extraction failed'
    );
    return data || [];
  }

  static async searchVisualAssets(query: string, cue?: VisualCue, fallbackBroaden = false): Promise<VisualAsset[]> {
    const data = await safeFetchJson<VisualAsset[]>(
      '/api/visuals/search',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, cue, fallbackBroaden }),
      },
      'Visual search failed'
    );
    return data || [];
  }
}
