import { GoogleGenAI, GenerateContentParameters, GenerateContentResponse } from '@google/genai';
import { updateProgress, isCancellationRequested } from './storage.js';

// Centralized model definitions
export const PRIMARY_MODEL = 'gemini-3.8-flash';
export const FALLBACK_MODELS = ['gemini-flash-latest', 'gemini-3.1-flash-lite'];

export const MAX_CONCURRENT_AI_REQUESTS = 1;
export const INTER_REQUEST_DELAY_MS = 2500;

export interface GeminiCallResult {
  response: GenerateContentResponse;
  modelUsed: string;
  inputTokens: number;
  outputTokens: number;
  retryCount: number;
}

export interface RetryOptions {
  phaseLabel: string;
  maxRetriesPerModel?: number;
  initialBackoffMs?: number;
  tools?: any[];
}

// ----------------------------------------------------
// CENTRAL RATE LIMITER & REQUEST QUEUE (Server-Side)
// ----------------------------------------------------
class GeminiRequestQueue {
  private queue: Array<() => Promise<void>> = [];
  private activeCount = 0;
  private maxConcurrency = MAX_CONCURRENT_AI_REQUESTS;
  private lastRequestEndTime = 0;
  private interRequestDelayMs = INTER_REQUEST_DELAY_MS;

  constructor(maxConcurrency = 1, interRequestDelayMs = 2500) {
    this.maxConcurrency = maxConcurrency;
    this.interRequestDelayMs = interRequestDelayMs;
  }

  public enqueue<T>(task: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const res = await task();
          resolve(res);
        } catch (err) {
          reject(err);
        }
      });
      this.processNext();
    });
  }

  private async processNext() {
    if (this.activeCount >= this.maxConcurrency || this.queue.length === 0) {
      return;
    }
    const nextTask = this.queue.shift();
    if (!nextTask) return;

    this.activeCount++;
    const now = Date.now();
    const elapsedSinceLast = now - this.lastRequestEndTime;
    if (elapsedSinceLast < this.interRequestDelayMs) {
      await sleep(this.interRequestDelayMs - elapsedSinceLast);
    }

    try {
      await nextTask();
    } finally {
      this.lastRequestEndTime = Date.now();
      this.activeCount--;
      this.processNext();
    }
  }
}

export const geminiQueue = new GeminiRequestQueue(MAX_CONCURRENT_AI_REQUESTS, INTER_REQUEST_DELAY_MS);

// ----------------------------------------------------
// ERROR ANALYSIS: 429 vs 503 vs HARD QUOTA
// ----------------------------------------------------

export function isRateLimitError(error: any): boolean {
  if (!error) return false;
  const str = (typeof error === 'string' ? error : error?.message || JSON.stringify(error)).toLowerCase();
  return (
    str.includes('429') ||
    str.includes('resource_exhausted') ||
    str.includes('rate_limit') ||
    str.includes('ratelimit') ||
    str.includes('too many requests')
  );
}

export function isServiceUnavailableError(error: any): boolean {
  if (!error) return false;
  const str = (typeof error === 'string' ? error : error?.message || JSON.stringify(error)).toLowerCase();
  return (
    str.includes('503') ||
    str.includes('unavailable') ||
    str.includes('high demand') ||
    str.includes('temporarily overloaded') ||
    str.includes('econnreset') ||
    str.includes('etimedout') ||
    str.includes('timeout') ||
    str.includes('fetch failed') ||
    str.includes('socket hang up')
  );
}

export function isHardQuotaExhausted(error: any): boolean {
  if (!error) return false;
  const str = (typeof error === 'string' ? error : error?.message || JSON.stringify(error)).toLowerCase();
  return (
    str.includes('daily limit exceeded') ||
    str.includes('queries per day') ||
    str.includes('free tier limit exhausted') ||
    str.includes('billing is disabled') ||
    str.includes('billing_disabled') ||
    str.includes("quota metric 'queries' and limit 'queries per day'") ||
    str.includes('account has exceeded its quota limit') ||
    str.includes('check billing') ||
    str.includes('enable billing')
  );
}

