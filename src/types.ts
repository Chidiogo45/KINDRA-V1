/**
 * KINDRA — Documentary Intelligence & Production Workstation
 * Core TypeScript Type Definitions
 */

export type NarrativeMode = 
  | 'Strategic'
  | 'Investigative'
  | 'Character'
  | 'Technology'
  | 'Human Experience'
  | 'Chronological'
  | 'Thematic'
  | 'Strategic + Character'
  | 'Investigative + Strategic'
  | 'Technology + Strategic';

export type ProjectStage = 
  | 'IDEA'
  | 'INTELLIGENCE'
  | 'TITLES'
  | 'RESEARCH'
  | 'OUTLINE'
  | 'SCRIPT'
  | 'FACT_CHECK'
  | 'VOICE'
  | 'VISUALS'
  | 'ROUGH_CUT'
  | 'EXPORT_READY'
  | 'EXPORTED';

export type ConfidenceLevel = 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRESOLVED';

export type FactCheckStatus = 'VERIFIED' | 'SUPPORTED' | 'DISPUTED' | 'UNVERIFIED' | 'INCORRECT';

export type RightsStatus = 'PUBLIC_DOMAIN' | 'CREATIVE_COMMONS' | 'EDITORIAL_ARCHIVE' | 'RIGHTS_UNCERTAIN' | 'RESTRICTED';

export type VisualType = 
  | 'photograph'
  | 'archival_footage'
  | 'map'
  | 'document'
  | 'newspaper'
  | 'poster'
  | 'portrait'
  | 'equipment'
  | 'diagram'
  | 'battlefield_location'
  | 'ai_reconstruction';

export type MatchHierarchyLevel = 
  | 'LEVEL_1_EXACT_EVENT'
  | 'LEVEL_2_SAME_EVENT_DIFFERENT_MOMENT'
  | 'LEVEL_3_SAME_SUBJECT_LOCATION'
  | 'LEVEL_4_SAME_SUBJECT_PERIOD'
  | 'LEVEL_5_SAME_CAMPAIGN'
  | 'LEVEL_6_CONCEPTUAL'
  | 'LEVEL_7_MAP_DOCUMENT'
  | 'LEVEL_8_CONTEMPORARY_LOCATION'
  | 'LEVEL_9_AI_RECONSTRUCTION';

export interface VideoRecord {
  id: string;
  title: string;
  channelName: string;
  channelId: string;
  subscriberCount: number;
  uploadDate: string;
  duration: string;
  durationSeconds: number;
  views: number;
  likes: number;
  commentsCount: number;
  description: string;
  thumbnail: string;
  sourceUrl: string;
  transcriptAvailable: boolean;
  // Derived metrics
  engagementRate: number; // (likes + comments) / views * 100
  viewsPerSubscriber: number; // views / subscribers
  isSmallChannelBreakout: boolean;
  outlierScore: number; // 0-100
  outlierReason?: string;
  category?: string;
}

export interface OpportunityScoreBreakdown {
  overall: number; // 0-100
  demand: number; // 0-100
  momentum: number; // 0-100
  outlierSignal: number; // 0-100
  engagement: number; // 0-100
  competition: number; // 0-100 (lower competition = higher score)
  audienceGapScore: number; // 0-100
  explanation: string;
}

export interface AudienceCommentCluster {
  id: string;
  theme: string;
  type: 'QUESTION' | 'CORRECTION' | 'MISCONCEPTION' | 'WANTED_TOPIC' | 'EMOTIONAL_REACTION';
  representativeComments: string[];
  frequencyCount: number;
  productionImplication: string; // How outline/script should address this
}

export interface DocumentaryAngle {
  id: string;
  titleProposal: string;
  alternativeTitles: string[];
  angleCategory: 'Strategic Decision' | 'Commander Conflict' | 'Intelligence Failure' | 'Logistical Crisis' | 'Tactical Turning Point' | 'Human Experience' | 'Technological Evolution';
  centralQuestion: string;
  coreConflict: string;
  historicalNovelty: string;
  audienceAppeal: string;
  evidenceAvailability: 'Abundant Primary' | 'Moderate Secondary' | 'Contested Archives' | 'Scarce';
  recommendedNarrativeMode: NarrativeMode;
  curiosityHook: string;
}

