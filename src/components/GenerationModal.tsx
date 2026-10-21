import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Layers,
  Database,
  Mail,
  FileText,
  AlertTriangle,
  ExternalLink,
  X,
  Loader2,
  RefreshCw,
  Cpu,
  Sparkles,
  ShieldAlert,
  Flame,
} from 'lucide-react';
import { GenerationProgress, InvestigationAxisState } from '../types';

interface GenerationModalProps {
  isOpen: boolean;
  onClose: () => void;
  progress: GenerationProgress;
  onViewReport: (reportId: string) => void;
  onRetry?: () => void;
}

const DEFAULT_7_AXES = [
  { id: 'openai', name: 'OpenAI / GPT / Codex' },
  { id: 'claude', name: 'Claude / Anthropic / Skills' },
  { id: 'gemini', name: 'Gemini / Google' },
  { id: 'models', name: 'Nuevos modelos de IA' },
  { id: 'agents', name: 'Agentes / MCP' },
  { id: 'vibecoding', name: 'Vibe Coding / Desarrollo asistido' },
  { id: 'education', name: 'Educación / investigación / usos' },
];

export const GenerationModal: React.FC<GenerationModalProps> = ({
  isOpen,
  onClose,
  progress,
  onViewReport,
  onRetry,
}) => {
  if (!isOpen) return null;

  const isCompleted = progress.phase === 'COMPLETADO' || progress.status === 'SUCCESS';
  const isError = progress.phase === 'ERROR' || progress.status === 'ERROR';
  const isRateLimited = Boolean(
    progress.isRateLimited ||
    progress.status === 'RATE_LIMITED' ||
    (progress.rateLimitCountdownSeconds && progress.rateLimitCountdownSeconds > 0)
  );
  const isQuotaExhausted = Boolean(progress.isQuotaExhausted || progress.status === 'QUOTA_EXHAUSTED');
  const isRetrying = Boolean(progress.isRetrying && !isRateLimited);
  const isFallback = Boolean(progress.isFallbackActive);

  // Map axes from progress or default to canonical 7
  const axesList = DEFAULT_7_AXES.map((def) => {
    const live = progress.axes?.find((a) => a.id === def.id);
    return {
      id: def.id,
      name: def.name,
      status: live?.status || (isCompleted ? 'COMPLETED' : 'PENDING'),
      sourcesCount: live?.sourcesCount,
      error: live?.error,
    };
  });

  const completedCount =
    progress.completedAxesCount !== undefined
      ? progress.completedAxesCount
      : axesList.filter((a) => a.status === 'COMPLETED').length;
  const totalCount = progress.totalAxesCount || DEFAULT_7_AXES.length;

  // Real percentage: NEVER show 100% unless isCompleted!
  const displayPercentage = isCompleted
    ? 100
    : Math.min(95, Math.max(8, progress.percentage || 10));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full flex items-center justify-center ${
                isCompleted
                  ? 'bg-emerald-100 text-emerald-700'
                  : isQuotaExhausted
                  ? 'bg-red-100 text-red-700'
                  : isRateLimited
                  ? 'bg-amber-100 text-amber-700'
                  : isError
                  ? 'bg-amber-100 text-amber-700'
                  : isRetrying
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-sky-100 text-sky-700'
              }`}
            >
              {isCompleted ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : isQuotaExhausted ? (
                <ShieldAlert className="w-6 h-6" />
              ) : isRateLimited ? (
                <Clock className="w-6 h-6 animate-pulse text-amber-600" />
              ) : isError ? (
                <AlertTriangle className="w-6 h-6" />
              ) : isRetrying ? (
                <RefreshCw className="w-6 h-6 animate-spin text-amber-600" />
              ) : (
                <Loader2 className="w-6 h-6 animate-spin" />
              )}
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                {isCompleted
                  ? 'Informe generado correctamente'
                  : isQuotaExhausted
                  ? 'Cuota de Gemini agotada'
                  : isRateLimited
                  ? 'Límite temporal alcanzado'
                  : isError
                  ? 'Investigación pausada'
                  : isRetrying
                  ? 'Reintentando llamada a Gemini'
                  : 'Investigación en curso...'}
              </h2>
              <p className="text-xs text-slate-500">
                AI Weekly Radar · Ejes completados: <strong className="text-slate-800">{completedCount} de {totalCount}</strong>
              </p>
            </div>
          </div>

          {(isCompleted || isError || isQuotaExhausted) && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
              title="Cerrar ventana (la investigación seguirá en segundo plano si está activa)"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* 1. Rate Limit Countdown Banner */}
        {isRateLimited && (
          <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs shadow-2xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-900 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-amber-600 animate-spin" />
                Límite de peticiones de la API de Gemini (RPM/TPM)
              </span>
              {progress.rateLimitCountdownSeconds !== undefined && progress.rateLimitCountdownSeconds > 0 && (
                <span className="px-2 py-0.5 font-mono text-sm font-extrabold bg-amber-200 text-amber-900 rounded-md">
                  {progress.rateLimitCountdownSeconds}s
                </span>
              )}
            </div>
            <p className="text-slate-700 leading-relaxed">
              {progress.rateLimitCountdownSeconds && progress.rateLimitCountdownSeconds > 0
                ? `Pausando llamadas para respetar la cuota de peticiones. Reintentando en: ${progress.rateLimitCountdownSeconds} s...`
                : 'Reanudando investigación automáticamente...'}
            </p>
            <div className="text-[11px] text-amber-800/80 font-medium">
              ✅ Todos los ejes anteriores están a salvo en checkpoint. La ejecución continuará de forma autónoma.
            </div>
          </div>
        )}

        {/* 2. Hard Quota Exhausted Banner */}
        {isQuotaExhausted && (
          <div className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-red-950 text-xs shadow-2xs space-y-2">
            <div className="font-bold text-red-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              Cuota de la cuenta agotada en Google Cloud / AI Studio
            </div>
            <p className="text-red-900 leading-relaxed">
              Se ha alcanzado el límite diario de consultas (Queries per day) o la facturación del proyecto no está activa. Revisa tu proyecto en Google Cloud Console o Google AI Studio para ampliar cuota.
            </p>
            <div className="text-[11px] text-slate-600 font-medium">
              Progreso guardado: {completedCount} de {totalCount} ejes listos en checkpoint.
            </div>
          </div>
        )}

        {/* 3. Fallback Model Alert Badge */}
        {isFallback && !isCompleted && !isError && (
          <div className="mt-3 p-2.5 rounded-lg bg-sky-50 border border-sky-200 text-sky-900 text-xs flex items-center gap-2">
            <Cpu className="w-4 h-4 text-sky-600 shrink-0" />
            <div>
              <strong>Modelo de respaldo activo:</strong> Continuando con{' '}
              <span className="font-mono font-bold text-sky-700">{progress.activeModel || 'gemini-flash-latest'}</span>.
            </div>
          </div>
        )}

        {/* Progress Bar (Real, Never 100% unless completed) */}
        <div className="mt-5 mb-5">
          <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
            <span className="truncate max-w-[85%]">{progress.detail || 'Procesando investigación...'}</span>
            <span className="text-sky-700 shrink-0 font-mono font-bold">{displayPercentage}%</span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className={`h-2.5 rounded-full transition-all duration-500 ${
                isCompleted
                  ? 'bg-emerald-600'
                  : isQuotaExhausted
                  ? 'bg-red-600'
                  : isRateLimited
                  ? 'bg-amber-500'
                  : isError
                  ? 'bg-amber-600'
                  : 'bg-sky-600'
              }`}
              style={{ width: `${displayPercentage}%` }}
            />
          </div>
          <div className="text-[11px] text-slate-500 mt-1.5 flex justify-between">
            <span>Ejes completados: <strong className="text-slate-700">{completedCount} de {totalCount}</strong></span>
            <span className="text-emerald-700 font-medium">Checkpoint persistente activo</span>
          </div>
        </div>

        {/* 7 Canonical Axes List */}
        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
          <div className="text-[11px] uppercase tracking-wider font-bold text-slate-400 mb-1">
            Ejes de Investigación (Ejecución Secuencial):
          </div>
          {axesList.map((axis, index) => {
            const isDone = axis.status === 'COMPLETED';
            const isRunning = axis.status === 'RUNNING';
            const isAxisError = axis.status === 'ERROR';

            return (
              <div
                key={axis.id}
                className={`flex items-center justify-between p-2.5 rounded-lg text-xs sm:text-sm transition-all border ${
                  isRunning
                    ? 'bg-sky-50 text-sky-900 font-bold border-sky-300 shadow-2xs'
                    : isDone
                    ? 'bg-slate-50/80 text-slate-800 font-medium border-slate-200/80'
                    : isAxisError
                    ? 'bg-amber-50 text-amber-900 font-semibold border-amber-300'
                    : 'bg-white text-slate-400 border-slate-100 opacity-70'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <div className="shrink-0">
                    {isDone ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : isRunning ? (
                      <Loader2 className="w-4 h-4 text-sky-600 animate-spin" />
                    ) : isAxisError ? (
                      <AlertTriangle className="w-4 h-4 text-amber-600" />
                    ) : (
                      <Clock className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <span className="truncate">
                    {index + 1}. {axis.name}
                  </span>
                </div>

                <div className="shrink-0 text-[11px] font-semibold pl-2">
                  {isDone ? (
                    <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      Completado
                    </span>
                  ) : isRunning ? (
                    <span className="text-sky-700 bg-sky-100 px-2 py-0.5 rounded animate-pulse">
                      Investigando…
                    </span>
                  ) : isAxisError ? (
                    <span className="text-amber-700 bg-amber-100 px-2 py-0.5 rounded">
                      Reintentando
                    </span>
                  ) : (
                    <span className="text-slate-400">Pendiente</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Completed Footer */}
        {isCompleted && (
          <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-600 text-center sm:text-left">
              <div>
                <strong>Fuentes analizadas:</strong> {progress.sourcesCount || 28}+
              </div>
              <div className="text-emerald-700 font-medium mt-0.5">
                Informe finalizado y listo para consulta o envío por email.
              </div>
            </div>

            <div className="flex gap-2 w-full sm:w-auto">
              <button
                onClick={onClose}
                className="flex-1 sm:flex-none px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cerrar
              </button>
              {progress.reportId && (
                <button
                  onClick={() => {
                    onViewReport(progress.reportId!);
                    onClose();
                  }}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
                >
                  <span>Abrir Informe</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Error / Paused Footer with REINTENTAR Button */}
        {isError && !isRateLimited && (
          <div className="mt-6 pt-5 border-t border-slate-100 space-y-3">
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-950">
              <div className="font-bold flex items-center gap-1.5 mb-1 text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Investigación en pausa</span>
              </div>
              <p className="leading-relaxed">
                {progress.error ||
                  'Se ha alcanzado un límite o saturación temporal. Todos los ejes terminados están a salvo en checkpoint.'}
              </p>
            </div>

            <div className="flex items-center justify-between gap-2 pt-1">
              <span className="text-[11px] text-slate-500">
                Pulsa REINTENTAR para continuar desde los ejes pendientes ({completedCount}/{totalCount} ya guardados).
              </span>
              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Cerrar
                </button>
                {onRetry && (
                  <button
                    onClick={onRetry}
                    className="inline-flex items-center gap-1.5 px-5 py-2 bg-sky-600 hover:bg-sky-700 active:scale-95 text-white rounded-lg text-xs font-bold shadow-md transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>REINTENTAR</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
