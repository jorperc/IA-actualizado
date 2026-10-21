import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Config, Report, HistoricalSignal, GenerationProgress, GmailConfig } from './types.js';
import { getInitialSeedReport } from './initialSeed.js';
import { CONSUMPTION_BUDGETS } from './consumptionConfig.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

const CONFIG_FILE = path.join(DATA_DIR, 'config.json');
const REPORTS_FILE = path.join(DATA_DIR, 'reports.json');
const SIGNALS_FILE = path.join(DATA_DIR, 'history_signals.json');
const GMAIL_AUTH_FILE = path.join(DATA_DIR, 'gmail_auth.json');

const DEFAULT_CONFIG: Config = {
  recipientEmail: 'jorperc@gmail.com',
  scheduleDay: 'Monday',
  scheduleHour: 8,
  scheduleMinute: 0,
  timezone: 'Europe/Madrid',
  researchDepth: 'NORMAL',
  minImportance: 3,
  maxNewsCount: 20,
  modelName: 'gemini-3.8-flash',
  consumptionMode: 'AHORRO',
  consumptionBudget: CONSUMPTION_BUDGETS.AHORRO,
  activeCategories: {
    models: true,
    openai: true,
    codex: true,
    claude: true,
    claudeSkills: true,
    gptSkills: true,
    gemini: true,
    agents: true,
    mcp: true,
    vibeCoding: true,
    education: true,
    research: true,
    tools: true,
  },
  schedulerSecret: process.env.SCHEDULER_SECRET || 'ai-radar-secret-key-2026',
  smtpConfig: {
    enabled: false,
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    secure: false,
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || '',
  },
  lastRunAt: '2026-10-21T08:00:38.000Z',
  lastDurationSeconds: 38,
  lastSourcesCount: 42,
  lastStatus: 'SUCCESS',
  lastError: null,
};

let currentProgress: GenerationProgress = {
  phase: 'IDLE',
  percentage: 0,
  detail: 'Listo para nueva investigación semanal.',
  sourcesCount: 0,
};