export type TopicOpportunityClassification = 
  | 'RISING' 
  | 'BREAKOUT' 
  | 'STRONG DEMAND' 
  | 'UNDERSERVED' 
  | 'EVERGREEN';

export interface TopicOpportunity {
  id: string;
  topic: string;
  category: string;
  opportunityScore: number; // 0-100
  risingSignal: number; // 1-5 (stars)
  competition: 'Low' | 'Medium' | 'High';
  breakoutSignal: 'Low' | 'Medium' | 'High';
  audienceInterest: 'Low' | 'Medium' | 'High';
  classifications: TopicOpportunityClassification[];
  evidenceCount: number;
  bestExample: {
    title: string;
    views: number;
    viewsFormatted: string;
    channelName: string;
    subscriberCount: number;
    viewsPerSub: number;
    uploadDate?: string;
    url?: string;
  };
  recentMomentum: 'Surging' | 'Strong' | 'Moderate';
  audienceGap: string;
  whyThisTopic: string;
  evidenceVideos?: VideoRecord[];
}

export interface ResearchedTitleAnalysis {
  id: string;
  videoTitle: string;
  channelName: string;
  views: number;
  subscriberCount: number;
  viewsPerSubscriber: number;
  engagementRate: number;
  uploadDate: string;
  titleLength: number;
  structure: string; // e.g. "[CONSEQUENCE] + [MISTAKE] + [SUBJECT]"
  curiosityMechanism: string; // e.g. "Information Gap / Paradox"
  subjectPlacement: 'Leading' | 'Center' | 'Trailing';
  emotionalFraming: string;
  specificity: string;
  impliedPromise: string;
  wordingPatterns: string[];
}

export interface GeneratedTitleCandidate {
  id: string;
  title: string;
  strategy: 'RESEARCH_INSPIRED' | 'ORIGINAL' | 'HIGH_CURIOSITY' | 'STRATEGIC' | 'HUMAN' | 'CUSTOM';
  strategyLabel: string;
  structuralBlueprint: string;
  inspiredByVideoTitle?: string;
  clarityScore: number; // 1-10
  curiosityScore: number; // 1-10
  specificityScore: number; // 1-10
  accuracyScore: number; // 1-10
  overallScore: number; // 1-10
  critique: string;
  isApproved?: boolean;
  userEdited?: boolean;
}

export interface TitleStudioData {
  researchedTitles: ResearchedTitleAnalysis[];
  selectedInspirationTitleId?: string;
  candidates: GeneratedTitleCandidate[];
  approvedTitle?: string;
  approvedTitleCandidate?: GeneratedTitleCandidate;
  activeInstruction?: string;
  lastResearchedAt?: string;
}

export interface MarketIntelligenceData {
  query: string;
  expandedKeywords: string[];
  analyzedAt: string;
  totalVideosAnalyzed: number;
  opportunityScore: OpportunityScoreBreakdown;
  videos: VideoRecord[];
  outliers: VideoRecord[];
  commentClusters: AudienceCommentCluster[];
  angles: DocumentaryAngle[];
  selectedAngleId?: string;
  demandTrend: { month: string; interest: number; competitorUploads: number }[];
  topicOpportunities?: TopicOpportunity[];
  isBroadExploration?: boolean;
}

export interface ResearchClaim {
  id: string;
  claim: string;
  category: 'FACT' | 'INTERPRETATION' | 'ANALYSIS' | 'UNCERTAINTY' | 'UNVERIFIED';
  primarySource: string;
  sourceUrl?: string;
  sourceType: 'Primary Archive' | 'Official Military Record' | 'Academic Journal' | 'Institutional Museum' | 'Secondary History' | 'Contemporary Memoir' | 'General Web';
  publicationDate?: string;
  confidence: ConfidenceLevel;
  supportingEvidence: string;
  contradictoryEvidence?: string;
  disputeNotes?: string;
  verified: boolean;
}

