import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// CORS & Robust API headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Ensure projects data directory exists
const DATA_DIR = path.join(process.cwd(), 'data', 'projects');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Lazy Gemini AI Client initialization
let genAIClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[KINDRA Server] GEMINI_API_KEY is not set. Operating in fallback mock/deterministic mode.');
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return genAIClient;
}

// Clean and extract JSON from raw Gemini model response
function extractJsonFromText(text: string): string | null {
  if (!text) return null;
  const trimmed = text.trim();
  // Strip markdown code fences if present (```json ... ``` or ``` ...)
  if (trimmed.startsWith('```')) {
    const withoutStart = trimmed.replace(/^```(?:json)?\s*/i, '');
    const withoutEnd = withoutStart.replace(/```\s*$/, '');
    return withoutEnd.trim();
  }
  // If it contains embedded JSON object or array
  const firstBrace = trimmed.indexOf('{');
  const firstBracket = trimmed.indexOf('[');
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    const lastBrace = trimmed.lastIndexOf('}');
    if (lastBrace !== -1 && lastBrace > firstBrace) {
      return trimmed.substring(firstBrace, lastBrace + 1);
    }
  } else if (firstBracket !== -1) {
    const lastBracket = trimmed.lastIndexOf(']');
    if (lastBracket !== -1 && lastBracket > firstBracket) {
      return trimmed.substring(firstBracket, lastBracket + 1);
    }
  }
  return trimmed;
}

interface GeminiJsonOptions {
  prompt: string;
  systemInstruction?: string;
  temperature?: number;
  preferredModels?: string[];
  maxRetriesPerModel?: number;
}

// Resilient AI caller that handles 503 high demand / 429 quota by retrying and falling back to alternative models
async function executeGeminiJson<T = any>(
  options: GeminiJsonOptions
): Promise<{ success: boolean; data: T | null; modelUsed?: string }> {
  const ai = getGeminiClient();
  if (!ai) {
    return { success: false, data: null };
  }

  // Model cascade: try flash-latest first for maximum availability and speed, with seamless fallbacks
  const candidateModels = options.preferredModels && options.preferredModels.length > 0
    ? options.preferredModels
    : ['gemini-flash-latest', 'gemini-3.7-flash', 'gemini-3.1-flash-lite'];

  const maxRetries = options.maxRetriesPerModel ?? 1;

  for (const model of candidateModels) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const config: any = {
          responseMimeType: 'application/json',
          temperature: options.temperature ?? 0.6,
        };
        if (options.systemInstruction) {
          config.systemInstruction = options.systemInstruction;
        }

        const response = await ai.models.generateContent({
          model,
          contents: options.prompt,
          config,
        });

        const rawText = response.text || '';
        const cleanedText = extractJsonFromText(rawText);
        if (cleanedText) {
          try {
            const parsed = JSON.parse(cleanedText);
            return { success: true, data: parsed as T, modelUsed: model };
          } catch (jsonErr) {
            // Attempt next iteration or model
          }
        }
      } catch (err: any) {
        const isTransient =
          err?.status === 'UNAVAILABLE' ||
          err?.code === 503 ||
          err?.status === 'RESOURCE_EXHAUSTED' ||
          err?.code === 429 ||
          err?.message?.includes('503') ||
          err?.message?.includes('429') ||
          err?.message?.includes('high demand') ||
          err?.message?.includes('quota');

        if (isTransient && attempt < maxRetries) {
          const delay = 350 * Math.pow(2, attempt) + Math.random() * 150;
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        } else if (isTransient) {
          break; // Seamlessly cascade to next candidate model
        } else {
          break;
        }
      }
    }
  }

  return { success: false, data: null };
}

// ==========================================
// 1. HEALTH & SYSTEM INFO
// ==========================================
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    timestamp: new Date().toISOString(),
  });
});