let isGeneratingLock = false;
let cancelRequested = false;

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function getConfig(): Config {
  ensureDataDir();
  if (!fs.existsSync(CONFIG_FILE)) {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
    return DEFAULT_CONFIG;
  }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_CONFIG, ...parsed };
  } catch (err) {
    console.error('Error reading config.json, resetting to default', err);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(newConfig: Partial<Config>): Config {
  ensureDataDir();
  let current = DEFAULT_CONFIG;
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      const raw = fs.readFileSync(CONFIG_FILE, 'utf-8');
      current = { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
    } catch {
      current = DEFAULT_CONFIG;
    }
  }

  let targetBudget = newConfig.consumptionBudget || current.consumptionBudget || CONSUMPTION_BUDGETS.AHORRO;
  if (newConfig.consumptionMode && newConfig.consumptionMode !== current.consumptionMode && !newConfig.consumptionBudget) {
    targetBudget = CONSUMPTION_BUDGETS[newConfig.consumptionMode] || CONSUMPTION_BUDGETS.AHORRO;
  }

  const merged: Config = {
    ...current,
    ...newConfig,
    consumptionMode: newConfig.consumptionMode || current.consumptionMode || 'AHORRO',
    consumptionBudget: targetBudget,
    activeCategories: {
      ...current.activeCategories,
      ...(newConfig.activeCategories || {}),
    },
    smtpConfig: {
      ...current.smtpConfig,
      ...(newConfig.smtpConfig || {}),
    },
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

function readReportsRaw(): Report[] {
  ensureDataDir();
  if (!fs.existsSync(REPORTS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(REPORTS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getAllReports(): Report[] {
  ensureDataDir();
  let reports = readReportsRaw();
  if (reports.length === 0) {
    const initialSeed = getInitialSeedReport();
    reports = [initialSeed];
    fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf-8');
    updateSignalsFromReport(initialSeed);
  }
  return reports;
}

export function getReportById(id: string): Report | undefined {
  const reports = getAllReports();
  return reports.find((r) => r.id === id);
}

export function saveReport(report: Report): void {
  ensureDataDir();
  const reports = readReportsRaw();
  const index = reports.findIndex((r) => r.id === report.id);
  if (index >= 0) {
    reports[index] = report;
  } else {
    reports.unshift(report); // Newest first
  }
  fs.writeFileSync(REPORTS_FILE, JSON.stringify(reports, null, 2), 'utf-8');

  // Also update historical signals index
  updateSignalsFromReport(report);
}

export function updateReportEmailStatus(
  reportId: string,
  status: Report['emailStatus']
): Report | undefined {
  const reports = getAllReports();
  const report = reports.find((r) => r.id === reportId);
  if (!report) return undefined;
  report.emailStatus = status;
  saveReport(report);
  return report;
}

export function getHistoricalSignals(): HistoricalSignal[] {
  ensureDataDir();
  if (!fs.existsSync(SIGNALS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(SIGNALS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
}

function updateSignalsFromReport(report: Report): void {
  const signals = getHistoricalSignals();
  const period = `${report.period.from} - ${report.period.to}`;

  const newItems: HistoricalSignal[] = [];

  // Index top5
  for (const item of report.top5) {
    if (!signals.some((s) => s.title.toLowerCase() === item.title.toLowerCase())) {
      newItems.push({
        id: `sig-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: item.title,
        entity: item.sourceName || 'General',
        firstSeenPeriod: period,
        reportId: report.id,
      });
    }
  }

  // Index models
  for (const m of report.newModels) {
    if (!signals.some((s) => s.title.toLowerCase() === m.model.toLowerCase())) {
      newItems.push({
        id: `sig-m-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: m.model,
        entity: m.company,
        firstSeenPeriod: period,
        reportId: report.id,
      });
    }
  }

  // Index skills
  for (const s of report.skills) {
    if (!signals.some((sig) => sig.title.toLowerCase() === s.name.toLowerCase())) {
      newItems.push({
        id: `sig-sk-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: s.name,
        entity: s.platform,
        firstSeenPeriod: period,
        reportId: report.id,
      });
    }
  }

  if (newItems.length > 0) {
    const merged = [...newItems, ...signals];
    fs.writeFileSync(SIGNALS_FILE, JSON.stringify(merged.slice(0, 500), null, 2), 'utf-8');
  }
}

export function getProgress(): GenerationProgress {
  return currentProgress;
}

export function updateProgress(progress: Partial<GenerationProgress>): void {
  currentProgress = {
    ...currentProgress,
    ...progress,
  };
}

export function isLocked(): boolean {
  return isGeneratingLock;
}

export function setLock(locked: boolean): void {
  isGeneratingLock = locked;
}

export function requestCancellation(): void {
  cancelRequested = true;
}

export function isCancellationRequested(): boolean {
  return cancelRequested;
}

export function clearCancellation(): void {
  cancelRequested = false;
}

// ----------------------------------------------------
// GMAIL OAUTH AUTHENTICATION STORAGE (SERVER-SIDE)
// ----------------------------------------------------

export interface ServerGmailAuth {
  connected: boolean;
  configured: boolean; // Marked as TRUE ONLY after a successful real test email send!
  senderEmail: string;
  senderName: string;
  recipientEmail: string;
  accessToken?: string;
  tokenExpiresAt?: number;
  lastTestSentAt?: string;
  lastTestStatus?: 'SUCCESS' | 'ERROR';
  lastTestError?: string;
}

const DEFAULT_GMAIL_AUTH: ServerGmailAuth = {
  connected: false,
  configured: false,
  senderEmail: '',
  senderName: 'AI Weekly Radar',
  recipientEmail: 'jorperc@gmail.com',
};

export function getServerGmailAuth(): ServerGmailAuth {
  ensureDataDir();
  const config = getConfig();
  const defaultAuth = {
    ...DEFAULT_GMAIL_AUTH,
    recipientEmail: config.recipientEmail || 'jorperc@gmail.com',
  };

  if (!fs.existsSync(GMAIL_AUTH_FILE)) {
    return defaultAuth;
  }
  try {
    const raw = fs.readFileSync(GMAIL_AUTH_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return { ...defaultAuth, ...parsed };
  } catch (err) {
    console.error('Error reading gmail_auth.json:', err);
    return defaultAuth;
  }
}

export function getGmailConfig(): GmailConfig {
  const auth = getServerGmailAuth();
  // Safe representation without sensitive access token or secret
  return {
    connected: auth.connected,
    configured: auth.configured,
    senderEmail: auth.senderEmail,
    senderName: auth.senderName || 'AI Weekly Radar',
    recipientEmail: auth.recipientEmail || 'jorperc@gmail.com',
    lastTestSentAt: auth.lastTestSentAt,
    lastTestStatus: auth.lastTestStatus,
    lastTestError: auth.lastTestError,
  };
}

export function saveServerGmailAuth(
  newAuth: Partial<ServerGmailAuth>
): ServerGmailAuth {
  ensureDataDir();
  const current = getServerGmailAuth();
  const merged: ServerGmailAuth = {
    ...current,
    ...newAuth,
  };

  fs.writeFileSync(GMAIL_AUTH_FILE, JSON.stringify(merged, null, 2), 'utf-8');

  // Keep recipientEmail in sync with general config
  if (merged.recipientEmail) {
    saveConfig({ recipientEmail: merged.recipientEmail });
  }

  return merged;
}

export function disconnectGmailAuth(): void {
  ensureDataDir();
  const current = getServerGmailAuth();
  const reset: ServerGmailAuth = {
    ...DEFAULT_GMAIL_AUTH,
    recipientEmail: current.recipientEmail || 'jorperc@gmail.com',
  };
  fs.writeFileSync(GMAIL_AUTH_FILE, JSON.stringify(reset, null, 2), 'utf-8');
}

export function markGmailAsConfigured(lastTestSentAt: string): ServerGmailAuth {
  return saveServerGmailAuth({
    configured: true,
    lastTestSentAt,
    lastTestStatus: 'SUCCESS',
    lastTestError: undefined,
  });
}