export interface HistoricalTimelineEvent {
  id: string;
  dateStr: string;
  timestampSort: number;
  title: string;
  description: string;
  keyActors: string[];
  location: string;
  significance: string;
  sourceRef: string;
  confidence: ConfidenceLevel;
}

export type TimelineEvent = HistoricalTimelineEvent;

export interface ResearchEntity {
  id: string;
  name: string;
  roleOrType: string;
  historicalContext: string;
  keyActions: string[];
  equipmentSpecs?: string;
}

export interface ResearchWorkspaceData {
  subject: string;
  topicSummary: string;
  claims: ResearchClaim[];
  timeline: HistoricalTimelineEvent[];
  people: ResearchEntity[];
  unitsAndEquipment: ResearchEntity[];
  locations: ResearchEntity[];
  majorCauses: string[];
  majorConsequences: string[];
  disputedPoints: { issue: string; sideA: string; sideB: string; status: 'CONTESTED' | 'SETTLED' | 'UNRESOLVED'; evidenceSummary: string }[];
  openQuestions: string[];
  lastResearchedAt: string;
}

export interface OutlineBeat {
  id: string;
  beatNumber: number;
  beatType: 'HOOK' | 'ORIENTATION' | 'CENTRAL_QUESTION' | 'ESCALATION' | 'COMPLICATIONS' | 'TURNING_POINT' | 'REVEAL' | 'PAYOFF' | 'SIGNIFICANCE';
  title: string;
  summary: string;
  targetDurationSeconds: number;
  targetWordCount: number;
  viewerCurrentKnowledge: string;
  viewerCuriosityDriver: string;
  dramaticShift: string; // What changes by the end of this beat
  keyClaimsToCover: string[];
  suggestedVisualStyle: string;
}

export interface DocumentaryOutline {
  narrativeMode: NarrativeMode;
  beats: OutlineBeat[];
  totalTargetDurationMinutes: number;
  targetWpm: number;
  totalTargetWords: number;
}

export interface ScriptBeat {
  id: string;
  outlineBeatId: string;
  beatNumber: number;
  beatType: string;
  title: string;
  narrationText: string;
  wordCount: number;
  estimatedDurationSeconds: number;
  pacingNote?: string;
  deliveryDirective?: string; // Voice acting guideline e.g. "Controlled, measured, slight pause before reveal"
  isDeadBeatWarning?: boolean;
  deadBeatReason?: string;
  claimsReferenced: string[];
}

export interface RetentionAuditIssue {
  id: string;
  beatId: string;
  type: 'DEAD_BEAT' | 'TENSION_DROP' | 'REPETITIVE_INFO' | 'PACING_SLOG' | 'UNRESOLVED_CONFUSION' | 'WEAK_TRANSITION';
  locationSnippet: string;
  description: string;
  suggestedAction: 'Remove' | 'Compress' | 'Rewrite' | 'Add Specific Evidence';
  suggestedFix?: string;
}

export interface RetentionAudit {
  score: number; // 0-100
  overallVerdict: string;
  issues: RetentionAuditIssue[];
  pacingGraph: { beatNumber: number; tensionLevel: number; informationDensity: number }[];
  auditedAt: string;
}

export interface FactCheckItem {
  id: string;
  sentence: string;
  extractedClaim: string;
  status: FactCheckStatus;
  evidenceFound: string;
  sourceReference: string;
  suggestedCorrection?: string;
  isCorrected?: boolean;
}

export interface FactCheckReport {
  checkedAt: string;
  verifiedCount: number;
  supportedCount: number;
  disputedCount: number;
  unverifiedCount: number;
  incorrectCount: number;
  items: FactCheckItem[];
}

