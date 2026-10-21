export type ResearchDepth = 'RAPIDO' | 'NORMAL' | 'PROFUNDO';

export interface Top5Item {
  id: string;
  title: string;
  stars: number;
  summary: string;
  whatChanged: string;
  whyItMatters: string;
  practicalApplication: string;
  sourceUrl: string;
  sourceName: string;
  isUpdateOfPrevious?: boolean;
}

export interface ModelItem {
  model: string;
  company: string;
  novelty: string;
  importance: string;
  sourceUrl: string;
  sourceName: string;
}

export interface OpenAIItem {
  title: string;
  type: 'Modelo' | 'Codex' | 'Skills/MCP' | 'Computer Use' | 'API/SDK' | 'ChatGPT Work' | 'Otro';
  whatIsIt: string;
  whatChanged: string;
  whatItEnables: string;
  whyRelevant: string;
  example: string;
  sourceUrl: string;
  sourceName: string;
  isConfirmed: boolean;
  isUpdateOfPrevious?: boolean;
}

export interface ClaudeItem {
  title: string;
  type: 'Claude Model' | 'Claude Code' | 'MCP' | 'Computer Use' | 'Artifacts/Projects' | 'Otro';
  summary: string;
  whatChanged: string;
  whyRelevant: string;
  sourceUrl: string;
  sourceName: string;
  isConfirmed: boolean;
}

export interface SkillItem {
  name: string;
  platform: 'Claude' | 'GPT/Codex' | 'MCP' | 'Gemini' | 'Comunidad';
  isOfficial: boolean;
  dateAdded: string;
  purpose: string;
  whatItDoes: string;
  practicalExample: string;
  installGuide?: string;
  utilityRating: string;
  sourceUrl: string;
}

export interface AgentAutomationItem {
  title: string;
  summary: string;
  implications: string;
  sourceUrl: string;
  sourceName: string;
}

export interface VibeCodingItem {
  tool: string;
  novelty: string;
  naturalLanguageCapabilities: string;
  sourceUrl: string;
  sourceName: string;
}

export interface EducationItem {
  title: string;
  targetLevel: string;
  utility: string;
  practicalImpact: string;
  sourceUrl: string;
  sourceName: string;
}

export interface ResearchPaperItem {
  title: string;
  authorsOrOrg: string;
  topic: 'Reasoning' | 'Agents' | 'Multimodal' | 'Small/Local AI' | 'Model Efficiency' | 'AI Education';
  keyFinding: string;
  arxivOrPaperUrl: string;
}

export interface ToolItem {
  name: string;
  category: string;
  description: string;
  link: string;
}

export interface TryThisWeekItem {
  number: 1 | 2 | 3;
  name: string;
  whatItIs: string;
  whyTryIt: string;
  whatToBuild: string;
  howToStart: string;
  estimatedTime: string;
  difficulty: 'BAJA' | 'MEDIA' | 'ALTA';
  directLink: string;
}

export interface RadarWatchItem {
  item: string;
  category: string;
  status: 'CONFIRMADO' | 'PREVISTO OFICIALMENTE' | 'RUMOR';
  notes: string;
}

export interface SourceReference {
  title: string;
  url: string;
  domain: string;
}

export type ConsumptionMode = 'AHORRO' | 'NORMAL' | 'INTENSIVO';

export interface ConsumptionBudget {
  maxReportsPerWeek: number;
  maxManualReportsPerDay: number;
  maxConcurrentAiRequests: number;
  maxRetriesPerAxis: number;
  maxSearchQueriesPerReport: number;
  maxAiCallsPerReport: number;
  maxOutputTokensPerAxis: number;
  maxFinalReportOutputTokens: number;
  targetCostPerReportEur: number;
  targetMonthlyCostEur: number;
}

export interface ReportConsumptionMetrics {
  aiCallsUsed: number;
  searchQueriesUsed: number;
  inputTokensUsed: number;
  outputTokensUsed: number;
  totalTokensUsed: number;
  retryCount: number;
  estimatedCostEur: number;
}

export interface MonthlyConsumptionStats {
  month: string; // e.g. "2026-10"
  monthLabel: string; // e.g. "Octubre 2026"
  reportsCount: number;
  totalAiCalls: number;
  totalSearches: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  totalCostEur: number;
  targetBudgetEur: number;
}

export interface Report {
  id: string;
  title: string;
  date: string;
  period: {
    from: string;
    to: string;
  };
  executiveSummary: string;
  top5: Top5Item[];
  newModels: ModelItem[];
  openaiUpdates: OpenAIItem[];
  claudeUpdates: ClaudeItem[];
  skills: SkillItem[];
  agentsAndAutomation: AgentAutomationItem[];
  vibeCoding: VibeCodingItem[];
  education: EducationItem[];
  researchPapers: ResearchPaperItem[];
  toolsToTry: ToolItem[];
  tryThisWeek: [TryThisWeekItem, TryThisWeekItem, TryThisWeekItem];
  radarWatch: RadarWatchItem[];
  sourcesAnalyzedCount: number;
  sourcesList: SourceReference[];
  durationSeconds: number;
  createdAt: string;
  emailStatus: {
    status?: 'EMAIL_SENT' | 'EMAIL_FAILED' | 'NOT_CONFIGURED';
    sent: boolean;
    recipient?: string;
    sender?: string;
    sentAt?: string;
    error?: string;
    notConfigured?: boolean;
    messageId?: string;
  };
  renderedHtml?: string;
  consumption?: ReportConsumptionMetrics;
  limitReached?: boolean;
  isPartial?: boolean;
}

