import React, { useState } from 'react';
import {
  Play,
  Clock,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Shield,
  RefreshCw,
  FileText,
  Bell,
  Sparkles,
} from 'lucide-react';
import { SystemStatus } from '../types';

interface StatusHeroProps {
  status: SystemStatus | null;
  onGenerateNow: () => void;
  isGenerating: boolean;
  onRefresh: () => Promise<void>;
  isRefreshing: boolean;
  lastSyncTime: string | null;
  onViewLatestReport?: () => void;
  hasReport: boolean;
  onOpenPushModal: () => void;
  noveltiesCount?: number;
}

export const StatusHero: React.FC<StatusHeroProps> = ({
  status,
  onGenerateNow,
  isGenerating,
  onRefresh,
  isRefreshing,
  lastSyncTime,
  onViewLatestReport,
  hasReport,
  onOpenPushModal,
  noveltiesCount = 7,
}) => {
  const [justRefreshed, setJustRefreshed] = useState(false);

  const handleManualRefresh = async () => {
    await onRefresh();
    setJustRefreshed(true);
    setTimeout(() => setJustRefreshed(false), 2500);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return 'Sin ejecuciones previas';
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat('es-ES', {
        dateStyle: 'medium',
        timeStyle: 'short',
        timeZone: status?.timezone || 'Europe/Madrid',
      }).format(d);
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 sm:p-7 md:p-8 shadow-xs mb-8">
      {/* Top Header Block */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-100 text-emerald-800">
              <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse"></span>
              🟢 Automatización activa
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Google Cloud Run & Cloud Scheduler (Europe/Madrid)
            </span>
            <button
              onClick={onOpenPushModal}
              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 transition-colors"
              title="Configurar notificaciones push para iPhone / Android / Desktop"
            >
              <Bell className="w-3 h-3 text-sky-600" />
              <span>Notificaciones PWA</span>
            </button>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            AI WEEKLY RADAR
          </h1>
          <p className="mt-1 text-xs sm:text-sm md:text-base text-slate-600 max-w-2xl">
            Sistema de inteligencia tecnológica semanal sobre novedades mundiales en IA. Búsqueda y síntesis autónoma con Gemini y Google Search Grounding.
          </p>
        </div>

        {/* Action Buttons: Touch-friendly sizes */}
        <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 items-stretch lg:items-center">
          
          {/* BOTÓN VER INFORME */}
          {hasReport && onViewLatestReport && (
            <button
              onClick={onViewLatestReport}
              className="inline-flex items-center justify-center gap-2 px-5 py-3.5 min-h-[44px] rounded-lg text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 active:scale-[0.99] border border-slate-200 transition-all shadow-xs"
            >
              <FileText className="w-4 h-4 text-sky-600" />
              <span>VER INFORME</span>
            </button>
          )}

          {/* BOTÓN PRINCIPAL: GENERAR INFORME AHORA */}
          <button
            onClick={onGenerateNow}
            disabled={isGenerating || status?.isRunning}
            className={`inline-flex items-center justify-center gap-2.5 px-6 py-3.5 min-h-[44px] rounded-lg text-sm font-bold text-white shadow-md transition-all ${
              isGenerating || status?.isRunning
                ? 'bg-slate-400 cursor-not-allowed opacity-90'
                : 'bg-sky-600 hover:bg-sky-700 active:scale-[0.99] hover:shadow-lg'
            }`}
          >
            {isGenerating || status?.isRunning ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin text-white" />
                <span>Investigación en curso...</span>
              </>
            ) : (
              <>
                <Play className="w-5 h-5 fill-current text-white" />
                <span>GENERAR INFORME AHORA</span>
              </>
            )}
          </button>

          {/* BOTÓN ↻ ACTUALIZAR (SIN GENERAR NUEVA INVESTIGACIÓN) */}
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 px-4 py-3.5 min-h-[44px] rounded-lg text-sm font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 active:scale-[0.99] transition-all shadow-xs"
            title="Sincroniza el estado y los datos con el backend en la nube sin iniciar una nueva investigación"
          >
            <RefreshCw
              className={`w-4 h-4 text-slate-600 ${
                isRefreshing ? 'animate-spin text-sky-600' : ''
              }`}
            />
            <span>
              {isRefreshing
                ? 'Actualizando…'
                : justRefreshed
                ? 'Actualizado ahora'
                : '↻ ACTUALIZAR'}
            </span>
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-3 pb-1 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Sincronización multi-dispositivo activa (fuente única en la nube)</span>
        </div>
        {lastSyncTime && (
          <div className="text-slate-400">
            Última actualización: <strong className="text-slate-600">{lastSyncTime}</strong>
          </div>
        )}
      </div>

      {/* Grid de Métricas de Ejecución */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-5">
        
        {/* Último informe */}
        <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/70">
          <div className="flex items-center justify-between mb-1">
            <span className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Último informe</span>
            </span>
            <span className="text-[10px] font-bold bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded">
              {noveltiesCount}+ novedades
            </span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900 truncate">
            {formatDate(status?.lastRunAt)}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Duración: {status?.lastDurationSeconds || 0}s
          </div>
        </div>

        {/* Próximo informe */}
        <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/70">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Calendar className="w-3.5 h-3.5 text-sky-600" />
            <span>Próximo informe</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-sky-700 truncate">
            {status?.nextRunAt || 'Programado semanalmente'}
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            Zona: {status?.timezone || 'Europe/Madrid'}
          </div>
        </div>

        {/* Fuentes analizadas */}
        <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/70">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Search className="w-3.5 h-3.5 text-emerald-600" />
            <span>Fuentes analizadas</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900">
            {status?.lastSourcesCount || 0} fuentes
          </div>
          <div className="text-xs text-emerald-700 mt-0.5 font-medium">
            Google Search Grounding
          </div>
        </div>

        {/* Ejecución en Nube */}
        <div className="bg-slate-50 rounded-lg p-3.5 border border-slate-200/70">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
            <Shield className="w-3.5 h-3.5 text-indigo-600" />
            <span>Ejecución Server-Side</span>
          </div>
          <div className="text-sm sm:text-base font-bold text-slate-900">
            Cloud Run + Scheduler
          </div>
          <div className="text-xs text-slate-500 mt-0.5">
            PWA multi-dispositivo
          </div>
        </div>
      </div>

      {/* Alerta si la última ejecución se pausó o falló */}
      {status?.lastError && (
        <div className={`mt-5 p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs ${
          status.lastError.message.includes('Cuota') || status.lastError.message.includes('facturación')
            ? 'bg-red-50/90 border-red-200 text-red-950'
            : status.lastError.message.includes('Límite temporal') || status.lastError.message.includes('429')
            ? 'bg-amber-50/90 border-amber-200 text-amber-950'
            : 'bg-amber-50/90 border-amber-200 text-amber-950'
        }`}>
          <div className="flex items-start gap-3">
            <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${
              status.lastError.message.includes('Cuota') ? 'text-red-600' : 'text-amber-600'
            }`} />
            <div className="text-xs sm:text-sm">
              <span className={`font-bold ${status.lastError.message.includes('Cuota') ? 'text-red-900' : 'text-amber-900'}`}>
                {status.lastError.message.includes('Cuota') || status.lastError.message.includes('facturación')
                  ? 'Cuota de Gemini / Google Cloud:'
                  : status.lastError.message.includes('Límite temporal') || status.lastError.message.includes('429')
                  ? 'Límite de peticiones de Gemini (429):'
                  : status.lastError.message.includes('saturación') || status.lastError.message.includes('503')
                  ? 'Saturación temporal de Gemini (503):'
                  : 'Aviso de investigación:'}
              </span>{' '}
              <span className="text-slate-800">
                {status.lastError.message.replace(/\{"error":\{.*"message":"([^"]+)".*\}\}/, '$1')}
              </span>
              <div className="text-[11px] text-slate-500 mt-1">
                Los ejes completados están guardados en checkpoint. Al reintentar se continuará desde los ejes pendientes.
              </div>
            </div>
          </div>

          <button
            onClick={onGenerateNow}
            disabled={isGenerating || status?.isRunning}
            className={`self-end sm:self-center shrink-0 inline-flex items-center gap-1.5 px-4 py-2 text-white rounded-lg text-xs font-bold transition-all shadow-xs ${
              status.lastError.message.includes('Cuota')
                ? 'bg-red-600 hover:bg-red-700'
                : 'bg-amber-600 hover:bg-amber-700 active:scale-95'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>REINTENTAR</span>
          </button>
        </div>
      )}

    </div>
  );
};
