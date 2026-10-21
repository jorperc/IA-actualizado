import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { SourceReference, AxisStatus } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const CHECKPOINT_FILE = path.join(DATA_DIR, 'investigation_checkpoint.json');

export interface QueryCheckpointItem {
  queryIndex: number;
  query: string;
  resultText: string;
  sources: SourceReference[];
  timestamp: string;
}

export interface AxisCheckpointItem {
  id: string;
  name: string;
  status: AxisStatus;
  resultText: string;
  sources: SourceReference[];
  timestamp: string;
  inputTokens?: number;
  outputTokens?: number;
  searchesCount?: number;
  retries?: number;
}

export interface InvestigationCheckpoint {
  period: { from: string; to: string; full: string };
  queriesCompleted: QueryCheckpointItem[];
  axesCompleted?: AxisCheckpointItem[];
  synthesisDraft?: any;
  updatedAt: string;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export function loadCheckpoint(expectedPeriodFull?: string): InvestigationCheckpoint | null {
  ensureDataDir();
  if (!fs.existsSync(CHECKPOINT_FILE)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(CHECKPOINT_FILE, 'utf-8');
    const cp: InvestigationCheckpoint = JSON.parse(raw);
    if (!cp) {
      return null;
    }
    // If period matches or none expected, return
    if (!expectedPeriodFull || cp.period?.full === expectedPeriodFull) {
      if (!Array.isArray(cp.queriesCompleted)) {
        cp.queriesCompleted = [];
      }
      if (!Array.isArray(cp.axesCompleted)) {
        cp.axesCompleted = [];
      }
      return cp;
    }
    return null;
  } catch (err) {
    console.warn('[CheckpointStore] Error cargando checkpoint:', err);
    return null;
  }
}

export function saveCheckpoint(checkpoint: InvestigationCheckpoint): void {
  ensureDataDir();
  checkpoint.updatedAt = new Date().toISOString();
  fs.writeFileSync(CHECKPOINT_FILE, JSON.stringify(checkpoint, null, 2), 'utf-8');
}

export function recordAxisCheckpoint(
  period: { from: string; to: string; full: string },
  axisId: string,
  axisName: string,
  status: AxisStatus,
  resultText: string,
  sources: SourceReference[],
  meta?: { inputTokens?: number; outputTokens?: number; searchesCount?: number; retries?: number }
): void {
  const current = loadCheckpoint(period.full) || {
    period,
    queriesCompleted: [],
    axesCompleted: [],
    updatedAt: new Date().toISOString(),
  };

  if (!Array.isArray(current.axesCompleted)) {
    current.axesCompleted = [];
  }

  const existingIdx = current.axesCompleted.findIndex((a) => a.id === axisId);
  const item: AxisCheckpointItem = {
    id: axisId,
    name: axisName,
    status,
    resultText,
    sources,
    timestamp: new Date().toISOString(),
    inputTokens: meta?.inputTokens,
    outputTokens: meta?.outputTokens,
    searchesCount: meta?.searchesCount,
    retries: meta?.retries,
  };

  if (existingIdx >= 0) {
    current.axesCompleted[existingIdx] = item;
  } else {
    current.axesCompleted.push(item);
  }

  saveCheckpoint(current);
}

export function recordQueryCheckpoint(
  period: { from: string; to: string; full: string },
  queryIndex: number,
  query: string,
  resultText: string,
  sources: SourceReference[]
): void {
  const current = loadCheckpoint(period.full) || {
    period,
    queriesCompleted: [],
    axesCompleted: [],
    updatedAt: new Date().toISOString(),
  };

  const existingIdx = current.queriesCompleted.findIndex((q) => q.queryIndex === queryIndex);
  const item: QueryCheckpointItem = {
    queryIndex,
    query,
    resultText,
    sources,
    timestamp: new Date().toISOString(),
  };

  if (existingIdx >= 0) {
    current.queriesCompleted[existingIdx] = item;
  } else {
    current.queriesCompleted.push(item);
  }

  saveCheckpoint(current);
}

export function clearCheckpoint(): void {
  ensureDataDir();
  if (fs.existsSync(CHECKPOINT_FILE)) {
    try {
      fs.unlinkSync(CHECKPOINT_FILE);
    } catch (e) {
      console.warn('[CheckpointStore] Error limpiando checkpoint:', e);
    }
  }
}