export function isTransientError(error: any): boolean {
  return isRateLimitError(error) || isServiceUnavailableError(error);
}

export function extractRetryDelaySeconds(err: any): number | null {
  if (!err) return null;
  const raw = typeof err === 'string' ? err : err?.message ? err.message : JSON.stringify(err);

  // Match e.g. "retryDelay": "28s" or "retryDelay": 28 or "retryDelay": "28.5s"
  const delayMatch = raw.match(/"retryDelay":\s*["']?(\d+(?:\.\d+)?)s?["']?/i);
  if (delayMatch && delayMatch[1]) {
    const s = parseFloat(delayMatch[1]);
    if (!isNaN(s) && s > 0) return Math.ceil(s);
  }

  // Match HTTP header format: Retry-After: 30
  const afterMatch = raw.match(/retry-after:\s*(\d+)/i);
  if (afterMatch && afterMatch[1]) {
    const s = parseInt(afterMatch[1], 10);
    if (!isNaN(s) && s > 0) return s;
  }

  return null;
}

export function formatFriendlyErrorMessage(err: any): string {
  const raw = typeof err === 'string' ? err : err?.message || JSON.stringify(err);

  if (isHardQuotaExhausted(err)) {
    return 'Cuota de la cuenta o proyecto de Gemini alcanzada. Se ha superado el límite diario o la facturación no está configurada en Google Cloud / AI Studio.';
  }

  if (isRateLimitError(err)) {
    return 'Límite temporal de peticiones de la API de Gemini alcanzado (RPM/TPM). La investigación se reanuda automáticamente tras el tiempo de espera programado.';
  }

  if (isServiceUnavailableError(err)) {
    return 'El servicio de IA de Gemini está experimentando una alta demanda temporal a nivel mundial. Se han efectuado varios reintentos con modelos de respaldo. Pulsa REINTENTAR para continuar desde el punto guardado.';
  }

  if (raw.includes('API_KEY_INVALID') || raw.includes('PERMISSION_DENIED') || raw.includes('403')) {
    return 'GEMINI_API_KEY no válida o sin permisos suficientes. Revisa tu clave en la configuración de Google AI Studio.';
  }

  // Extract clean message from JSON wrapper if present
  try {
    const match = raw.match(/"message":\s*"([^"]+)"/);
    if (match && match[1]) {
      return match[1];
    }
  } catch {}

  return raw;
}

async function sleep(ms: number): Promise<void> {
  const step = 200;
  let elapsed = 0;
  while (elapsed < ms) {
    if (isCancellationRequested()) {
      throw new Error('INVESTIGATION_CANCELLED');
    }
    const toWait = Math.min(step, ms - elapsed);
    await new Promise((resolve) => setTimeout(resolve, toWait));
    elapsed += toWait;
  }
}

// ----------------------------------------------------
// RESILIENT CALL FUNCTION
// ----------------------------------------------------

export async function callGeminiWithResilience(
  ai: GoogleGenAI,
  preferredModel: string,
  params: Omit<GenerateContentParameters, 'model'>,
  options: RetryOptions
): Promise<GeminiCallResult> {
  // All calls must pass through the central single-concurrency queue
  return geminiQueue.enqueue(() =>
    executeCallWithResilience(ai, preferredModel, params, options)
  );
}

async function executeCallWithResilience(
  ai: GoogleGenAI,
  preferredModel: string,
  params: Omit<GenerateContentParameters, 'model'>,
  options: RetryOptions
): Promise<GeminiCallResult> {
  if (isCancellationRequested()) {
    throw new Error('INVESTIGATION_CANCELLED');
  }

  const maxRetriesPerModel = options.maxRetriesPerModel || 5;

  // Build model candidate list: preferred model -> primary model -> fallbacks
  const modelCandidates = Array.from(
    new Set([preferredModel, PRIMARY_MODEL, ...FALLBACK_MODELS])
  );

  let lastError: any = null;
  let rateLimitAttempt = 0;
  const maxRateLimitAttempts = 3;

  for (let mIdx = 0; mIdx < modelCandidates.length; mIdx++) {
    const currentModel = modelCandidates[mIdx];
    const isFallback = mIdx > 0;

    if (isFallback) {
      console.log(
        `[Gemini Resilience] 🔄 Activando modelo de respaldo "${currentModel}" para la fase: ${options.phaseLabel}`
      );
      updateProgress({
        isFallbackActive: true,
        activeModel: currentModel,
        detail: `Modelo principal con alta demanda. Continuando con modelo de respaldo (${currentModel})...`,
      });
      await sleep(1500);
    }

    for (let attempt = 1; attempt <= maxRetriesPerModel; attempt++) {
      if (isCancellationRequested()) {
        throw new Error('INVESTIGATION_CANCELLED');
      }

      try {
        console.log(
          `[Gemini Call] Modelo: ${currentModel} | Fase: ${options.phaseLabel} | Intento: ${attempt}/${maxRetriesPerModel}`
        );

        const response = await ai.models.generateContent({
          ...params,
          model: currentModel,
        });

        // Extract usage metadata if provided by Gemini API
        const inputTokens = response.usageMetadata?.promptTokenCount ?? 0;
        const outputTokens = response.usageMetadata?.candidatesTokenCount ?? 0;

        // Successful call! Clean any transient rate limit / retry flags
        updateProgress({
          isRetrying: false,
          isRateLimited: false,
          rateLimitCountdownSeconds: 0,
          rateLimitResumeAt: null,
          activeModel: currentModel,
        });

        return {
          response,
          modelUsed: currentModel,
          inputTokens,
          outputTokens,
          retryCount: rateLimitAttempt + (attempt - 1),
        };
      } catch (err: any) {
        if (err?.message === 'INVESTIGATION_CANCELLED') {
          throw err;
        }
        lastError = err;
        const errSummary = err?.message ? err.message.substring(0, 160) : String(err);
        console.warn(
          `[Gemini Error Caught] Modelo "${currentModel}" | Fase: ${options.phaseLabel} | Error: ${errSummary}`
        );

        // ----------------------------------------------------
        // 1. CHECK HARD QUOTA (Daily limit exhausted, Billing disabled)
        // ----------------------------------------------------
        if (isHardQuotaExhausted(err)) {
          const quotaMsg =
            'Cuota de Gemini agotada o facturación no habilitada en Google Cloud / AI Studio. Revisa los límites de tu cuenta.';
          updateProgress({
            status: 'QUOTA_EXHAUSTED',
            isQuotaExhausted: true,
            isRateLimited: false,
            rateLimitCountdownSeconds: 0,
            rateLimitResumeAt: null,
            detail: quotaMsg,
            error: quotaMsg,
          });
          throw new Error(quotaMsg);
        }

        // ----------------------------------------------------
        // 2. CHECK 429 RESOURCE_EXHAUSTED / RATE LIMIT
        // ----------------------------------------------------
        if (isRateLimitError(err)) {
          rateLimitAttempt++;
          console.warn(
            `[Gemini 429 Rate Limit] Petición temporalmente limitada (Intento ${rateLimitAttempt}/${maxRateLimitAttempts}). NO cambiando de modelo para evitar cascadas.`
          );

          if (rateLimitAttempt > maxRateLimitAttempts) {
            console.error('[Gemini 429] Agotados los reintentos de espera para límite de peticiones.');
            const friendly = formatFriendlyErrorMessage(err);
            updateProgress({
              status: 'RATE_LIMITED',
              isRateLimited: true,
              detail: `${friendly} Pulsa REINTENTAR para continuar desde el punto guardado.`,
              error: friendly,
              canResume: true,
            });
            throw new Error(friendly);
          }

          // Determine wait time: check for API retryDelay / Retry-After or use ordered backoff
          const apiDelaySeconds = extractRetryDelaySeconds(err);
          const fallbackBackoffSeconds = [30, 60, 120][rateLimitAttempt - 1] || 120;
          const jitterSeconds = Math.floor(Math.random() * 5) - 2; // ±2s jitter
          const waitSeconds = Math.max(10, (apiDelaySeconds || fallbackBackoffSeconds) + jitterSeconds);

          const targetResumeTime = new Date(Date.now() + waitSeconds * 1000).toISOString();
          console.log(
            `[Gemini 429 Cooldown] Pausando durante ${waitSeconds}s (hasta ${targetResumeTime}). Cuenta atrás en curso...`
          );

          updateProgress({
            status: 'RATE_LIMITED',
            isRateLimited: true,
            isRetrying: true,
            rateLimitCountdownSeconds: waitSeconds,
            rateLimitResumeAt: targetResumeTime,
            detail: `Límite temporal de la API alcanzado. Reintentando en: ${waitSeconds} s...`,
          });

          // Second-by-second countdown for the UI
          for (let secLeft = waitSeconds; secLeft > 0; secLeft--) {
            updateProgress({
              rateLimitCountdownSeconds: secLeft,
              detail: `Límite temporal de peticiones alcanzado. Reintentando en: ${secLeft} s...`,
            });
            await sleep(1000);
          }

          // Countdown complete: Automatically resume!
          console.log('[Gemini 429 Cooldown Finished] Reanudando investigación automáticamente...');
          updateProgress({
            detail: 'Reanudando investigación automáticamente...',
            isRateLimited: false,
            rateLimitCountdownSeconds: 0,
            rateLimitResumeAt: null,
            status: 'RUNNING',
          });

          // Retry on the SAME model (do not switch models on 429!)
          continue;
        }

        // ----------------------------------------------------
        // 3. CHECK 503 UNAVAILABLE / TEMPORARY SERVER OVERLOAD
        // ----------------------------------------------------
        if (isServiceUnavailableError(err)) {
          console.warn(`[Gemini 503 Unavailable] Modelo "${currentModel}" temporalmente saturado.`);

          if (attempt < maxRetriesPerModel) {
            const backoffSteps = [0, 2000, 5000, 10000, 20000];
            const baseMs = backoffSteps[attempt] || 15000;
            const jitterMs = Math.floor(Math.random() * 1200) - 600;
            const waitMs = Math.max(1000, baseMs + jitterMs);

            updateProgress({
              isRetrying: true,
              retryAttempt: attempt,
              maxRetries: maxRetriesPerModel,
              activeModel: currentModel,
              detail: `Servicio de IA con alta demanda temporal. Reintentando en ${Math.round(waitMs / 1000)}s... (Intento ${attempt}/${maxRetriesPerModel})`,
            });

            await sleep(waitMs);
            continue;
          }

          // If reached max retries on this model for 503, break inner loop to try fallback model
          console.log(
            `[Gemini 503 Fallback Trigger] Intentos agotados en "${currentModel}". Buscando modelo alternativo disponible...`
          );
          break;
        }

        // ----------------------------------------------------
        // 4. NON-TRANSIENT ERRORS (e.g. auth, bad request)
        // ----------------------------------------------------
        console.error(`[Gemini Non-Transient Error]:`, errSummary);
        break;
      }
    }
  }

  // If all models and retries exhausted
  const friendlyMsg = formatFriendlyErrorMessage(lastError);
  console.error('[Gemini Resilience Final Failure] Todos los modelos y reintentos agotados:', friendlyMsg);
  throw new Error(friendlyMsg);
}