export interface VoiceOption {
  id: string;
  name: string;
  geminiVoiceName: 'Puck' | 'Charon' | 'Kore' | 'Fenrir' | 'Zephyr' | 'Aoede' | string;
  editorialCategory: 'AUTHORITATIVE' | 'HISTORIAN' | 'INVESTIGATIVE' | 'TECHNICAL' | 'SMOOTH' | 'WARM' | 'GRAVELLY' | 'EXPRESSIVE';
  description: string;
  recommendedUse: string;
  timbre: string;
  sampleAudioUrl?: string;
}

export interface VoiceSegment {
  id: string;
  beatId: string;
  beatNumber: number;
  filename: string; // e.g. "01_hook.wav"
  title?: string;
  narrationSnippet?: string;
  narrationText?: string;
  audioBase64?: string;
  audioUrl?: string;
  audioDataUrl?: string;
  durationSeconds: number;
  deliveryDirective: string;
  status: 'PENDING' | 'GENERATING' | 'COMPLETED' | 'FAILED';
  voiceId?: string;
  wordCount?: number;
  error?: string;
}

export interface VoiceoverData {
  selectedVoiceId: string;
  overallDeliveryInstruction: string;
  segments: VoiceSegment[];
  assembledFullAudioUrl?: string;
  assembledDurationSeconds?: number;
}

export interface VisualCue {
  id: string;
  beatId: string;
  cueNumber: number;
  timestampStart: number; // in seconds
  timestampEnd: number; // in seconds
  duration: number; // in seconds (3-5s rhythm)
  narrationSnippet: string;
  requiredMeaning: string;
  preferredRepresentation: string;
  acceptableAlternatives: string[];
  searchQueries: string[];
  preferredVisualType: VisualType;
  emotionalTone: string;
  selectedAssetId?: string;
}

export interface VisualAsset {
  id: string;
  cueId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  fullImageUrl: string;
  source: string;
  sourceUrl: string;
  sourceInstitution: string;
  dateOrPeriod: string;
  location: string;
  peopleDepicted: string[];
  militaryUnit?: string;
  visualType: VisualType;
  hierarchyLevel: MatchHierarchyLevel;
  matchScore: number; // 0-100
  matchScoreReasons: string[];
  historicalConfidence: ConfidenceLevel;
  rightsStatus: RightsStatus;
  license: string;
  attributionRequirement: string;
  isIllustrativeSubstitute: boolean;
  substituteExplanation?: string;
  userApproved: boolean;
  manualUpload?: boolean;
}

export interface TimelineTrackItem {
  id: string;
  cueId: string;
  assetId: string;
  filename: string;
  startTime: number;
  endTime: number;
  duration: number;
  visualType: VisualType;
  treatment: 'pan_zoom_subtle' | 'static' | 'slow_zoom' | 'crop_focus' | 'route_highlight';
  narrationText: string;
}

export interface DocumentaryProject {
  id: string;
  title: string;
  description: string;
  subject: string; // e.g. "Battle of Kharkov 1943"
  topic: string;
  niche?: string; // Configurable niche e.g. "World War II Documentaries"
  targetDurationMinutes: number; // default 10
  targetWpm: number; // default 145
  narrativeMode: NarrativeMode;
  stage: ProjectStage;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  
  selectedAngle?: DocumentaryAngle;
  approvedTitle?: string;
  approvedTitleCandidate?: GeneratedTitleCandidate;
  titleStudioData?: TitleStudioData;
  topicOpportunities?: TopicOpportunity[];
  savedTopics?: string[];

  marketData?: MarketIntelligenceData;
  researchData?: ResearchWorkspaceData;
  outline?: DocumentaryOutline;
  scriptBeats?: ScriptBeat[];
  retentionAudit?: RetentionAudit;
  factCheckReport?: FactCheckReport;
  voiceover?: VoiceoverData;
  visualCues?: VisualCue[];
  visualAssets?: VisualAsset[];
  timelineTrack?: TimelineTrackItem[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