export interface GmailConfig {
  connected: boolean;
  configured: boolean;
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  lastTestSentAt?: string;
  lastTestStatus?: 'SUCCESS' | 'ERROR';
  lastTestError?: string;
  cloudProjectId?: string;
  cloudProjectNumber?: string;
}

export interface ReportSummary {
  id: string;
  title: string;
  date: string;
  period: {
    from: string;
    to: string;
  };
  top5Titles: string[];
  sourcesAnalyzedCount: number;
  durationSeconds: number;
  emailSent: boolean;
  emailStatus?: {
    status?: 'EMAIL_SENT' | 'EMAIL_FAILED' | 'NOT_CONFIGURED';
    sent: boolean;
    recipient?: string;
    sender?: string;
    sentAt?: string;
    error?: string;
  };
  executiveSummaryExcerpt: string;
  consumption?: ReportConsumptionMetrics;
  limitReached?: boolean;
  isPartial?: boolean;
}

export interface SystemStatus {
  status: string;
  isAutomationActive: boolean;
  isRunning: boolean;
  currentProgress: GenerationProgress;
  lastRunAt: string | null;
  nextRunAt: string;
  lastDurationSeconds: number;
  lastSourcesCount: number;
  reportsCount: number;
  timezone: string;
  scheduleDay: string;
  scheduleHour: number;
  recipientEmail: string;
  isSmtpConfigured: boolean;
  gmailConfig?: GmailConfig;
  consumptionMode?: ConsumptionMode;
  consumptionBudget?: ConsumptionBudget;
  lastError: {
    date: string;
    phase: string;
    message: string;
  } | null;
}

export interface SmtpConfig {
  enabled: boolean;
  host: string;
  port: number;
  secure: boolean;
  user: string;
  pass: string;
  from: string;
}

export interface AppConfig {
  recipientEmail: string;
  scheduleDay: 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';
  scheduleHour: number;
  scheduleMinute: number;
  timezone: string;
  researchDepth: ResearchDepth;
  minImportance: number;
  maxNewsCount: number;
  modelName: string;
  consumptionMode: ConsumptionMode;
  consumptionBudget: ConsumptionBudget;
  activeCategories: {
    models: boolean;
    openai: boolean;
    codex: boolean;
    claude: boolean;
    claudeSkills: boolean;
    gptSkills: boolean;
    gemini: boolean;
    agents: boolean;
    mcp: boolean;
    vibeCoding: boolean;
    education: boolean;
    research: boolean;
    tools: boolean;
  };
  schedulerSecret: string;
  smtpConfig: SmtpConfig;
  gmailConfig?: GmailConfig;
}

export type AxisStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED' | 'RATE_LIMITED' | 'SKIPPED' | 'ERROR';

export interface InvestigationAxisState {
  id: string;
  name: string;
  status: AxisStatus;
  newsCount?: number;
  sourcesCount?: number;
  inputTokens?: number;
  outputTokens?: number;
  searchesCount?: number;
  error?: string;
}

export interface GenerationProgress {
  phase:
    | 'IDLE'
    | 'BUSCANDO_FUENTES'
    | 'ANALIZANDO_NOVEDADES'
    | 'VERIFICANDO'
    | 'ELIMINANDO_DUPLICADOS'
    | 'COMPARANDO_HISTORICO'
    | 'CLASIFICANDO'
    | 'GENERANDO_INFORME'
    | 'GUARDANDO'
    | 'ENVIANDO_EMAIL'
    | 'COMPLETADO'
    | 'ERROR';
  percentage: number;
  detail: string;
  sourcesCount: number;
  reportId?: string;
  error?: string;
  retryAttempt?: number;
  maxRetries?: number;
  activeModel?: string;
  isRetrying?: boolean;
  isFallbackActive?: boolean;
  completedQueriesCount?: number;
  totalQueriesCount?: number;
  canResume?: boolean;
  // Axes tracking & Rate Limit fields
  axes?: InvestigationAxisState[];
  completedAxesCount?: number;
  totalAxesCount?: number;
  rateLimitCountdownSeconds?: number;
  rateLimitResumeAt?: string | null;
  isRateLimited?: boolean;
  isQuotaExhausted?: boolean;
  limitReached?: boolean;
  isCancelled?: boolean;
  consumption?: ReportConsumptionMetrics;
  status?:
    | 'IDLE'
    | 'RUNNING'
    | 'RATE_LIMITED'
    | 'QUOTA_EXHAUSTED'
    | 'LIMIT_REACHED'
    | 'CANCELLED'
    | 'SUCCESS'
    | 'ERROR';
}