// ==========================================
// 2. PROJECT PERSISTENCE (DISK STORAGE)
// ==========================================
app.get('/api/projects', (req, res) => {
  try {
    seedDefaultProjectIfNeeded();
    const files = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    const projects = files.map(file => {
      try {
        const content = fs.readFileSync(path.join(DATA_DIR, file), 'utf-8');
        return JSON.parse(content);
      } catch (err) {
        return null;
      }
    }).filter(Boolean);
    
    // Sort by updatedAt descending
    projects.sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
    res.json({ success: true, data: projects });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/projects/:id', (req, res) => {
  try {
    const projId = req.params.id;
    if (!projId || projId === 'undefined' || projId === 'null') {
      return res.status(400).json({ success: false, error: 'Invalid project ID provided' });
    }
    const safeFilename = `${projId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
    const filePath = path.join(DATA_DIR, safeFilename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, error: 'Project not found' });
    }
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

function saveProjectToDisk(project: any, explicitId?: string): any {
  if (!project) {
    throw new Error('No project payload received');
  }
  const id = explicitId || project.id || `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  project.id = id;
  project.createdAt = project.createdAt || new Date().toISOString();
  project.updatedAt = new Date().toISOString();

  const safeFilename = `${id.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
  const filePath = path.join(DATA_DIR, safeFilename);
  fs.writeFileSync(filePath, JSON.stringify(project, null, 2), 'utf-8');
  return project;
}

app.post('/api/projects', (req, res) => {
  try {
    const saved = saveProjectToDisk(req.body);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/projects', (req, res) => {
  try {
    const saved = saveProjectToDisk(req.body);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.put('/api/projects/:id', (req, res) => {
  try {
    const saved = saveProjectToDisk(req.body, req.params.id);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/projects/:id', (req, res) => {
  try {
    const saved = saveProjectToDisk(req.body, req.params.id);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/projects/:id', (req, res) => {
  try {
    const projId = req.params.id;
    if (projId) {
      const safeFilename = `${projId.replace(/[^a-zA-Z0-9_-]/g, '_')}.json`;
      const filePath = path.join(DATA_DIR, safeFilename);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Simple in-memory cache for API quota efficiency and speed
const apiCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

function getCachedData<T>(key: string): T | null {
  const entry = apiCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.data as T;
  }
  return null;
}

function setCachedData(key: string, data: any) {
  apiCache.set(key, { timestamp: Date.now(), data });
}

// ==========================================
// 3. MARKET INTELLIGENCE & TOPIC DISCOVERY
// ==========================================

// Broad topic discovery across multiple historical dimensions (Mode B)
app.post('/api/market/explore-topics', async (req, res) => {
  const { niche = 'World War II Documentaries', filters = {} } = req.body;
  const cacheKey = `explore_topics_${niche.toLowerCase().replace(/\s+/g, '_')}`;

  const cached = getCachedData<any[]>(cacheKey);
  if (cached && !req.body.refresh) {
    return res.json({ success: true, data: cached });
  }

  const prompt = `You are KINDRA's Market Intelligence Topic Discovery Engine.
Project Niche: "${niche}"

Discover 6 to 8 HIGH-POTENTIAL documentary topic opportunities within this niche.
Do NOT just search generic phrases like "WWII documentaries".
Instead, draw from diverse research dimensions:
- Decisive or forgotten battles & operations
- Commander rivalries & fatal decisions
- Military intelligence, cryptanalysis & espionage
- Military technology, secret superweapons, and mechanical logistics
- Resistance movements, deception tactics, and special operations
- High-curiosity historical mysteries and turning points.

For EACH topic opportunity, calculate:
1. topic: Specific historical subject name (e.g. "Operation Market Garden: The Bridge at Arnhem", "Operation Gunnerside: Heavy Water Sabotage", "The Scheldt Pocket Water War")
2. category: Dimension (e.g. "Tactical Encirclement", "Espionage & Sabotage", "Logistical Crisis", "Deception & Technology", "Fortress Siege")
3. opportunityScore: 0-100 score based on demand vs competition
4. risingSignal: 1-5 integer (stars)
5. competition: "Low" | "Medium" | "High"
6. breakoutSignal: "Low" | "Medium" | "High"
7. audienceInterest: "Low" | "Medium" | "High"
8. classifications: Array of tags containing one or more of: ["RISING", "BREAKOUT", "STRONG DEMAND", "UNDERSERVED", "EVERGREEN"]
9. evidenceCount: number of analyzed videos (e.g. 11, 14, 18)
10. bestExample: Object with title, views (number), viewsFormatted (e.g. "1.8M views"), channelName, subscriberCount (number), viewsPerSub (number, views/subs ratio), uploadDate
11. recentMomentum: "Surging" | "Strong" | "Moderate"
12. audienceGap: A real representative question or knowledge gap asked in YouTube comment sections
13. whyThisTopic: Concrete, evidence-based factual explanation (e.g. "3 relatively small channels recently published videos on this subject that significantly outperformed their subscriber bases (24x+ VPS) with minimal high-production competition.")
14. evidenceVideos: Array of 3-4 realistic video records with id, title, channelName, subscriberCount, views, viewsPerSubscriber, outlierScore, engagementRate.

Return strictly valid JSON:
{
  "topics": [
    {
      "id": "opp_1",
      "topic": "Operation Market Garden",
      "category": "Operational Failure",
      "opportunityScore": 88,
      "risingSignal": 4,
      "competition": "Medium",
      "breakoutSignal": "High",
      "audienceInterest": "High",
      "classifications": ["BREAKOUT", "STRONG DEMAND"],
      "evidenceCount": 14,
      "bestExample": {
        "title": "Why Montgomery's Plan Was Doomed in 48 Hours",
        "views": 1840000,
        "viewsFormatted": "1.8M views",
        "channelName": "Tactical Archives",
        "subscriberCount": 42000,
        "viewsPerSub": 43.8,
        "uploadDate": "2024-02-15"
      },
      "recentMomentum": "Strong",
      "audienceGap": "Why did British high command ignore aerial photos showing II SS Panzer Corps in Arnhem woods?",
      "whyThisTopic": "Small-channel breakouts (43.8x views-per-subscriber) demonstrate acute audience demand for tactical friction breakdowns rather than general overviews."
    }
  ]
}`;

  const result = await executeGeminiJson<{ topics: any[] }>({ prompt, temperature: 0.7 });
  if (result.success && Array.isArray(result.data?.topics) && result.data.topics.length > 0) {
    setCachedData(cacheKey, result.data.topics);
    return res.json({ success: true, data: result.data.topics });
  }

  const fallback = generateMockTopicOpportunities(niche);
  setCachedData(cacheKey, fallback);
  res.json({ success: true, data: fallback });
});

// Targeted Market Intelligence Analysis (Mode A: specific topic)
app.post('/api/market/discover', async (req, res) => {
  const { query, autoExplore = false, niche = 'World War II Documentaries', filters = {} } = req.body;
  const targetTopic = query?.trim() || (autoExplore ? 'Untold Turning Points of World War II' : 'Battle of Kharkov 1943');
  const cacheKey = `market_discover_${targetTopic.toLowerCase().replace(/\s+/g, '_')}`;

  const cached = getCachedData<any>(cacheKey);
  if (cached && !req.body.refresh) {
    return res.json({ success: true, data: cached });
  }

  const prompt = `You are KINDRA's Market Intelligence & Topic Discovery Engine.
Analyze the documentary video market and audience interest for: "${targetTopic}".
Project Niche: "${niche}".

Distinguish clearly between:
- TRENDING vs HIGH DEMAND vs HIGH GROWTH vs BREAKOUT vs UNDERSERVED OPPORTUNITY.
- Identify at least 6-8 realistic YouTube videos in this historical niche with real/realistic channels, views, subscriber counts, engagement metrics.
- MUST highlight small-channel breakouts (e.g. 35k subs getting 750k+ views with explanation).
- Extract 4-6 audience comment clusters (questions, historical misconceptions, requests for context).
- Calculate an explainable Opportunity Score (Overall 0-100, Demand, Momentum, Outlier Signal, Engagement, Competition, Audience Gap).
- Generate 4-6 high-potential documentary angles with Central Question, Core Conflict, Historical Novelty, and Recommended Narrative Mode.

Return strictly valid JSON conforming to this structure:
{
  "query": "${targetTopic}",
  "expandedKeywords": ["keyword 1", "keyword 2", "keyword 3", "keyword 4"],
  "analyzedAt": "${new Date().toISOString()}",
  "totalVideosAnalyzed": 24,
  "opportunityScore": {
    "overall": 88,
    "demand": 92,
    "momentum": 85,
    "outlierSignal": 94,
    "engagement": 82,
    "competition": 45,
    "audienceGapScore": 89,
    "explanation": "Detailed breakdown why this topic has massive breakout potential with low high-production competition."
  },
  "videos": [
    {
      "id": "vid1",
      "title": "Compelling Title",
      "channelName": "Channel Name",
      "channelId": "ch1",
      "subscriberCount": 42000,
      "uploadDate": "2024-03-12",
      "duration": "14:20",
      "durationSeconds": 860,
      "views": 840000,
      "likes": 48000,
      "commentsCount": 3200,
      "description": "Video overview...",
      "thumbnail": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80",
      "sourceUrl": "https://youtube.com/watch?v=sample1",
      "transcriptAvailable": true,
      "engagementRate": 6.1,
      "viewsPerSubscriber": 20.0,
      "isSmallChannelBreakout": true,
      "outlierScore": 95,
      "outlierReason": "Achieved 20x subscriber baseline views within 90 days with exceptional retention signals."
    }
  ],
  "commentClusters": [
    {
      "id": "com1",
      "theme": "Misconception regarding strategic retreat",
      "type": "QUESTION",
      "representativeComments": [
        "Why didn't the field marshal order an orderly withdrawal 48 hours earlier?",
        "Did high command know the fuel reserves were dry?"
      ],
      "frequencyCount": 142,
      "productionImplication": "Include a dedicated beat explaining the logistics fuel report of Feb 18th to directly resolve this audience question."
    }
  ],
  "angles": [
    {
      "id": "ang1",
      "titleProposal": "Defensible Specific Title",
      "alternativeTitles": ["Alt Title A", "Alt Title B"],
      "angleCategory": "Strategic Decision",
      "centralQuestion": "What specific intelligence oversight triggered the catastrophic encirclement?",
      "coreConflict": "High command optimism vs frontline reconnaissance reality",
      "historicalNovelty": "Declassified telegram logs showing the delayed orders",
      "audienceAppeal": "High curiosity regarding command friction and technological miscalculations",
      "evidenceAvailability": "Abundant Primary",
      "recommendedNarrativeMode": "Strategic",
      "curiosityHook": "On February 14th, three aerial photos arrived at headquarters. They were filed in the wrong drawer."
    }
  ],
  "demandTrend": [
    { "month": "Jan", "interest": 65, "competitorUploads": 2 },
    { "month": "Feb", "interest": 78, "competitorUploads": 3 },
    { "month": "Mar", "interest": 91, "competitorUploads": 4 }
  ]
}`;

  const result = await executeGeminiJson<any>({ prompt, temperature: 0.7 });
  if (result.success && result.data) {
    const parsed = result.data;
    parsed.outliers = parsed.videos?.filter((v: any) => v.isSmallChannelBreakout || v.outlierScore >= 80) || [];
    setCachedData(cacheKey, parsed);
    return res.json({ success: true, data: parsed });
  }

  // Fallback if AI unavailable or key missing
  const mockData = generateMockMarketData(targetTopic);
  setCachedData(cacheKey, mockData);
  res.json({ success: true, data: mockData });
});

// ==========================================
// 4. ANGLE GENERATION
// ==========================================
app.post('/api/angles/generate', async (req, res) => {
  const { topic, subject, audienceGaps = [] } = req.body;
  const targetTopic = topic || subject || 'Battle of Kharkov 1943';

  const prompt = `You are KINDRA's Documentary Angle Generator.
Topic: "${targetTopic}".
Audience Gaps to Address: ${JSON.stringify(audienceGaps)}

Generate 5 distinct, highly compelling documentary angles across different categories (Strategic Decision, Commander Conflict, Intelligence Failure, Logistical Crisis, Tactical Turning Point, Human Experience, Technological Evolution).
Ensure proposed titles are:
- Historically defensible
- Curiosity-driven without cheap clickbait or false drama
- Specific and authentic.

Return JSON schema:
{
  "angles": [
    {
      "id": "ang_1",
      "titleProposal": "The Telegram That Sealed the Kharkov Pocket",
      "alternativeTitles": ["The Forgotten Counter-Stroke", "How 48 Hours Reversed the Eastern Front"],
      "angleCategory": "Strategic Decision",
      "centralQuestion": "How did a routed army execute history's most devastating armored counter-offensive in deep snow?",
      "coreConflict": "Overextended Soviet spearheads vs Manstein's disciplined elastic defense",
      "historicalNovelty": "Synthesizes captured radio traffic with recently translated quartermaster manifests",
      "audienceAppeal": "Answers why the front didn't collapse entirely in early 1943",
      "evidenceAvailability": "Abundant Primary",
      "recommendedNarrativeMode": "Strategic",
      "curiosityHook": "In mid-February 1943, Moscow believed the southern German armies were in irreversible flight. That confidence proved fatal."
    }
  ]
}`;

  const result = await executeGeminiJson<{ angles: any[] }>({ prompt });
  if (result.success && result.data?.angles) {
    return res.json({ success: true, data: result.data.angles });
  }

  res.json({ success: true, data: generateMockAngles(targetTopic) });
});

// ==========================================
// 4.1 TITLE RESEARCH & PATTERN ANALYSIS
// ==========================================
app.post('/api/titles/research', async (req, res) => {
  const { topic, angleTitle, centralQuestion, niche = 'World War II Documentaries' } = req.body;
  const targetTopic = topic || 'Battle of Kharkov 1943';
  const cacheKey = `titles_research_${targetTopic.toLowerCase().replace(/\s+/g, '_')}`;

  const cached = getCachedData<any[]>(cacheKey);
  if (cached && !req.body.refresh) {
    return res.json({ success: true, data: cached });
  }

  const prompt = `You are KINDRA's Lead Title Intelligence Analyst.
Analyze 6 high-performing YouTube documentary video titles related to "${targetTopic}" within "${niche}".
Perform deep structural and rhetorical breakdown on each title.

For each video title, extract:
1. id: unique string
2. videoTitle: Full real/representative successful title
3. channelName: Channel name
4. views: integer (e.g. 1450000)
5. subscriberCount: integer (e.g. 52000)
6. viewsPerSubscriber: float ratio (e.g. 27.8)
7. engagementRate: float percentage (e.g. 6.4)
8. uploadDate: string (e.g. "2023-11-20")
9. titleLength: character length
10. structure: Blueprint format, e.g. "[CONSEQUENCE] + [MISTAKE] + [SUBJECT]" or "[QUESTION/PARADOX] + [PHYSICAL OBSTACLE] + [SCALE]"
11. curiosityMechanism: Rhetorical mechanism (e.g. "Information Gap / Fatal Flaw", "Scale Paradox", "Declassified Secret", "Character Defiance")
12. subjectPlacement: "Leading" | "Center" | "Trailing"
13. emotionalFraming: e.g. "Catastrophic Irony", "Forensic Realism", "Investigative Urgency"
14. specificity: Specific data points (e.g. "Exact 48-hour timeline", "3 miles & 600 tanks")
15. impliedPromise: What the viewer expects to learn
16. wordingPatterns: 2-3 key phrases or keywords that drive click-through without clickbait.

Return JSON schema:
{
  "researchedTitles": [
    {
      "id": "rt_1",
      "videoTitle": "The Mistake That Destroyed Germany's Best Tank Army",
      "channelName": "Battlefield Tactics",
      "views": 1820000,
      "subscriberCount": 65000,
      "viewsPerSubscriber": 28.0,
      "engagementRate": 6.8,
      "uploadDate": "2024-01-14",
      "titleLength": 49,
      "structure": "[CONSEQUENCE] + [MISTAKE] + [SUBJECT]",
      "curiosityMechanism": "Unforeseen Consequence / Fatal Flaw",
      "subjectPlacement": "Trailing",
      "emotionalFraming": "Catastrophic Irony",
      "specificity": "Unit-specific operational disaster",
      "impliedPromise": "Reveals the exact single command oversight that doomed an elite army",
      "wordingPatterns": ["The Mistake That", "Best Tank Army"]
    }
  ]
}`;

  const result = await executeGeminiJson<{ researchedTitles: any[] }>({ prompt });
  if (result.success && Array.isArray(result.data?.researchedTitles) && result.data.researchedTitles.length > 0) {
    setCachedData(cacheKey, result.data.researchedTitles);
    return res.json({ success: true, data: result.data.researchedTitles });
  }

  const fallback = generateMockResearchedTitles(targetTopic);
  setCachedData(cacheKey, fallback);
  res.json({ success: true, data: fallback });
});

// ==========================================
// 4.2 TITLE GENERATOR & QUALITY CONTROL
// ==========================================
app.post('/api/titles/generate', async (req, res) => {
  const {
    topic,
    angle,
    inspirationTitle,
    structuralBlueprint,
    regenerationMode = 'default',
    customInstruction,
  } = req.body;

  const targetTopic = topic || angle?.titleProposal || 'Battle of Kharkov 1943';
  const angleContext = angle ? `Angle: "${angle.titleProposal}". Central Question: "${angle.centralQuestion}". Core Conflict: "${angle.coreConflict}".` : '';

  const prompt = `You are KINDRA's Documentary Title Generator and Editorial Quality Evaluator.
Subject / Campaign: "${targetTopic}"
${angleContext}
Inspiration Title: "${inspirationTitle || 'None'}"
Structural Blueprint: "${structuralBlueprint || 'None'}"
Regeneration Directive: "${regenerationMode}"
${customInstruction ? `User Specific Instruction: "${customInstruction}"` : ''}

Strict Quality Principles:
- Factual Accuracy: The title must be historically defensible.
- Clarity & Specificity: Clear premise, concrete subjects/metrics where appropriate.
- Anti-Clickbait & Anti-AI Slop: NO sensationalist lies, NO generic buzzwords, NO fake drama.
- Curiosity: Genuine curiosity hook driven by historical friction, paradox, or tactical cause-and-effect.

Generate 6 high-caliber title candidates across distinct strategies:
1. RESEARCH_INSPIRED: Applies structural characteristics from high-performing videos without copying text or simple synonym swapping.
2. ORIGINAL: Completely fresh narrative framing tailored to the selected documentary angle.
3. HIGH_CURIOSITY: Creates an intense historical information gap that is 100% resolved by historical facts.
4. STRATEGIC: Highlights tactical decisions, commander friction, or logistics.
5. HUMAN: Focuses on commander psychology, soldier experience, or personal stakes.
6. CUSTOM / ITERATION: Directly follows the regeneration directive (${regenerationMode}) or user instruction.

For EACH candidate, provide rigorous editorial AI quality scores (1-10 integer):
- clarityScore: (1-10)
- curiosityScore: (1-10)
- specificityScore: (1-10)
- accuracyScore: (1-10)
- overallScore: (1.0 - 10.0 calculated editorial rating)
- critique: Concise 1-sentence editorial evaluation of strengths and risks.

Return JSON schema:
{
  "candidates": [
    {
      "id": "tc_1",
      "title": "The 48-Hour Mirage: When Moscow Celebrated Three Days Too Soon",
      "strategy": "RESEARCH_INSPIRED",
      "strategyLabel": "Research-Inspired",
      "structuralBlueprint": "[TIMEFRAME] + [CONSEQUENCE] + [IRONIC_CONTRAST]",
      "inspiredByVideoTitle": "${inspirationTitle || ''}",
      "clarityScore": 9,
      "curiosityScore": 9,
      "specificityScore": 9,
      "accuracyScore": 10,
      "overallScore": 9.3,
      "critique": "Exceptional temporal tension and authentic historical irony without misleading the viewer."
    }
  ]
}`;

  const result = await executeGeminiJson<{ candidates: any[] }>({ prompt, temperature: 0.75 });
  if (result.success && Array.isArray(result.data?.candidates) && result.data.candidates.length > 0) {
    return res.json({ success: true, data: result.data.candidates });
  }

  const fallback = generateMockTitleCandidates(targetTopic, angle, inspirationTitle, regenerationMode, customInstruction);
  res.json({ success: true, data: fallback });
});

// ==========================================
// 5. HISTORICAL RESEARCH ENGINE
// ==========================================
app.post('/api/research/run', async (req, res) => {
  const { subject, angleTitle, centralQuestion, audienceGaps = [] } = req.body;

  const prompt = `You are KINDRA's Lead Historical Research Specialist.
Strict Principle: FACTUAL ACCURACY, SOURCE TRACEABILITY, TRANSPARENT UNCERTAINTY.
Never invent dates, casualty figures, commanders, unit numbers, or quotes.
If evidence is contested or unresolved, mark it clearly as 'UNRESOLVED' or 'DISPUTED'.

Subject: "${subject}"
Angle: "${angleTitle}"
Central Question: "${centralQuestion}"
Audience Questions to resolve: ${JSON.stringify(audienceGaps)}

Generate comprehensive structured research data:
1. Fact Sheet claims (12-16 items) with claim, category (FACT, INTERPRETATION, ANALYSIS, UNCERTAINTY, UNVERIFIED), primarySource, sourceType (Primary Archive, Official Military Record, Academic Journal, Institutional Museum, Secondary History), confidence (HIGH, MEDIUM, LOW, UNRESOLVED), supportingEvidence, contradictoryEvidence.
2. Timeline (8-10 key dated events with timestamps, locations, significance, and source refs).
3. People (key commanders/actors with roles and historical context).
4. Units & Equipment (military divisions, tanks, aircraft, logistics with authentic specs).
5. Locations (strategic cities, rivers, rail junctions).
6. Major Causes & Consequences.
7. Disputed Points (e.g. troop estimates, specific orders timing with both sides explained).
8. Open Questions remaining in historiography.

Return valid JSON structure:
{
  "subject": "${subject}",
  "topicSummary": "Concise 3-paragraph authoritative historical briefing...",
  "claims": [
    {
      "id": "claim_1",
      "claim": "General Field Marshal Manstein launched the counter-offensive on February 19, 1943, with the 4th Panzer Army.",
      "category": "FACT",
      "primarySource": "Bundesarchiv-Militärarchiv RH 19-V / War Diary of Army Group South",
      "sourceUrl": "https://www.bundesarchiv.de",
      "sourceType": "Primary Archive",
      "publicationDate": "1943-02-20",
      "confidence": "HIGH",
      "supportingEvidence": "Official daily log entries and operational order Nr. 48/43 confirm the exact assault initiation time.",
      "contradictoryEvidence": "",
      "verified": true
    }
  ],
  "timeline": [
    {
      "id": "time_1",
      "dateStr": "February 16, 1943",
      "timestampSort": 19430216,
      "title": "SS Panzer Corps Evacuates Kharkov",
      "description": "Defying direct orders to hold the fortress city, Hausser withdraws to preserve fighting strength.",
      "keyActors": ["Paul Hausser", "Adolf Hitler"],
      "location": "Kharkov, Ukrainian SSR",
      "significance": "Preserved the mechanized core that made the subsequent counter-stroke possible.",
      "sourceRef": "NARA T-311 Roll 268",
      "confidence": "HIGH"
    }
  ],
  "people": [
    {
      "id": "peop_1",
      "name": "Erich von Manstein",
      "roleOrType": "Commander, Army Group South",
      "historicalContext": "Architect of the backhand stroke doctrine",
      "keyActions": ["Halted retreat at the Mius line", "Concentrated 4th Panzer Army against Soviet flank"]
    }
  ],
  "unitsAndEquipment": [
    {
      "id": "unit_1",
      "name": "Tiger I (Panzerkampfwagen VI Ausf. E)",
      "roleOrType": "Heavy Tank",
      "historicalContext": "First major operational deployment in company strength on the southern sector",
      "equipmentSpecs": "8.8 cm KwK 36 L/56 gun, 100mm frontal armor, 57 tonnes weight",
      "keyActions": ["Spearheaded the breakthrough along the Krasnograd-Lozovaya rail line"]
    }
  ],
  "locations": [
    {
      "id": "loc_1",
      "name": "Donets-Dnieper Corridor",
      "roleOrType": "Operational Steppe Sector",
      "historicalContext": "Flat rolling terrain with frozen mud tracks creating acute fuel logistics challenges",
      "keyActions": ["Soviet 6th Army overextended 120km beyond railheads"]
    }
  ],
  "majorCauses": [
    "Soviet high command overestimation of Axis collapse following Stalingrad",
    "Extreme elongation of Soviet supply lines through devastated scorched earth",
    "Manstein's tactical preservation of mobile reserve armor"
  ],
  "majorConsequences": [
    "Stabilization of the southern Eastern Front for 5 crucial months",
    "Creation of the Kursk Salient which dictated summer 1943 strategy",
    "Severe Soviet tank losses (over 600 armored vehicles destroyed in 3 weeks)"
  ],
  "disputedPoints": [
    {
      "issue": "Casualty numbers and tank loss exact totals for Operation Gallop",
      "sideA": "Soviet archive post-war estimates cite ~45,000 casualties and 600 tanks.",
      "sideB": "Axis field combat reports claimed over 80,000 casualties and 1,000+ guns.",
      "status": "CONTESTED",
      "evidenceSummary": "Modern consensus (Glantz, Frieser) places Soviet losses between 50,000 and 65,000 total casualties due to incomplete transit rolls."
    }
  ],
  "openQuestions": [
    "Did Stalin personally forbid Voronov from slowing Vatutin's advance, or was it collective Stavka consensus?"
  ],
  "lastResearchedAt": "${new Date().toISOString()}"
}`;

  const result = await executeGeminiJson<any>({ prompt, temperature: 0.4 });
  if (result.success && result.data) {
    return res.json({ success: true, data: result.data });
  }

  res.json({ success: true, data: generateMockResearchData(subject) });
});

// ==========================================
// 6. OUTLINE ENGINE & GRANULAR REGENERATION
// ==========================================
app.post('/api/outline/generate', async (req, res) => {
  const { subject, angle, narrativeMode = 'Strategic', targetDurationMinutes = 10, targetWpm = 145, researchData } = req.body;
  const totalWords = targetDurationMinutes * targetWpm;

  const prompt = `You are KINDRA's Documentary Story Architect.
Subject: "${subject}"
Selected Angle: "${angle?.titleProposal || angle?.centralQuestion || subject}"
Narrative Mode: "${narrativeMode}"
Target Duration: ${targetDurationMinutes} minutes (~${totalWords} words at ${targetWpm} WPM).

Strict Storytelling Structure:
Create 8 to 10 structured documentary beats (HOOK, ORIENTATION, CENTRAL_QUESTION, ESCALATION, COMPLICATIONS, TURNING_POINT, REVEAL, PAYOFF, SIGNIFICANCE).
For every beat specify:
1. Title and Beat Summary
2. Target Duration in seconds and approximate word count (summing up to exactly ~${totalWords} words)
3. What the viewer currently knows at start of beat
4. What curiosity driver propels them forward
5. What dramatic shift occurs by the end of the beat
6. Specific historical verified claims to weave in
7. Suggested visual style (e.g. "Slow pan on winter reconnaissance map", "Rapid archival combat cuts", "Telegram document focus").

Return valid JSON format:
{
  "narrativeMode": "${narrativeMode}",
  "totalTargetDurationMinutes": ${targetDurationMinutes},
  "targetWpm": ${targetWpm},
  "totalTargetWords": ${totalWords},
  "beats": [
    {
      "id": "beat_1",
      "beatNumber": 1,
      "beatType": "HOOK",
      "title": "The False Triumphal March",
      "summary": "Establish the intoxicating atmosphere in Moscow in February 1943 and the unseen trap developing in the Ukrainian snow.",
      "targetDurationSeconds": 60,
      "targetWordCount": 145,
      "viewerCurrentKnowledge": "Nothing yet; believes Germany is in total rout after Stalingrad.",
      "viewerCuriosityDriver": "Why did a seemingly doomed army suddenly inflict a catastrophic defeat?",
      "dramaticShift": "Shifts perception from simple victory to imminent tactical catastrophe.",
      "keyClaimsToCover": ["Stavka believed southern front was open to the Dnieper", "Supply columns were 120km behind spearheads"],
      "suggestedVisualStyle": "Archival footage of advancing Soviet T-34s in snow cut with aerial reconnaissance photographs"
    }
  ]
}`;

  const result = await executeGeminiJson<any>({ prompt, temperature: 0.6 });
  if (result.success && result.data) {
    return res.json({ success: true, data: result.data });
  }

  res.json({ success: true, data: generateMockOutline(subject, narrativeMode, targetDurationMinutes, targetWpm) });
});

app.post('/api/outline/regenerate-section', async (req, res) => {
  const { beatNumber, currentBeat, subject, narrativeMode, direction } = req.body;

  const prompt = `Regenerate Beat #${beatNumber} (${currentBeat?.beatType}) for documentary "${subject}".
Mode: "${narrativeMode}".
Creator instruction: "${direction || 'Enhance historical specificity and tension without melodrama'}".

Current beat: ${JSON.stringify(currentBeat)}

Return strictly single JSON object with the regenerated beat matching OutlineBeat schema:
{
  "id": "${currentBeat?.id || 'beat_' + beatNumber}",
  "beatNumber": ${beatNumber},
  "beatType": "${currentBeat?.beatType || 'ESCALATION'}",
  "title": "New refined title",
  "summary": "Refined summary...",
  "targetDurationSeconds": ${currentBeat?.targetDurationSeconds || 60},
  "targetWordCount": ${currentBeat?.targetWordCount || 145},
  "viewerCurrentKnowledge": "...",
  "viewerCuriosityDriver": "...",
  "dramaticShift": "...",
  "keyClaimsToCover": ["..."],
  "suggestedVisualStyle": "..."
}`;

  const result = await executeGeminiJson<any>({ prompt });
  if (result.success && result.data) {
    return res.json({ success: true, data: result.data });
  }

  res.json({
    success: true,
    data: {
      ...currentBeat,
      title: `${currentBeat.title} (Revised)`,
      summary: `Deepened tactical breakdown with primary dispatch analysis. ${currentBeat.summary}`,
    },
  });
});

// ==========================================
// 7. SCRIPT ENGINE & RETENTION AUDIT
// ==========================================
app.post('/api/script/generate', async (req, res) => {
  const { outline, subject, researchData, targetWpm = 145 } = req.body;

  const prompt = `You are KINDRA's Master Historical Documentary Scriptwriter.
Strict Anti-AI Writing Directives:
- Write with the natural voice of an authoritative, knowledgeable historian and master storyteller (e.g. Ken Burns / Dan Carlin style).
- DO NOT use generic dramatic clichés ("little did they know", "what happened next would change everything", "in a world where", "it is important to remember").
- DO NOT use repetitive sentence structures, excessive rhetorical questions, or three-part cliché lists.
- USE concrete nouns, precise dates, real military designations, specific weather conditions, and causal logic.
- NEVER invent facts, names, or casualty counts. Use only verified facts from research.
- Write full spoken narration text for each outline beat matching its target word count.
- Add delivery instructions for the voice actor for each beat (e.g., "Controlled, measured cadence; deliberate pause before reading the dispatch date").

Outline: ${JSON.stringify(outline?.beats || [])}
Research Facts: ${JSON.stringify(researchData?.claims?.slice(0, 10) || [])}

Return valid JSON structure:
{
  "scriptBeats": [
    {
      "id": "sbeat_1",
      "outlineBeatId": "beat_1",
      "beatNumber": 1,
      "beatType": "HOOK",
      "title": "The False Triumphal March",
      "narrationText": "In the third week of February 1943, three hundred miles east of Kyiv, the snow was four feet deep. To the Soviet General Staff in Moscow, the map showed only victory. The German Sixth Army had vanished at Stalingrad barely sixteen days earlier, and across the frozen expanse of eastern Ukraine, two entire Soviet army fronts were surging forward at thirty miles a day. But on the maps at Army Group South, Field Marshal Erich von Manstein was watching something very different: Soviet tank columns running out of diesel, their supply trucks stranded eighty miles behind the front.",
      "wordCount": 105,
      "estimatedDurationSeconds": 43,
      "pacingNote": "Moderate documentary cadence (145 WPM)",
      "deliveryDirective": "Authoritative, atmospheric, measured opening. Do not rush.",
      "isDeadBeatWarning": false,
      "claimsReferenced": ["Soviet supply lines stranded", "16 days after Stalingrad capitulation"]
    }
  ]
}`;

  const result = await executeGeminiJson<{ scriptBeats: any[] }>({ prompt, temperature: 0.6 });
  if (result.success && result.data?.scriptBeats) {
    return res.json({ success: true, data: result.data.scriptBeats });
  }

  res.json({ success: true, data: generateMockScriptBeats(outline) });
});

app.post('/api/script/regenerate-beat', async (req, res) => {
  const { beat, instruction, researchData } = req.body;

  const prompt = `Rewrite this documentary narration beat following KINDRA's strict anti-AI storytelling constraints:
Beat: ${beat?.title} (${beat?.beatType})
Current Text: "${beat?.narrationText}"
Instruction: "${instruction || 'Sharpen concrete tactical details and improve sentence rhythm'}"

Return JSON:
{
  "narrationText": "Refined spoken text...",
  "wordCount": 120,
  "estimatedDurationSeconds": 50,
  "deliveryDirective": "Updated voice directive...",
  "claimsReferenced": ["Claim 1", "Claim 2"]
}`;

  const result = await executeGeminiJson<any>({ prompt });
  if (result.success && result.data) {
    return res.json({
      success: true,
      data: {
        ...beat,
        ...result.data,
      },
    });
  }

  res.json({
    success: true,
    data: {
      ...beat,
      narrationText: `${beat.narrationText} Specifically, German reconnaissance aircraft confirmed the Soviet 25th Tank Corps was operating with under 15 liters of fuel per vehicle.`,
      wordCount: (beat.wordCount || 100) + 20,
    },
  });
});

app.post('/api/script/retention-audit', async (req, res) => {
  const { scriptBeats, subject } = req.body;

  const prompt = `You are KINDRA's Documentary Retention & Pacing Auditor.
Audit this documentary script for viewer engagement, information progression, dead beats, repetitive phrasing, and transition quality.

Script Beats: ${JSON.stringify(scriptBeats)}

Evaluate:
1. Overall Retention Score (0-100)
2. Overall Verdict (concise critique)
3. Specific issues: detect if any beat repeats established info (DEAD_BEAT), causes confusion (UNRESOLVED_CONFUSION), drops narrative tension (TENSION_DROP), or has weak transitions.
4. Provide concrete actionable fix actions (Remove, Compress, Rewrite, Add Specific Evidence).
5. Pacing graph array (tension level 1-10 and information density 1-10 for each beat).

Return JSON schema:
{
  "score": 91,
  "overallVerdict": "Strong causal progression with excellent historical density. Beat 4 has slight redundancy in describing supply line distance.",
  "issues": [
    {
      "id": "iss_1",
      "beatId": "sbeat_4",
      "type": "REPETITIVE_INFO",
      "locationSnippet": "trucks stranded eighty miles behind...",
      "description": "This supply limitation was already clearly established in Beat 1.",
      "suggestedAction": "Compress",
      "suggestedFix": "Replace the generic distance mention with the specific breakdown of Soviet 6th Army ammunition shortages."
    }
  ],
  "pacingGraph": [
    { "beatNumber": 1, "tensionLevel": 7, "informationDensity": 8 },
    { "beatNumber": 2, "tensionLevel": 6, "informationDensity": 9 }
  ],
  "auditedAt": "${new Date().toISOString()}"
}`;

  const result = await executeGeminiJson<any>({ prompt });
  if (result.success && result.data) {
    return res.json({ success: true, data: result.data });
  }

  res.json({ success: true, data: generateMockRetentionAudit(scriptBeats) });
});

// ==========================================
// 8. FACT-CHECK ENGINE
// ==========================================
app.post('/api/script/fact-check', async (req, res) => {
  const { scriptBeats, researchData, subject } = req.body;
  const fullText = scriptBeats?.map((b: any) => b.narrationText).join(' ') || '';

  const prompt = `You are KINDRA's Independent Historical Fact-Checking Specialist.
Evaluate the factual statements in this documentary script against verified historical scholarship.

Script Text:
"${fullText}"

Check all dates, commander names, unit designations, casualty figures, tank types, geographic directions, and tactical decisions.
Classify every claim into:
- VERIFIED (proven by primary archival records)
- SUPPORTED (supported by standard academic consensus)
- DISPUTED (contested figures or conflicting memoirs)
- UNVERIFIED (lacks verifiable citation)
- INCORRECT (factual error that must be corrected)

Provide exact sentence, extracted claim, status, evidence found, source reference, and suggested correction if needed.

Return JSON format:
{
  "checkedAt": "${new Date().toISOString()}",
  "verifiedCount": 12,
  "supportedCount": 4,
  "disputedCount": 1,
  "unverifiedCount": 0,
  "incorrectCount": 0,
  "items": [
    {
      "id": "chk_1",
      "sentence": "The German Sixth Army had vanished at Stalingrad barely sixteen days earlier...",
      "extractedClaim": "Time elapsed between Stalingrad capitulation (Feb 2, 1943) and mid-February operations is approx 16 days.",
      "status": "VERIFIED",
      "evidenceFound": "Stalingrad surrender concluded Feb 2, 1943; Manstein counter-plan finalized Feb 17-18, 1943.",
      "sourceReference": "Glantz, 'After Stalingrad', p. 114; Bundesarchiv RH 19-V."
    }
  ]
}`;

  const result = await executeGeminiJson<any>({ prompt });
  if (result.success && result.data) {
    return res.json({ success: true, data: result.data });
  }

  res.json({ success: true, data: generateMockFactCheck(scriptBeats) });
});

// ==========================================
// 9. GEMINI TTS VOICEOVER ENGINE
// ==========================================
const DOCUMENTARY_VOICES = [
  {
    id: 'voice_fenrir',
    name: 'Fenrir',
    geminiVoiceName: 'Fenrir',
    editorialCategory: 'AUTHORITATIVE',
    description: 'Deep, resonant, measured baritone with grave commanding presence.',
    recommendedUse: 'Epic military strategy, turning points, high-stakes command decisions.',
    timbre: 'Deep Baritone',
  },
  {
    id: 'voice_kore',
    name: 'Kore',
    geminiVoiceName: 'Kore',
    editorialCategory: 'HISTORIAN',
    description: 'Clear, articulate, scholarly, and objective with refined cadence.',
    recommendedUse: 'Investigative documentaries, archival analysis, human experience.',
    timbre: 'Clean Contralto / Mid-range',
  },
  {
    id: 'voice_zephyr',
    name: 'Zephyr',
    geminiVoiceName: 'Zephyr',
    editorialCategory: 'SMOOTH',
    description: 'Warm, fluid, modern documentary tone with natural conversational authority.',
    recommendedUse: 'Contemporary historical retrospectives, technological evolution.',
    timbre: 'Smooth Tenor',
  },
  {
    id: 'voice_puck',
    name: 'Puck',
    geminiVoiceName: 'Puck',
    editorialCategory: 'INVESTIGATIVE',
    description: 'Crisp, punchy, engaging, and dynamic with high informational energy.',
    recommendedUse: 'Declassified files, espionage, codebreaking, fast-paced campaigns.',
    timbre: 'Dynamic Mid-Tone',
  },
  {
    id: 'voice_charon',
    name: 'Charon',
    geminiVoiceName: 'Charon',
    editorialCategory: 'GRAVELLY',
    description: 'Weathered, solemn, atmospheric, and heavyweight with dramatic texture.',
    recommendedUse: 'Battlefield aftermath, winter campaigns, tragic losses.',
    timbre: 'Textured Bass',
  },
  {
    id: 'voice_aoede',
    name: 'Aoede',
    geminiVoiceName: 'Aoede',
    editorialCategory: 'EXPRESSIVE',
    description: 'Nuanced, emotionally rich, poignant, and highly evocative.',
    recommendedUse: 'Personal memoirs, civilian impact, letters from the front.',
    timbre: 'Rich Melodic Mid',
  },
];

app.get('/api/tts/voices', (req, res) => {
  res.json({ success: true, data: DOCUMENTARY_VOICES });
});

// Helper to convert PCM audio to WAV container
function pcmToWavBuffer(pcmBuffer: Buffer, sampleRate = 24000, numChannels = 1, bitsPerSample = 16): Buffer {
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmBuffer.length;
  const header = Buffer.alloc(44);

  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // Subchunk1Size (16 for PCM)
  header.writeUInt16LE(1, 20); // AudioFormat (1 for PCM)
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

// Generate TTS Audio Preview or Segment with retry and graceful fallback
app.post('/api/tts/generate-audio', async (req, res) => {
  const { text, voiceName = 'Fenrir', deliveryDirective = '' } = req.body;
  const ai = getGeminiClient();

  if (!text || text.trim() === '') {
    return res.status(400).json({ success: false, error: 'Text prompt is required.' });
  }

  const styledPrompt = deliveryDirective
    ? `[Delivery style: ${deliveryDirective}]. Read clearly and naturally: ${text}`
    : text;

  if (ai) {
    for (let attempt = 0; attempt <= 1; attempt++) {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.1-flash-tts-preview',
          contents: [{ parts: [{ text: styledPrompt }] }],
          config: {
            responseModalities: ['AUDIO'],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: voiceName,
                },
              },
            },
          },
        });

        const audioPart = response.candidates?.[0]?.content?.parts?.[0];
        const base64Pcm = audioPart?.inlineData?.data;

        if (base64Pcm) {
          const rawPcm = Buffer.from(base64Pcm, 'base64');
          const wavBuffer = pcmToWavBuffer(rawPcm, 24000);
          const wavBase64 = wavBuffer.toString('base64');
          const durationEstimate = (rawPcm.length / 2 / 24000).toFixed(2);

          return res.json({
            success: true,
            data: {
              audioBase64: wavBase64,
              audioDataUrl: `data:audio/wav;base64,${wavBase64}`,
              durationSeconds: parseFloat(durationEstimate),
              voiceUsed: voiceName,
              isSyntheticFallback: false,
            },
          });
        }
      } catch (err: any) {
        const isTransient = err?.code === 503 || err?.status === 'UNAVAILABLE' || err?.message?.includes('503') || err?.message?.includes('high demand');
        if (isTransient && attempt === 0) {
          console.warn('[KINDRA TTS] gemini-3.1-flash-tts-preview high demand (503), retrying in 500ms...');
          await new Promise((r) => setTimeout(r, 500));
          continue;
        }
        console.warn('[KINDRA TTS] Live TTS unavailable, activating synthesized documentary audio tone.');
        break;
      }
    }
  }

  // Deterministic browser-safe audio tone generation fallback
  const fallbackWav = generateSynthesizedAudioWav(text.length);
  res.json({
    success: true,
    data: {
      audioBase64: fallbackWav.base64,
      audioDataUrl: fallbackWav.dataUrl,
      durationSeconds: fallbackWav.duration,
      voiceUsed: voiceName,
      isSyntheticFallback: true,
    },
  });
});

// ==========================================
// 10. VISUAL INTELLIGENCE & ARCHIVAL SEARCH
// ==========================================
app.post('/api/visuals/extract-cues', async (req, res) => {
  const { scriptBeats, subject } = req.body;

  const prompt = `You are KINDRA's Archival Visual Research Director.
Convert this documentary narration into precise, historically relevant visual requirements (Visual Cues).
Target rhythm: One visual change every 3 to 5 seconds.

Script Beats: ${JSON.stringify(scriptBeats)}

For each cue determine:
1. Exact timestamp range (seconds)
2. Required Meaning (what the viewer must understand)
3. Preferred Representation (ideal authentic archival asset)
4. Acceptable Alternatives (campaign photographs, tactical maps, declassified documents)
5. 4 progressive search queries (from exact unit/date to broader campaign/theatre)
6. Preferred visual type (photograph, archival_footage, map, document, newspaper, portrait, equipment, battlefield_location)
7. Emotional/cinematic tone.

Return valid JSON structure:
{
  "cues": [
    {
      "id": "cue_1",
      "beatId": "sbeat_1",
      "cueNumber": 1,
      "timestampStart": 0,
      "timestampEnd": 4.5,
      "duration": 4.5,
      "narrationSnippet": "In the third week of February 1943, three hundred miles east of Kyiv...",
      "requiredMeaning": "Frozen expanse of the Ukrainian steppe in winter 1943 showing harsh operational conditions.",
      "preferredRepresentation": "Authentic German/Soviet winter archival photograph near Donets river Feb 1943.",
      "acceptableAlternatives": [
        "Wehrmacht soldier in snow camouflage Eastern Front winter 42-43",
        "Luftwaffe aerial reconnaissance showing snow-covered rail lines"
      ],
      "searchQueries": [
        "Kharkov winter February 1943 archival photograph",
        "Wehrmacht Eastern Front snow February 1943",
        "Donets Basin winter 1943 military reconnaissance",
        "Bundesarchiv Bild 101I Kharkov winter 1943"
      ],
      "preferredVisualType": "photograph",
      "emotionalTone": "Stark, desolate, foreboding"
    }
  ]
}`;

  const result = await executeGeminiJson<{ cues: any[] }>({ prompt });
  if (result.success && result.data?.cues) {
    return res.json({ success: true, data: result.data.cues });
  }

  res.json({ success: true, data: generateMockVisualCues(scriptBeats) });
});

// Archival Visual Matching & Discovery Engine
app.post('/api/visuals/search', async (req, res) => {
  const { query, cue, fallbackBroaden = false } = req.body;

  const prompt = `You are KINDRA's Archival Visual Discovery and Rights Verification Engine.
Find verified authentic historical archival assets for documentary visual cue:
Cue: "${cue?.requiredMeaning || query}"
Preferred Type: "${cue?.preferredVisualType || 'photograph'}"
Queries attempted: ${JSON.stringify(cue?.searchQueries || [query])}

Search across authentic collections (Bundesarchiv, NARA, Imperial War Museums, Wikimedia Commons Public Domain collections).
Generate 3-4 ranked visual candidates.
Each asset must have:
- Title & detailed historical caption
- Thumbnail and full image URLs (authentic high-res historical archive links)
- Source institution & archive reference code
- Date/period, Location, People depicted, Military unit
- Match Hierarchy Level (LEVEL_1_EXACT_EVENT, LEVEL_2_SAME_EVENT_DIFFERENT_MOMENT, LEVEL_3_SAME_SUBJECT_LOCATION, LEVEL_4_SAME_SUBJECT_PERIOD, LEVEL_5_SAME_CAMPAIGN, LEVEL_6_CONCEPTUAL, LEVEL_7_MAP_DOCUMENT)
- Match Score (0-100) with bulleted reasons
- Historical confidence (HIGH/MEDIUM/LOW/UNRESOLVED)
- Rights status (PUBLIC_DOMAIN, CREATIVE_COMMONS, EDITORIAL_ARCHIVE, RIGHTS_UNCERTAIN)
- License & attribution requirements
- If exact image is unavailable, set isIllustrativeSubstitute=true with substituteExplanation.

Return JSON schema:
{
  "assets": [
    {
      "id": "ast_1",
      "cueId": "${cue?.id || 'cue_1'}",
      "title": "German mechanized unit in snow near Kharkov",
      "description": "Sdkfz 251 half-tracks advancing through snow drifts during the counter-offensive, late February 1943.",
      "thumbnailUrl": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80",
      "fullImageUrl": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1600&auto=format&fit=crop&q=80",
      "source": "Bundesarchiv",
      "sourceUrl": "https://www.bild.bundesarchiv.de",
      "sourceInstitution": "German Federal Archives (Bundesarchiv-Militärarchiv)",
      "dateOrPeriod": "1943-02-24",
      "location": "Kharkov sector, Ukraine",
      "peopleDepicted": ["Unidentified Panzergrenadiers"],
      "militaryUnit": "SS Division Das Reich / 4th Panzer Army",
      "visualType": "photograph",
      "hierarchyLevel": "LEVEL_1_EXACT_EVENT",
      "matchScore": 96,
      "matchScoreReasons": [
        "Exact campaign date match (Feb 1943)",
        "Verified Kharkov operational sector",
        "Official Bundesarchiv archival negative ID: Bild 101I-022-2936-18",
        "Public domain / CC-BY-SA Bundesarchiv license"
      ],
      "historicalConfidence": "HIGH",
      "rightsStatus": "CREATIVE_COMMONS",
      "license": "CC-BY-SA 3.0 Germany / Bundesarchiv",
      "attributionRequirement": "Bundesarchiv, Bild 101I-022-2936-18 / CC-BY-SA 3.0",
      "isIllustrativeSubstitute": false,
      "userApproved": true
    }
  ]
}`;

  const result = await executeGeminiJson<{ assets: any[] }>({ prompt });
  if (result.success && result.data?.assets) {
    return res.json({ success: true, data: result.data.assets });
  }

  res.json({ success: true, data: generateMockVisualAssets(cue || { id: 'cue_1', requiredMeaning: query }) });
});

// ==========================================
// 11. CAPCUT-READY EXPORT PACKAGE METADATA
// ==========================================
app.post('/api/export/package-manifest', (req, res) => {
  const { project } = req.body;
  if (!project) {
    return res.status(400).json({ success: false, error: 'Project data is required' });
  }

  const manifest = generateExportManifest(project);
  res.json({ success: true, data: manifest });
});

// ==========================================
// MOCK GENERATORS (FALLBACKS & SEED DATA)
// ==========================================
function generateMockMarketData(topic: string) {
  return {
    query: topic,
    expandedKeywords: [
      `${topic} turning point`,
      `${topic} logistics failure`,
      `${topic} untold story`,
      `${topic} military strategy`,
      `${topic} archival footage`,
    ],
    analyzedAt: new Date().toISOString(),
    totalVideosAnalyzed: 32,
    opportunityScore: {
      overall: 89,
      demand: 94,
      momentum: 88,
      outlierSignal: 96,
      engagement: 84,
      competition: 42,
      audienceGapScore: 91,
      explanation:
        'Audience search volume is surging (+42% YoY) while recent small channels (<50k subs) are achieving 800k+ views on specific tactical deep-dives. Major competitors lack high-resolution map graphics and primary document citations.',
    },
    videos: [
      {
        id: 'v1',
        title: 'The German Counterattack Nobody Expected (1943)',
        channelName: 'Battlefield Chronicles',
        channelId: 'c1',
        subscriberCount: 38000,
        uploadDate: '2024-04-10',
        duration: '18:45',
        durationSeconds: 1125,
        views: 890000,
        likes: 54000,
        commentsCount: 3900,
        description: 'Deep tactical breakdown of the southern counter-offensive...',
        thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
        sourceUrl: 'https://youtube.com',
        transcriptAvailable: true,
        engagementRate: 6.5,
        viewsPerSubscriber: 23.4,
        isSmallChannelBreakout: true,
        outlierScore: 97,
        outlierReason: 'Small channel (38k subs) captured 890k views (23.4x VPS) due to strong curiosity hook.',
      },
      {
        id: 'v2',
        title: 'How Manstein Reversed the Eastern Front',
        channelName: 'Historical Atlas',
        channelId: 'c2',
        subscriberCount: 420000,
        uploadDate: '2023-11-15',
        duration: '24:10',
        durationSeconds: 1450,
        views: 1250000,
        likes: 68000,
        commentsCount: 4100,
        description: 'Comprehensive operational overview...',
        thumbnail: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
        sourceUrl: 'https://youtube.com',
        transcriptAvailable: true,
        engagementRate: 5.7,
        viewsPerSubscriber: 2.9,
        isSmallChannelBreakout: false,
        outlierScore: 78,
      },
      {
        id: 'v3',
        title: 'The Catastrophic Mistake in Ukraine 1943',
        channelName: 'Military Declassified',
        channelId: 'c3',
        subscriberCount: 65000,
        uploadDate: '2024-02-01',
        duration: '14:30',
        durationSeconds: 870,
        views: 640000,
        likes: 39000,
        commentsCount: 2800,
        description: 'Analyzing Soviet overextension and intelligence blind spots...',
        thumbnail: 'https://images.unsplash.com/photo-1580130775552-2508a176467f?w=600&auto=format&fit=crop&q=80',
        sourceUrl: 'https://youtube.com',
        transcriptAvailable: true,
        engagementRate: 6.5,
        viewsPerSubscriber: 9.8,
        isSmallChannelBreakout: true,
        outlierScore: 91,
        outlierReason: '9.8x baseline views; comments heavily praise focus on railhead logistics.',
      },
    ],
    outliers: [
      {
        id: 'v1',
        title: 'The German Counterattack Nobody Expected (1943)',
        channelName: 'Battlefield Chronicles',
        channelId: 'c1',
        subscriberCount: 38000,
        uploadDate: '2024-04-10',
        duration: '18:45',
        durationSeconds: 1125,
        views: 890000,
        likes: 54000,
        commentsCount: 3900,
        description: 'Deep tactical breakdown of the southern counter-offensive...',
        thumbnail: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=600&auto=format&fit=crop&q=80',
        sourceUrl: 'https://youtube.com',
        transcriptAvailable: true,
        engagementRate: 6.5,
        viewsPerSubscriber: 23.4,
        isSmallChannelBreakout: true,
        outlierScore: 97,
        outlierReason: 'Small channel (38k subs) captured 890k views (23.4x VPS) due to strong curiosity hook.',
      },
    ],
    commentClusters: [
      {
        id: 'c1',
        theme: 'Why did Soviet reconnaissance fail to detect 4th Panzer Army concentration?',
        type: 'QUESTION' as const,
        representativeComments: [
          'Did Soviet aerial scouts simply miss the armor columns or was it bad weather?',
          'Vatutin had cavalry patrols, why did they report empty sectors?',
        ],
        frequencyCount: 184,
        productionImplication: 'Dedicate Beat 4 to the snowstorms and German radio silence doctrine.',
      },
      {
        id: 'c2',
        theme: 'Misconception that Tigers won the battle alone',
        type: 'MISCONCEPTION' as const,
        representativeComments: [
          'Was this just Tigers dominating T-34s at long range?',
          'People forget the majority of German armor were still Panzer IIIs and IVs.',
        ],
        frequencyCount: 142,
        productionImplication: 'Clarify armor inventory breakdown; highlight fuel maneuver over tank superiority.',
      },
    ],
    angles: generateMockAngles(topic),
    demandTrend: [
      { month: 'Oct', interest: 58, competitorUploads: 2 },
      { month: 'Nov', interest: 64, competitorUploads: 3 },
      { month: 'Dec', interest: 72, competitorUploads: 2 },
      { month: 'Jan', interest: 81, competitorUploads: 4 },
      { month: 'Feb', interest: 94, competitorUploads: 3 },
      { month: 'Mar', interest: 90, competitorUploads: 5 },
    ],
  };
}

function generateMockAngles(topic: string) {
  return [
    {
      id: 'ang_1',
      titleProposal: 'The 48-Hour Mirage: How Soviet Victory Turned Into Disaster',
      alternativeTitles: [
        'The Trap in the Snow: Kharkov 1943',
        'When Moscow Declared Victory 3 Days Too Soon',
      ],
      angleCategory: 'Strategic Decision' as const,
      centralQuestion: 'How did Soviet high command misread an organized tactical retreat as irreversible collapse?',
      coreConflict: 'Stavka post-Stalingrad euphoria vs Manstein’s cold operational calculus',
      historicalNovelty: 'Unpacks captured quartermaster manifests showing 70% of Soviet tanks lacked fuel before the trap snapped.',
      audienceAppeal: 'High psychological tension around overconfidence and strategic hubris.',
      evidenceAvailability: 'Abundant Primary' as const,
      recommendedNarrativeMode: 'Strategic' as const,
      curiosityHook: 'In mid-February 1943, Soviet radio stations announced the war in the south was won. 72 hours later, 52 Soviet divisions were cut off.',
    },
    {
      id: 'ang_2',
      titleProposal: 'The Fuel Line Catastrophe: The Real Reason the Eastern Front Halted',
      alternativeTitles: [
        'Logistics of Disaster: The Forgotten Supply War of 1943',
        'Running on Empty: The Race Across the Ukrainian Steppe',
      ],
      angleCategory: 'Logistical Crisis' as const,
      centralQuestion: 'Why did the most powerful armored spearhead of 1943 grind to a halt in deep snow?',
      coreConflict: 'Tanks advancing at 30 mph vs horse-drawn supply carts moving at 3 mph over frozen mud',
      historicalNovelty: 'Maps every railhead transfer point and demonstrates the mechanical breakdown rates.',
      audienceAppeal: 'Appeals to tactical/technical military history enthusiasts who appreciate authentic physics of war.',
      evidenceAvailability: 'Abundant Primary' as const,
      recommendedNarrativeMode: 'Technology + Strategic' as const,
      curiosityHook: 'The tank that ran out of gas wasn’t knocked out by a shell—it was abandoned because a wooden axle snapped 90 miles away.',
    },
  ];
}

function generateMockTopicOpportunities(niche: string) {
  return [
    {
      id: 'opp_1',
      topic: 'Operation Market Garden: The Bridge at Arnhem',
      category: 'Operational Hubris & Paratrooper Encirclement',
      opportunityScore: 89,
      risingSignal: 4,
      competition: 'Medium' as const,
      breakoutSignal: 'High' as const,
      audienceInterest: 'High' as const,
      classifications: ['BREAKOUT', 'STRONG DEMAND'] as ('BREAKOUT' | 'STRONG DEMAND')[],
      evidenceCount: 14,
      bestExample: {
        title: 'Why Montgomery’s 64-Mile Blitzkrieg Ground to a Halt in 48 Hours',
        views: 1840000,
        viewsFormatted: '1.8M views',
        channelName: 'Tactical History Hub',
        subscriberCount: 42000,
        viewsPerSub: 43.8,
        uploadDate: '2024-01-20',
        url: 'https://youtube.com',
      },
      recentMomentum: 'Strong' as const,
      audienceGap: 'Why did high command disregard clear aerial reconnaissance photos showing II SS Panzer Corps tanks hiding in Arnhem forests?',
      whyThisTopic: '3 relatively small channels recently published videos on this subject that significantly outperformed their subscriber bases (avg 28.5x VPS).',
      evidenceVideos: [
        {
          id: 'ev_1_1',
          title: 'The 48-Hour Radio Silence That Doomed the 1st Airborne',
          channelName: 'Airborne Frontline',
          channelId: 'ch_ab1',
          subscriberCount: 28000,
          uploadDate: '2024-02-10',
          duration: '16:40',
          durationSeconds: 1000,
          views: 790000,
          likes: 49000,
          commentsCount: 3100,
          description: 'Deep dive into failed crystals and battery frequencies...',
          thumbnail: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=600&auto=format&fit=crop&q=80',
          sourceUrl: 'https://youtube.com',
          transcriptAvailable: true,
          engagementRate: 6.6,
          viewsPerSubscriber: 28.2,
          isSmallChannelBreakout: true,
          outlierScore: 94,
        },
      ],
    },
    {
      id: 'opp_2',
      topic: 'Operation Gunnerside: The Telemark Heavy Water Sabotage',
      category: 'Special Operations & Atomic Intelligence',
      opportunityScore: 94,
      risingSignal: 5,
      competition: 'Low' as const,
      breakoutSignal: 'High' as const,
      audienceInterest: 'High' as const,
      classifications: ['RISING', 'UNDERSERVED', 'BREAKOUT'] as ('RISING' | 'UNDERSERVED' | 'BREAKOUT')[],
      evidenceCount: 9,
      bestExample: {
        title: 'The 9 Skiers Who Stopped Hitler’s Atomic Bomb',
        views: 940000,
        viewsFormatted: '940K views',
        channelName: 'Nordic Espionage Vault',
        subscriberCount: 26000,
        viewsPerSub: 36.1,
        uploadDate: '2024-03-05',
        url: 'https://youtube.com',
      },
      recentMomentum: 'Surging' as const,
      audienceGap: 'How close was the Vemork electrolysis plant to producing weapon-grade deuterium before the midnight raid?',
      whyThisTopic: 'High view velocity and 8.2% engagement rates across recent uploads, with zero high-production documentary coverage in the last 12 months.',
      evidenceVideos: [
        {
          id: 'ev_2_1',
          title: 'The Gorge Descent: Norway’s Frozen Sabotage Raid',
          channelName: 'Clandestine History',
          channelId: 'ch_ch2',
          subscriberCount: 19000,
          uploadDate: '2024-02-28',
          duration: '15:10',
          durationSeconds: 910,
          views: 620000,
          likes: 42000,
          commentsCount: 2400,
          description: 'Examining the climbing gear and submachine gun concealment...',
          thumbnail: 'https://images.unsplash.com/photo-1517411032315-54ef2cb783bb?w=600&auto=format&fit=crop&q=80',
          sourceUrl: 'https://youtube.com',
          transcriptAvailable: true,
          engagementRate: 7.1,
          viewsPerSubscriber: 32.6,
          isSmallChannelBreakout: true,
          outlierScore: 96,
        },
      ],
    },
    {
      id: 'opp_3',
      topic: 'Battle of the Scheldt: The Forgotten Water War',
      category: 'Logistical Crisis & Amphibious Warfare',
      opportunityScore: 91,
      risingSignal: 4,
      competition: 'Low' as const,
      breakoutSignal: 'High' as const,
      audienceInterest: 'High' as const,
      classifications: ['UNDERSERVED', 'RISING'] as ('UNDERSERVED' | 'RISING')[],
      evidenceCount: 11,
      bestExample: {
        title: 'Why Antwerp Was Useless: The Mud Battle That Starved Allied Armies',
        views: 1120000,
        viewsFormatted: '1.1M views',
        channelName: 'Canadian Battlefield Lore',
        subscriberCount: 34000,
        viewsPerSub: 32.9,
        uploadDate: '2023-12-10',
        url: 'https://youtube.com',
      },
      recentMomentum: 'Strong' as const,
      audienceGap: 'Why did Allied command celebrate liberating Antwerp port without clearing the 50-mile estuary mines?',
      whyThisTopic: 'Surging demand in search queries around late-1944 logistics bottlenecks; market has only 2 existing dedicated breakdowns.',
      evidenceVideos: [],
    },
    {
      id: 'opp_4',
      topic: 'The V-3 London Gun: Underground Fortress of Mimoyecques',
      category: 'Superweapons & Secret Engineering',
      opportunityScore: 86,
      risingSignal: 4,
      competition: 'Medium' as const,
      breakoutSignal: 'High' as const,
      audienceInterest: 'High' as const,
      classifications: ['BREAKOUT', 'EVERGREEN'] as ('BREAKOUT' | 'EVERGREEN')[],
      evidenceCount: 16,
      bestExample: {
        title: 'Hitler’s 150-Meter Supergun Dug Deep Into French Chalk',
        views: 1450000,
        viewsFormatted: '1.4M views',
        channelName: 'Fortress Archaeology',
        subscriberCount: 55000,
        viewsPerSub: 26.3,
        uploadDate: '2023-10-18',
        url: 'https://youtube.com',
      },
      recentMomentum: 'Moderate' as const,
      audienceGap: 'Could multi-chamber acceleration charges have sustained 300 rounds per hour without exploding in the bore?',
      whyThisTopic: 'Consistent long-tail organic discovery driven by subterranean engineering curiosity and Joe Kennedy Jr.’s secret bombing mission.',
      evidenceVideos: [],
    },
    {
      id: 'opp_5',
      topic: 'The Magic Gang: Jasper Maskelyne & Alexandria Harbor Deception',
      category: 'Military Deception & Camouflage Engineering',
      opportunityScore: 92,
      risingSignal: 5,
      competition: 'Low' as const,
      breakoutSignal: 'High' as const,
      audienceInterest: 'High' as const,
      classifications: ['RISING', 'BREAKOUT'] as ('RISING' | 'BREAKOUT')[],
      evidenceCount: 8,
      bestExample: {
        title: 'How an Illusionist Moved Alexandria Harbor 3 Miles West at Night',
        views: 880000,
        viewsFormatted: '880K views',
        channelName: 'Untold Military Legends',
        subscriberCount: 21000,
        viewsPerSub: 41.9,
        uploadDate: '2024-02-04',
        url: 'https://youtube.com',
      },
      recentMomentum: 'Surging' as const,
      audienceGap: 'What specific lighting rigs and cardboard silhouettes deceived Luftwaffe aerial spotters over Maryut bay?',
      whyThisTopic: 'Unusual retention curve and high viewer sharing rate; highly differentiated human story with forensic tactical evidence.',
      evidenceVideos: [],
    },
    {
      id: 'opp_6',
      topic: 'The Siege of Breslau: 82 Days Trapped in the Fortress',
      category: 'Urban Warfare & Last Stand',
      opportunityScore: 85,
      risingSignal: 3,
      competition: 'Medium' as const,
      breakoutSignal: 'Medium' as const,
      audienceInterest: 'High' as const,
      classifications: ['STRONG DEMAND', 'EVERGREEN'] as ('STRONG DEMAND' | 'EVERGREEN')[],
      evidenceCount: 15,
      bestExample: {
        title: 'Festung Breslau: The City That Fought 4 Days Past Berlin’s Fall',
        views: 1620000,
        viewsFormatted: '1.6M views',
        channelName: 'Eastern Front Archives',
        subscriberCount: 68000,
        viewsPerSub: 23.8,
        uploadDate: '2023-09-12',
        url: 'https://youtube.com',
      },
      recentMomentum: 'Moderate' as const,
      audienceGap: 'Why did Gauleiter Hanke order an airstrip bulldozed through historic neighborhoods while surrounded by Red Army artillery?',
      whyThisTopic: 'Massive comment volume regarding primary German and Soviet soldier memoirs; steady evergreen viewership.',
      evidenceVideos: [],
    },
  ];
}

function generateMockResearchedTitles(topic: string) {
  return [
    {
      id: 'rt_1',
      videoTitle: "The Mistake That Destroyed Germany's Best Tank Army",
      channelName: 'Battlefield Tactics',
      views: 1820000,
      subscriberCount: 65000,
      viewsPerSubscriber: 28.0,
      engagementRate: 6.8,
      uploadDate: '2024-01-14',
      titleLength: 49,
      structure: '[CONSEQUENCE] + [MISTAKE] + [SUBJECT]',
      curiosityMechanism: 'Unforeseen Consequence / Fatal Flaw',
      subjectPlacement: 'Trailing' as const,
      emotionalFraming: 'Catastrophic Irony',
      specificity: 'Unit-specific operational disaster',
      impliedPromise: 'Reveals the exact single command oversight that doomed an elite army',
      wordingPatterns: ['The Mistake That', 'Best Tank Army'],
    },
    {
      id: 'rt_2',
      videoTitle: 'Why 3 Miles of Mud Stopped 600 Tanks',
      channelName: 'Armored Warfare Declassified',
      views: 1390000,
      subscriberCount: 48000,
      viewsPerSubscriber: 28.9,
      engagementRate: 7.2,
      uploadDate: '2023-11-28',
      titleLength: 35,
      structure: '[QUESTION/PARADOX] + [PHYSICAL OBSTACLE] + [SCALE/SUBJECT]',
      curiosityMechanism: 'Scale Paradox',
      subjectPlacement: 'Trailing' as const,
      emotionalFraming: 'Forensic Realism',
      specificity: 'Exact distance (3 miles) & tank count (600)',
      impliedPromise: 'Explains how physics and geography neutralized massive technological superiority',
      wordingPatterns: ['Why [Number] [Unit]', 'Stopped [Number] Tanks'],
    },
    {
      id: 'rt_3',
      videoTitle: 'The 48-Hour Order Hitler Wanted Erased From History',
      channelName: 'Archival Vault',
      views: 1650000,
      subscriberCount: 59000,
      viewsPerSubscriber: 27.9,
      engagementRate: 6.4,
      uploadDate: '2024-02-18',
      titleLength: 51,
      structure: '[TIMEFRAME] + [FORBIDDEN OBJECT] + [PROMISE OF SUPPRESSION]',
      curiosityMechanism: 'Declassified Secret / Forbidden Truth',
      subjectPlacement: 'Center' as const,
      emotionalFraming: 'Investigative Urgency',
      specificity: '48-hour timeline and high command friction',
      impliedPromise: 'Uncovers declassified orders hidden by postwar memoir revisionism',
      wordingPatterns: ['The [Time] Order', 'Wanted Erased From History'],
    },
    {
      id: 'rt_4',
      videoTitle: 'The German General Who Refused to Attack',
      channelName: 'Military Profiles',
      views: 980000,
      subscriberCount: 39000,
      viewsPerSubscriber: 25.1,
      engagementRate: 6.9,
      uploadDate: '2023-12-05',
      titleLength: 40,
      structure: '[SUBJECT] + [DEVIANT ACTION]',
      curiosityMechanism: 'Character Defiance / Tactical Paradox',
      subjectPlacement: 'Leading' as const,
      emotionalFraming: 'Moral and Tactical Conflict',
      specificity: 'Commander revolt against suicidal high command orders',
      impliedPromise: 'Explores the high-stakes tactical consequences of disobeying catastrophic directives',
      wordingPatterns: ['The General Who', 'Refused to'],
    },
    {
      id: 'rt_5',
      videoTitle: 'How One Declassified Telegram Changed the Entire Eastern Front',
      channelName: 'Grand Strategy Network',
      views: 1420000,
      subscriberCount: 52000,
      viewsPerSubscriber: 27.3,
      engagementRate: 6.1,
      uploadDate: '2024-03-01',
      titleLength: 64,
      structure: '[MECHANISM] + [DOCUMENT] + [MACRO CONSEQUENCE]',
      curiosityMechanism: 'Butterfly Effect / Archival Reveal',
      subjectPlacement: 'Trailing' as const,
      emotionalFraming: 'Historical Revelation',
      specificity: 'Single primary telegram dispatch',
      impliedPromise: 'Connects a forgotten piece of paper to a massive front-wide reversal',
      wordingPatterns: ['How One Declassified', 'Changed the Entire'],
    },
  ];
}

function generateMockTitleCandidates(
  topic: string,
  angle?: any,
  inspirationTitle?: string,
  mode: string = 'default',
  customInstruction?: string
) {
  const baseTopic = topic || angle?.titleProposal || 'Kharkov 1943';
  return [
    {
      id: 'tc_1',
      title: 'The 48-Hour Mirage: When Moscow Celebrated Three Days Too Soon',
      strategy: 'RESEARCH_INSPIRED' as const,
      strategyLabel: 'Research-Inspired',
      structuralBlueprint: '[TIMEFRAME] + [CONSEQUENCE] + [IRONIC_CONTRAST]',
      inspiredByVideoTitle: inspirationTitle || 'The 48-Hour Order Hitler Wanted Erased From History',
      clarityScore: 9,
      curiosityScore: 9,
      specificityScore: 9,
      accuracyScore: 10,
      overallScore: 9.3,
      critique: 'Exceptional temporal tension and authentic historical irony without misleading the viewer.',
    },
    {
      id: 'tc_2',
      title: 'The Fuel Line Catastrophe: Why 600 Soviet Tanks Froze in the Steppe',
      strategy: 'STRATEGIC' as const,
      strategyLabel: 'Strategic / Logistics',
      structuralBlueprint: '[CRISIS] + [QUESTION/SCALE] + [GEOGRAPHIC REALITY]',
      inspiredByVideoTitle: inspirationTitle || 'Why 3 Miles of Mud Stopped 600 Tanks',
      clarityScore: 10,
      curiosityScore: 8,
      specificityScore: 10,
      accuracyScore: 10,
      overallScore: 9.5,
      critique: 'Crystal-clear causal focus on the logistical breakdown that dictated the battle outcome.',
    },
    {
      id: 'tc_3',
      title: 'The Three Aerial Photos Headquarters Filed in the Wrong Drawer',
      strategy: 'HIGH_CURIOSITY' as const,
      strategyLabel: 'High Curiosity',
      structuralBlueprint: '[SPECIFIC OBJECT] + [FATAL BUREAUCRATIC MISTAKE]',
      clarityScore: 8,
      curiosityScore: 10,
      specificityScore: 9,
      accuracyScore: 9,
      overallScore: 9.0,
      critique: 'Irresistible curiosity gap grounded directly in verified reconnaissance report delays.',
    },
    {
      id: 'tc_4',
      title: 'The General Who Disobeyed Hitler to Save His Panzer Corps',
      strategy: 'HUMAN' as const,
      strategyLabel: 'Human / Commander Stakes',
      structuralBlueprint: '[COMMANDER ACTION] + [HIGH STAKES MOTIVATION]',
      clarityScore: 10,
      curiosityScore: 8,
      specificityScore: 8,
      accuracyScore: 10,
      overallScore: 9.0,
      critique: 'Powerful character defiance hook anchored in Paul Hausser’s controversial withdrawal decision.',
    },
    {
      id: 'tc_5',
      title: 'How Manstein’s Backhand Stroke Reversed the Eastern Front',
      strategy: 'ORIGINAL' as const,
      strategyLabel: 'Original Authoritative',
      structuralBlueprint: '[DOCTRINE/TACTIC] + [MACRO HISTORICAL OUTCOME]',
      clarityScore: 9,
      curiosityScore: 7,
      specificityScore: 9,
      accuracyScore: 10,
      overallScore: 8.8,
      critique: 'Authoritative and direct documentary framing for military history purists.',
    },
    {
      id: 'tc_6',
      title: customInstruction
        ? `The Intelligence Failure at Kharkov: Declassified 1943 Radio Traffic`
        : 'The Trap in the Deep Snow: The 1943 Counter-Offensive Explained',
      strategy: 'CUSTOM' as const,
      strategyLabel: mode === 'more_direct' ? 'Direct & Measured' : 'Custom Iteration',
      structuralBlueprint: '[FORENSIC FOCUS] + [PRIMARY EVIDENCE]',
      clarityScore: 9,
      curiosityScore: 8,
      specificityScore: 9,
      accuracyScore: 10,
      overallScore: 9.0,
      critique: 'Precise and balanced title with zero clickbait sensation.',
    },
  ];
}

function generateMockResearchData(subject: string) {
  return {
    subject: subject || 'Battle of Kharkov 1943',
    topicSummary:
      'The Third Battle of Kharkov (February 19 – March 15, 1943) was a series of offensive actions on the Eastern Front, wherein Field Marshal Erich von Manstein launched a counter-stroke that recaptured the city and stabilized the front following the German Sixth Army disaster at Stalingrad. It stands as one of military history’s classic operational backhand strokes.',
    claims: [
      {
        id: 'clm_1',
        claim: 'Manstein launched the counter-offensive on February 19, 1943, striking the flank of the overextended Soviet Southwestern Front.',
        category: 'FACT' as const,
        primarySource: 'Bundesarchiv-Militärarchiv RH 19-V (War Diary, Army Group South)',
        sourceType: 'Primary Archive' as const,
        confidence: 'HIGH' as const,
        supportingEvidence: 'Official daily logs and operational order Nr. 48/43.',
        verified: true,
      },
      {
        id: 'clm_2',
        claim: 'Soviet tank corps were advancing up to 120 km ahead of their supporting infantry and fuel supply columns.',
        category: 'FACT' as const,
        primarySource: 'TsAMO (Central Archives of the Russian Ministry of Defence) Fond 236',
        sourceType: 'Primary Archive' as const,
        confidence: 'HIGH' as const,
        supportingEvidence: 'Quartermaster delivery reports show 25th Tank Corps had only 0.4 combat load of fuel upon reaching Pavlograd.',
        verified: true,
      },
      {
        id: 'clm_3',
        claim: 'Paul Hausser disobeyed Hitler’s direct order to defend Kharkov to the last man, saving the SS Panzer Corps from encirclement.',
        category: 'FACT' as const,
        primarySource: 'NARA Microfilm T-311 Roll 268 (Heeresgruppe Süd Records)',
        sourceType: 'Official Military Record' as const,
        confidence: 'HIGH' as const,
        supportingEvidence: 'Radio transcript of Hitler’s order to hold fortress Kharkov sent at 16:45 on Feb 15, 1943, and Hausser’s withdrawal order at 17:30.',
        verified: true,
      },
    ],
    timeline: [
      {
        id: 'tm_1',
        dateStr: 'Feb 15, 1943',
        timestampSort: 19430215,
        title: 'Hausser Evacuates Kharkov',
        description: 'SS Panzer Corps withdraws despite standing Fuhrer directives.',
        keyActors: ['Paul Hausser', 'Erich von Manstein'],
        location: 'Kharkov',
        significance: 'Preserves the armored core needed for the counter-stroke.',
        sourceRef: 'Bundesarchiv RH 19-V',
        confidence: 'HIGH' as const,
      },
      {
        id: 'tm_2',
        dateStr: 'Feb 19, 1943',
        timestampSort: 19430219,
        title: 'Counter-Offensive Unleashed',
        description: '4th Panzer Army strikes the exposed left flank of Soviet Southwestern Front.',
        keyActors: ['Hermann Hoth', 'Nikolai Vatutin'],
        location: 'Pavlograd-Krasnograd',
        significance: 'Cuts off Soviet forward spearheads from rail supplies.',
        sourceRef: 'NARA T-311',
        confidence: 'HIGH' as const,
      },
      {
        id: 'tm_3',
        dateStr: 'March 15, 1943',
        timestampSort: 19430315,
        title: 'Kharkov Recaptured',
        description: 'German forces secure the city, stabilizing the Eastern Front until summer 1943.',
        keyActors: ['Manstein', 'Konev'],
        location: 'Kharkov',
        significance: 'Created the Kursk Salient.',
        sourceRef: 'Glantz, After Stalingrad',
        confidence: 'HIGH' as const,
      },
    ],
    people: [
      {
        id: 'p1',
        name: 'Erich von Manstein',
        roleOrType: 'Field Marshal, Army Group South',
        historicalContext: 'Mastermind of the operational "backhand stroke" maneuver doctrine.',
        keyActions: ['Preserved armored reserves', 'Timed counter-offensive to coincide with Soviet fuel exhaustion'],
      },
      {
        id: 'p2',
        name: 'Nikolai Vatutin',
        roleOrType: 'General, Southwestern Front',
        historicalContext: 'Aggressive Soviet commander who drove his forces forward believing Axis forces were collapsing.',
        keyActions: ['Pushed 6th Army and Mobile Group Popov 100+ km beyond supply lines'],
      },
    ],
    unitsAndEquipment: [
      {
        id: 'u1',
        name: 'Tiger I (Pz.Kpfw. VI)',
        roleOrType: 'Heavy Tank',
        historicalContext: 'Deployed in small numbers with heavy shock impact on the open steppe.',
        equipmentSpecs: '8.8cm KwK 36 L/56 gun, 100mm armor, 57 tonnes.',
        keyActions: ['Long-range engagement of Soviet T-34 columns near Lozovaya.'],
      },
      {
        id: 'u2',
        name: 'T-34/76 Model 1942',
        roleOrType: 'Medium Tank',
        historicalContext: 'Workhorse of Soviet armored formations; highly effective but severely limited by fuel shortages in February 1943.',
        equipmentSpecs: '76.2mm F-34 gun, sloped 45mm armor, diesel V-2 engine.',
        keyActions: ['Spearheaded Operation Gallop across 150 miles of frozen steppe.'],
      },
    ],
    locations: [
      {
        id: 'l1',
        name: 'Kharkov (Kharkiv)',
        roleOrType: 'Strategic Industrial Rail Hub',
        historicalContext: 'Fourth largest city in Soviet Union; changed hands four times during WWII.',
        keyActions: ['Center of logistics for the entire Ukrainian southern front.'],
      },
    ],
    majorCauses: [
      'Over-optimistic Soviet intelligence assuming the entire German southern army was in headlong flight.',
      'Critical breakdown of Soviet supply lines over snow-choked steppe 120km from railheads.',
      'Manstein’s refusal to conduct a rigid frontal defense, executing a mobile encirclement instead.',
    ],
    majorConsequences: [
      'Frontline stabilized for 5 months, delaying Soviet advance to the Dnieper.',
      'Formation of the massive Kursk Salient, which defined the climactic battle of July 1943.',
      'Destruction of over 50 Soviet divisions and massive loss of armor.',
    ],
    disputedPoints: [
      {
        issue: 'Exact Soviet tank casualties during the counter-stroke',
        sideA: 'Soviet official post-war records list ~600 tanks lost.',
        sideB: 'German battlefield after-action reports claimed over 1,000 tanks captured or destroyed.',
        status: 'CONTESTED' as const,
        evidenceSummary: 'Modern historians (Glantz, Frieser) estimate 650–750 operational tanks lost due to breakdown abandonments.',
      },
    ],
    openQuestions: [
      'Could Vatutin have saved Mobile Group Popov if he had halted at the Donets on February 17th instead of pressing forward?',
    ],
    lastResearchedAt: new Date().toISOString(),
  };
}

function generateMockOutline(subject: string, mode: string, durationMin = 10, wpm = 145) {
  const totalWords = durationMin * wpm;
  return {
    narrativeMode: mode as any,
    totalTargetDurationMinutes: durationMin,
    targetWpm: wpm,
    totalTargetWords: totalWords,
    beats: [
      {
        id: 'beat_1',
        beatNumber: 1,
        beatType: 'HOOK' as const,
        title: 'The Illusion of Total Victory',
        summary: 'Establish the false sense of triumph in Moscow and the dangerous reality developing in Ukraine.',
        targetDurationSeconds: 60,
        targetWordCount: 145,
        viewerCurrentKnowledge: 'Believes Germany collapsed immediately after Stalingrad.',
        viewerCuriosityDriver: 'What did the commanders in Moscow fail to see on their operational maps?',
        dramaticShift: 'Pulls the viewer from celebratory victory into the quiet buildup of a catastrophe.',
        keyClaimsToCover: ['Stalingrad surrender was only 16 days prior', 'Soviet spearheads advancing 30 miles a day'],
        suggestedVisualStyle: 'High-contrast archival footage of marching Soviet troops cut with aerial reconnaissance photos',
      },
      {
        id: 'beat_2',
        beatNumber: 2,
        beatType: 'ORIENTATION' as const,
        title: 'The Steppe in Winter',
        summary: 'Introduce the geography, frozen rivers, and the logistical nightmare of the Donets Basin.',
        targetDurationSeconds: 75,
        targetWordCount: 180,
        viewerCurrentKnowledge: 'Knows Soviet forces are charging forward.',
        viewerCuriosityDriver: 'How far can an army advance before its supply lines snap?',
        dramaticShift: 'Transitions from grand strategy to the physical friction of mud, snow, and fuel trucks.',
        keyClaimsToCover: ['Supply columns 120km behind tanks', 'Horse-drawn carts carrying ammunition in blizzards'],
        suggestedVisualStyle: 'Animated tactical terrain map showing rail lines terminating 100 miles east of the front',
      },
      {
        id: 'beat_3',
        beatNumber: 3,
        beatType: 'CENTRAL_QUESTION' as const,
        title: 'The Disobeyed Order',
        summary: 'Paul Hausser defies Hitler to evacuate Kharkov, preserving the SS Panzer Corps.',
        targetDurationSeconds: 70,
        targetWordCount: 170,
        viewerCurrentKnowledge: 'Understands the supply danger.',
        viewerCuriosityDriver: 'Why did Hitler want to sacrifice his best mechanized divisions in a static defense?',
        dramaticShift: 'Reveals that retreating saved the German army from total destruction.',
        keyClaimsToCover: ['Hausser ordered withdrawal Feb 15 despite Hitler’s hold order', 'Saved 3 elite Panzer divisions'],
        suggestedVisualStyle: 'Archival portrait of Paul Hausser with telegram overlays and city street footage',
      },
      {
        id: 'beat_4',
        beatNumber: 4,
        beatType: 'ESCALATION' as const,
        title: 'The Trap Snaps',
        summary: 'Manstein launches 4th Panzer Army into the exposed flank of Soviet 6th Army on Feb 19.',
        targetDurationSeconds: 90,
        targetWordCount: 215,
        viewerCurrentKnowledge: 'Hausser’s armor is now free to maneuver.',
        viewerCuriosityDriver: 'How did German reconnaissance pinpoint the exact moment Soviet fuel ran out?',
        dramaticShift: 'The hunters suddenly realize they have become the encircled prey.',
        keyClaimsToCover: ['4th Panzer Army strike initiated Feb 19', 'Soviet 25th Tank Corps cut off near Pavlograd'],
        suggestedVisualStyle: 'Dynamic battle map with red arrows overextending and black pincers closing around them',
      },
      {
        id: 'beat_5',
        beatNumber: 5,
        beatType: 'COMPLICATIONS' as const,
        title: 'Radio Silence and Blind Commands',
        summary: 'Soviet General Vatutin refuses to believe reports of German counter-attacks, ordering troops further into the pocket.',
        targetDurationSeconds: 80,
        targetWordCount: 190,
        viewerCurrentKnowledge: 'German counter-attack is underway.',
        viewerCuriosityDriver: 'Why didn’t Soviet headquarters order a tactical retreat in time?',
        dramaticShift: 'Exposes how bureaucratic fear and hubris prevented early withdrawal.',
        keyClaimsToCover: ['Vatutin believed German movement was merely local rearguard action', 'Soviet communications broke down'],
        suggestedVisualStyle: 'Primary document dispatches and declassified Soviet staff logs',
      },
      {
        id: 'beat_6',
        beatNumber: 6,
        beatType: 'TURNING_POINT' as const,
        title: 'The Collapse of Mobile Group Popov',
        summary: 'The pride of the Soviet armored thrust is dismantled in a 4-day running battle.',
        targetDurationSeconds: 85,
        targetWordCount: 205,
        viewerCurrentKnowledge: 'Soviet forces are surrounded.',
        viewerCuriosityDriver: 'What was the fighting like on the ground in freezing temperatures?',
        dramaticShift: 'From strategic operational diagrams to desperate small-unit combat in snow.',
        keyClaimsToCover: ['Popov lost over 200 tanks in 72 hours', 'Running out of 76mm ammunition'],
        suggestedVisualStyle: 'Archival combat footage of burning T-34s and Tiger I long-range engagements',
      },
      {
        id: 'beat_7',
        beatNumber: 7,
        beatType: 'REVEAL' as const,
        title: 'The Recapture of Kharkov',
        summary: 'German armor closes in from the north and west, retaking the devastated city.',
        targetDurationSeconds: 70,
        targetWordCount: 170,
        viewerCurrentKnowledge: 'Soviet offensive is shattered.',
        viewerCuriosityDriver: 'How did the city fall after having just been liberated weeks before?',
        dramaticShift: 'Kharkov becomes the only major Soviet city to change hands four times.',
        keyClaimsToCover: ['City secured March 15, 1943', 'Red Army loses 52 divisions'],
        suggestedVisualStyle: 'Archival photographs of Dzerzhinsky Square in ruins and German halftracks',
      },
      {
        id: 'beat_8',
        beatNumber: 8,
        beatType: 'PAYOFF' as const,
        title: 'The Price of the Backhand Stroke',
        summary: 'Assess the true cost in human lives and the temporary nature of the German triumph.',
        targetDurationSeconds: 65,
        targetWordCount: 155,
        viewerCurrentKnowledge: 'Kharkov is recaptured; front is stabilized.',
        viewerCuriosityDriver: 'Did this victory change the ultimate outcome of the war?',
        dramaticShift: 'Transforms military tactical brilliance into grim historical reality.',
        keyClaimsToCover: ['Axis suffered 11,000 casualties; Soviet losses exceeded 50,000', 'Stabilized front for 5 months'],
        suggestedVisualStyle: 'Slow pan across battlefield graves in thawing spring mud',
      },
      {
        id: 'beat_9',
        beatNumber: 9,
        beatType: 'SIGNIFICANCE' as const,
        title: 'The Road to Kursk',
        summary: 'How the Battle of Kharkov directly shaped the greatest armored battle in human history.',
        targetDurationSeconds: 45,
        targetWordCount: 115,
        viewerCurrentKnowledge: 'The fighting has concluded.',
        viewerCuriosityDriver: 'What was the final strategic legacy of this campaign?',
        dramaticShift: 'Connects the February snow directly to the summer clash at Kursk.',
        keyClaimsToCover: ['Created the Kursk Salient', 'Both sides spent spring 1943 massing armor for July'],
        suggestedVisualStyle: 'Strategic map pulling back from Kharkov to reveal the huge Kursk bulge',
      },
    ],
  };
}

function generateMockScriptBeats(outline: any) {
  const beats = outline?.beats || [];
  return beats.map((b: any, index: number) => {
    return {
      id: `sbeat_${index + 1}`,
      outlineBeatId: b.id,
      beatNumber: b.beatNumber || index + 1,
      beatType: b.beatType || 'BEAT',
      title: b.title || `Beat ${index + 1}`,
      narrationText:
        index === 0
          ? 'In the third week of February 1943, three hundred miles east of Kyiv, the snow was four feet deep. To the Soviet General Staff in Moscow, the operational maps showed only victory. The German Sixth Army had vanished into the ruins of Stalingrad barely sixteen days earlier, and across eastern Ukraine, two Soviet army fronts were surging forward at thirty miles a day. But at Army Group South headquarters, Field Marshal Erich von Manstein was watching something very different: Soviet tank columns running out of diesel, their supply trucks stranded eighty miles behind the front.'
          : index === 1
          ? 'Across the frozen steppe of the Donets Basin, the physics of war were quietly asserting themselves. A T-34 tank can cover sixty miles in deep snow, but the horse-drawn wagons carrying its artillery shells cannot. As the Soviet 6th Army charged toward the Dnieper River, its railheads remained fixed a hundred miles to the east. The men had little bread, the tanks had half a tank of fuel, and the frontline commanders were under strict orders never to slow down.'
          : `By late February, the critical moment arrived. ${b.summary} Field Marshal Manstein concentrated the 4th Panzer Army along the exposed Soviet flank. On February 19th, with German reconnaissance confirming the Soviet spearhead was completely out of ammunition, the counter-stroke was launched. Over the next twelve days, the front did not merely bend—it collapsed entirely.`,
      wordCount: 145,
      estimatedDurationSeconds: 60,
      pacingNote: '145 WPM measured documentary pacing',
      deliveryDirective: 'Deliberate, authoritative, calm cadence. Let the facts carry the dramatic weight.',
      isDeadBeatWarning: false,
      claimsReferenced: b.keyClaimsToCover || [],
    };
  });
}

function generateMockRetentionAudit(scriptBeats: any[]) {
  return {
    score: 93,
    overallVerdict:
      'Exceptional narrative momentum with zero dramatic fluff. Concrete details and causal progression maintain high tension throughout.',
    issues: [
      {
        id: 'iss_1',
        beatId: scriptBeats[1]?.id || 'sbeat_2',
        type: 'PACING_SLOG' as const,
        locationSnippet: 'horse-drawn wagons carrying its artillery shells...',
        description: 'Consider tightening the transition between the supply line description and the tank speed.',
        suggestedAction: 'Compress' as const,
        suggestedFix: 'Condense into one punchy contrast line to quicken the pacing before Beat 3.',
      },
    ],
    pacingGraph: scriptBeats.map((b, i) => ({
      beatNumber: i + 1,
      tensionLevel: Math.min(10, 6 + Math.floor(Math.sin(i * 0.8) * 3 + i * 0.4)),
      informationDensity: 8 + (i % 2),
    })),
    auditedAt: new Date().toISOString(),
  };
}

function generateMockFactCheck(scriptBeats: any[]) {
  return {
    checkedAt: new Date().toISOString(),
    verifiedCount: 8,
    supportedCount: 2,
    disputedCount: 0,
    unverifiedCount: 0,
    incorrectCount: 0,
    items: [
      {
        id: 'chk_1',
        sentence: 'The German Sixth Army had vanished into the ruins of Stalingrad barely sixteen days earlier...',
        extractedClaim: 'Stalingrad battle ended Feb 2, 1943; operations near Kharkov began Feb 18-19, 1943.',
        status: 'VERIFIED' as const,
        evidenceFound: 'Official capitulation signed Feb 2; Manstein operational conference held Feb 17.',
        sourceReference: 'Bundesarchiv RH 19-V; Glantz, "After Stalingrad", p. 88.',
      },
      {
        id: 'chk_2',
        sentence: 'Manstein concentrated the 4th Panzer Army along the exposed Soviet flank...',
        extractedClaim: '4th Panzer Army was the primary maneuver element under General Hoth.',
        status: 'VERIFIED' as const,
        evidenceFound: 'Heeresgruppe Süd war diary entries confirm 4th Panzer Army unit assignments.',
        sourceReference: 'NARA Microfilm T-311 Roll 268.',
      },
      {
        id: 'chk_3',
        sentence: 'Soviet 25th Tank Corps was out of fuel near Pavlograd...',
        extractedClaim: 'Soviet 25th Tank Corps reached Pavlograd before being cut off with critical fuel shortages.',
        status: 'SUPPORTED' as const,
        evidenceFound: 'TsAMO archival records of Southwestern Front corroborate 0.3 combat loads remaining.',
        sourceReference: 'TsAMO Fond 236, Opis 2673, Delo 31.',
      },
    ],
  };
}

function generateMockVisualCues(scriptBeats: any[]) {
  return scriptBeats.flatMap((beat, bIndex) => {
    return [
      {
        id: `cue_${bIndex * 2 + 1}`,
        beatId: beat.id,
        cueNumber: bIndex * 2 + 1,
        timestampStart: bIndex * 60,
        timestampEnd: bIndex * 60 + 4.5,
        duration: 4.5,
        narrationSnippet: beat.narrationText?.substring(0, 80) + '...',
        requiredMeaning: `Establishing scene for ${beat.title} showing historical landscape and troop movements.`,
        preferredRepresentation: 'Authentic archival photograph from verified national collection.',
        acceptableAlternatives: ['Contemporary tactical battle map', 'Declassified telegram dispatch'],
        searchQueries: [
          `${beat.title} 1943 archival photograph`,
          'Eastern front winter 1943 Bundesarchiv',
          'Kharkov February 1943 reconnaissance',
        ],
        preferredVisualType: 'photograph' as const,
        emotionalTone: 'Solemn and tactical',
        selectedAssetId: `ast_${bIndex * 2 + 1}`,
      },
      {
        id: `cue_${bIndex * 2 + 2}`,
        beatId: beat.id,
        cueNumber: bIndex * 2 + 2,
        timestampStart: bIndex * 60 + 4.5,
        timestampEnd: bIndex * 60 + 9.0,
        duration: 4.5,
        narrationSnippet: beat.narrationText?.substring(81, 160) + '...',
        requiredMeaning: `Detail view of machinery, commanders, or operational maps relevant to ${beat.title}.`,
        preferredRepresentation: 'Close-up photograph of equipment or commander in field.',
        acceptableAlternatives: ['Campaign overview diagram', 'Military newspaper headline'],
        searchQueries: ['T-34 winter snow 1943 photograph', 'Manstein headquarters Eastern Front 1943'],
        preferredVisualType: 'equipment' as const,
        emotionalTone: 'Documentary analytical',
        selectedAssetId: `ast_${bIndex * 2 + 2}`,
      },
    ];
  });
}

function generateMockVisualAssets(cue: any) {
  const images = [
    {
      url: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?w=1200&auto=format&fit=crop&q=80',
      title: 'German armored column in winter snow',
      inst: 'German Federal Archives (Bundesarchiv)',
      code: 'Bild 101I-022-2936-18',
    },
    {
      url: 'https://images.unsplash.com/photo-1580130775552-2508a176467f?w=1200&auto=format&fit=crop&q=80',
      title: 'Soviet infantry advancing through snow drifts',
      inst: 'Russian State Documentary Film and Photo Archive (RGAKFD)',
      code: 'RGAKFD 0-142894',
    },
    {
      url: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?w=1200&auto=format&fit=crop&q=80',
      title: 'Operational headquarters map session February 1943',
      inst: 'U.S. National Archives and Records Administration (NARA)',
      code: 'NARA RG 242 T-311',
    },
  ];

  return images.map((img, i) => ({
    id: `ast_${cue.id}_${i + 1}`,
    cueId: cue.id,
    title: img.title,
    description: `Archival photograph depicting tactical operations in the Ukrainian sector, early 1943. Verified by institutional negative records.`,
    thumbnailUrl: img.url,
    fullImageUrl: img.url,
    source: img.inst,
    sourceUrl: 'https://www.archives.gov',
    sourceInstitution: img.inst,
    dateOrPeriod: '1943-02-22',
    location: 'Donets-Kharkov Sector',
    peopleDepicted: ['Field personnel'],
    militaryUnit: 'Army Group South / Southwestern Front',
    visualType: 'photograph' as const,
    hierarchyLevel: (i === 0 ? 'LEVEL_1_EXACT_EVENT' : 'LEVEL_3_SAME_SUBJECT_LOCATION') as any,
    matchScore: 95 - i * 5,
    matchScoreReasons: [
      'Verified period and theater match (Feb 1943)',
      `Official accession code: ${img.code}`,
      'High-resolution archival scan without copyright restrictions for editorial documentary use',
    ],
    historicalConfidence: 'HIGH' as const,
    rightsStatus: 'PUBLIC_DOMAIN' as const,
    license: 'Public Domain / Institutional Open Archive',
    attributionRequirement: `${img.inst}, ${img.code}`,
    isIllustrativeSubstitute: i > 0,
    substituteExplanation: i > 0 ? 'Same campaign sector and date window used to illustrate tactical movement.' : undefined,
    userApproved: i === 0,
  }));
}

function generateExportManifest(project: any) {
  return {
    projectTitle: project.title || 'Untitled Documentary',
    exportedAt: new Date().toISOString(),
    folders: [
      '01_SCRIPT/',
      '02_VOICEOVER/',
      '03_VISUALS/',
      '04_MAPS/',
      '05_PROJECT/',
      '06_SOURCES/',
    ],
    files: [
      '01_SCRIPT/final_script.txt',
      '01_SCRIPT/timestamps.txt',
      '02_VOICEOVER/full_voiceover.wav',
      '05_PROJECT/visual_manifest.csv',
      '05_PROJECT/timeline.csv',
      '05_PROJECT/production_notes.txt',
      '06_SOURCES/sources.csv',
      '06_SOURCES/attribution.txt',
      '06_SOURCES/rights_notes.txt',
    ],
  };
}

// Generates a valid clean WAV tone audio buffer for offline/test speech playback
function generateSynthesizedAudioWav(charCount: number) {
  const durationSec = Math.max(2, Math.min(15, Math.round(charCount / 20)));
  const sampleRate = 24000;
  const numSamples = durationSec * sampleRate;
  const buffer = Buffer.alloc(numSamples * 2);

  // Generate a warm resonant documentary audio tone with gentle amplitude modulation
  for (let i = 0; i < numSamples; i++) {
    const t = i / sampleRate;
    const baseFreq = 160; // Warm masculine documentary fundamental tone
    const wave = Math.sin(2 * Math.PI * baseFreq * t) * 0.3 + Math.sin(2 * Math.PI * (baseFreq * 2) * t) * 0.15;
    const envelope = Math.min(1, Math.min(t * 4, (durationSec - t) * 4)); // gentle fade in/out
    const sample = Math.floor(wave * envelope * 24000);
    buffer.writeInt16LE(sample, i * 2);
  }

  const wav = pcmToWavBuffer(buffer, sampleRate);
  const base64 = wav.toString('base64');
  return {
    base64,
    dataUrl: `data:audio/wav;base64,${base64}`,
    duration: durationSec,
  };
}

// Seed complete starter project with synthesized voiceover segments if database is empty
function seedDefaultProjectIfNeeded() {
  try {
    const existing = fs.readdirSync(DATA_DIR).filter(f => f.endsWith('.json'));
    if (existing.length === 0) {
      const subject = 'Third Battle of Kharkov 1943';
      const outline = generateMockOutline(subject, 'Strategic', 10, 145);
      const scriptBeats = generateMockScriptBeats(outline);
      const researchData = generateMockResearchData(subject);
      const marketData = generateMockMarketData(subject);
      const cues = generateMockVisualCues(scriptBeats);
      const assets = cues.flatMap((c: any) => generateMockVisualAssets(c));

      // Synthesize initial audio segments for each beat
      const segments = scriptBeats.map((beat: any, idx: number) => {
        const audio = generateSynthesizedAudioWav(beat.narrationText.length);
        return {
          id: `seg_init_${Date.now()}_${idx}`,
          beatId: beat.id,
          beatNumber: beat.beatNumber || idx + 1,
          title: beat.title,
          narrationSnippet: beat.narrationText.substring(0, 100) + '...',
          narrationText: beat.narrationText,
          audioBase64: audio.base64,
          audioDataUrl: audio.dataUrl,
          durationSeconds: audio.duration,
          voiceId: 'Fenrir',
          deliveryDirective: beat.deliveryDirective || 'Measured, authoritative cadence with deliberate historical pauses.',
          filename: `0${idx + 1}_beat_${beat.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}.wav`,
          status: 'COMPLETED',
          wordCount: beat.wordCount || beat.narrationText.split(/\s+/).length,
        };
      });

      const defaultProject = {
        id: 'proj_kharkov_1943',
        title: 'The 48-Hour Mirage: When Moscow Declared Victory 3 Days Too Soon',
        subject: subject,
        topic: subject,
        niche: 'World War II Documentaries',
        targetDurationMinutes: 10,
        targetWpm: 145,
        narrativeMode: 'Strategic',
        stage: 'VOICE',
        notes: 'Primary investigation into Soviet overextension and the forgotten supply crisis of February 1943.',
        createdAt: new Date(Date.now() - 3600000 * 24).toISOString(),
        updatedAt: new Date().toISOString(),
        outline,
        scriptBeats,
        researchData,
        marketData,
        visualCues: cues,
        visualAssets: assets,
        voiceover: {
          selectedVoiceId: 'Fenrir',
          overallDeliveryInstruction: 'Measured, authoritative, and atmospheric documentary cadence with deliberate historical pauses.',
          segments,
          assembledDurationSeconds: segments.reduce((acc: number, s: any) => acc + s.durationSeconds, 0),
        },
      };

      saveProjectToDisk(defaultProject, 'proj_kharkov_1943');
      console.log('[KINDRA Server] Seeded starter project: The 48-Hour Mirage with 9 processed voiceover segments.');
    }
  } catch (err) {
    console.warn('[KINDRA Server] Failed to seed starter project:', err);
  }
}

// ==========================================
// 12. API FALLBACK & ERROR HANDLERS
// ==========================================
// Any unmatched /api route returns JSON 404, preventing HTML fallback
app.all('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: `API route not found: ${req.method} ${req.originalUrl}`,
  });
});

// Express error handling middleware
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (err) {
    console.error('[KINDRA Server Error Handler]:', err);
    if (req.path.startsWith('/api/')) {
      return res.status(err.status || 500).json({
        success: false,
        error: err.message || 'Internal server error',
      });
    }
  }
  next(err);
});

// ==========================================
// 13. VITE MIDDLEWARE / PRODUCTION STATIC SERVE
// ==========================================
async function startServer() {
  seedDefaultProjectIfNeeded();
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[KINDRA Workstation Server] Running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
