import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { StatusHero } from './components/StatusHero';
import { ReportsList } from './components/ReportsList';
import { ReportViewer } from './components/ReportViewer';
import { ConfigPanel } from './components/ConfigPanel';
import { DeploymentGuide } from './components/DeploymentGuide';
import { GenerationModal } from './components/GenerationModal';
import { PWAInstallBanner } from './components/PWAInstallBanner';
import { PushNotificationModal } from './components/PushNotificationModal';
import {
  SystemStatus,
  ReportSummary,
  Report,
  AppConfig,
  GenerationProgress,
} from './types';
import { getCachedAccessToken } from './services/googleAuth';

export default function App() {
  const [activeTab, setActiveTab] = useState<'reports' | 'config' | 'deploy'>('reports');
  const [status, setStatus] = useState<SystemStatus | null>(null);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [isLoadingReport, setIsLoadingReport] = useState(false);

  // Sync / Refresh States
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Push Modal State
  const [showPushModal, setShowPushModal] = useState(false);

  // Generation Modal State
  const [isGenerating, setIsGenerating] = useState(false);
  const [showGenerationModal, setShowGenerationModal] = useState(false);
  const [progress, setProgress] = useState<GenerationProgress>({
    phase: 'IDLE',
    percentage: 0,
    detail: 'Listo.',
    sourcesCount: 0,
  });

  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);

  const formatCurrentTime = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const loadSingleReport = useCallback(async (reportId: string) => {
    setIsLoadingReport(true);
    try {
      const res = await fetch(`/api/reports/${reportId}`);
      if (res.ok) {
        const fullReport: Report = await res.json();
        setSelectedReport(fullReport);
        setActiveTab('reports');

        // Update URL query cleanly so refreshing or sharing stays on this report
        const currentUrl = new URL(window.location.href);
        currentUrl.searchParams.set('report', reportId);
        window.history.replaceState({}, '', currentUrl.toString());
      }
    } catch (err) {
      console.error('Error loading single report:', err);
    } finally {
      setIsLoadingReport(false);
    }
  }, []);

  // Check URL parameters for direct report opening (e.g. from Push Notification click)
  const checkUrlDeepLink = useCallback(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const reportFromQuery = params.get('report');
      if (reportFromQuery) {
        loadSingleReport(reportFromQuery);
        return true;
      }
      // Check path /reports/radar-123
      const pathMatch = window.location.pathname.match(/\/reports\/([a-zA-Z0-9_-]+)/);
      if (pathMatch && pathMatch[1]) {
        loadSingleReport(pathMatch[1]);
        return true;
      }
    } catch (e) {
      console.warn('Error reading deep link:', e);
    }
    return false;
  }, [loadSingleReport]);

  // Start polling when generation is in progress
  const startPolling = useCallback(() => {
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch('/api/progress');
        if (res.ok) {
          const prog: GenerationProgress = await res.json();
          setProgress(prog);

          if (prog.phase === 'COMPLETADO' || prog.phase === 'ERROR') {
            if (pollingRef.current) clearInterval(pollingRef.current);
            setIsGenerating(false);

            // Refresh reports and status automatically
            fetch('/api/reports')
              .then((r) => r.json())
              .then((reps: ReportSummary[]) => {
                setReports(reps);
                if (prog.reportId) {
                  loadSingleReport(prog.reportId);
                } else if (reps.length > 0) {
                  loadSingleReport(reps[0].id);
                }
              });

            fetch('/api/status')
              .then((r) => r.json())
              .then(setStatus);

            setLastSyncTime(formatCurrentTime());
          }
        }
      } catch (e) {
        console.warn('Progress poll warning:', e);
      }
    }, 1200);
  }, [loadSingleReport]);

  // Synchronize with server (BOTÓN ↻ ACTUALIZAR) - DOES NOT generate new research
  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      const [statusRes, reportsRes, configRes, progressRes] = await Promise.all([
        fetch('/api/status'),
        fetch('/api/reports'),
        fetch('/api/config'),
        fetch('/api/progress'),
      ]);

      if (statusRes.ok) {
        const s: SystemStatus = await statusRes.json();
        setStatus(s);
        if (s.isRunning && !isGenerating) {
          setIsGenerating(true);
          setShowGenerationModal(true);
          startPolling();
        }
      }

      if (reportsRes.ok) {
        const r: ReportSummary[] = await reportsRes.json();
        setReports(r);
        // If current report is outdated or none selected, load the newest
        if (r.length > 0 && !selectedReport) {
          loadSingleReport(r[0].id);
        }
      }

      if (configRes.ok) {
        const c: AppConfig = await configRes.json();
        setConfig(c);
      }

      if (progressRes.ok) {
        const p: GenerationProgress = await progressRes.json();
        setProgress(p);
      }

      setLastSyncTime(formatCurrentTime());
    } catch (err) {
      console.error('Error refreshing data from server:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Initial load
  useEffect(() => {
    handleRefresh().then(() => {
      // Check if URL has a deep link like /?report=XYZ from push notification
      checkUrlDeepLink();
    });

    // Auto-update heartbeat: check state every 25s when idle
    heartbeatRef.current = setInterval(() => {
      if (!isGenerating) {
        fetch('/api/status')
          .then((r) => r.json())
          .then((s: SystemStatus) => {
            setStatus(s);
            if (s.isRunning) {
              setIsGenerating(true);
              setShowGenerationModal(true);
              startPolling();
            }
          })
          .catch(() => {});
      }
    }, 25000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [checkUrlDeepLink, startPolling, isGenerating]);

  // Trigger manual report generation ("GENERAR INFORME AHORA")
  const handleGenerateNow = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setShowGenerationModal(true);
    setProgress({
      phase: 'BUSCANDO_FUENTES',
      percentage: 10,
      detail: 'Iniciando investigación server-side con Gemini Grounding...',
      sourcesCount: 0,
    });

    try {
      const res = await fetch('/api/reports/generate', {
        method: 'POST',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo iniciar la investigación');
      }
      startPolling();
    } catch (err: any) {
      setProgress((prev) => ({
        ...prev,
        phase: 'ERROR',
        percentage: Math.min(prev.percentage || 15, 80),
        detail: 'Error al iniciar la investigación.',
        error: err?.message,
      }));
      setIsGenerating(false);
    }
  };

  const handleRetry = async () => {
    if (isGenerating) return;
    setIsGenerating(true);
    setShowGenerationModal(true);
    try {
      const res = await fetch('/api/reports/retry', { method: 'POST' });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'No se pudo reanudar');
      }
      startPolling();
    } catch (err: any) {
      setProgress((prev) => ({
        ...prev,
        phase: 'ERROR',
        percentage: Math.min(prev.percentage || 15, 80),
        error: err?.message,
      }));
      setIsGenerating(false);
    }
  };


  // Save config
  const handleSaveConfig = async (newConfig: AppConfig): Promise<boolean> => {
    try {
      const res = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newConfig),
      });
      if (res.ok) {
        const data = await res.json();
        setConfig(data.config);
        const statusRes = await fetch('/api/status');
        if (statusRes.ok) setStatus(await statusRes.json());
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Test email via Gmail API
  const handleTestEmail = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      const token = getCachedAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch('/api/gmail/test-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipientEmail: config?.recipientEmail,
          accessToken: token || undefined,
        }),
      });
      return await res.json();
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error de red' };
    }
  };

  // Resend email for specific report via Gmail API
  const handleResendEmail = async (
    reportId: string
  ): Promise<{
    success: boolean;
    error?: string;
    setupInstructionsRequired?: boolean;
    setupInstructionsUrl?: string;
  }> => {
    try {
      const token = getCachedAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/reports/${reportId}/resend-email`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ accessToken: token || undefined }),
      });
      const data = await res.json();

      if (data.emailStatus && selectedReport && selectedReport.id === reportId) {
        setSelectedReport({
          ...selectedReport,
          emailStatus: data.emailStatus,
        });
      }

      // Update reports list state too
      setReports((prev) =>
        prev.map((r) =>
          r.id === reportId
            ? {
                ...r,
                emailSent: data.success,
                emailStatus: data.emailStatus,
              }
            : r
        )
      );

      return {
        success: data.success,
        error: data.error,
        setupInstructionsRequired: data.setupInstructionsRequired,
        setupInstructionsUrl: data.setupInstructionsUrl,
      };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Error reenviando email' };
    }
  };

  // Scroll smoothly to report viewer
  const handleViewLatestReport = () => {
    if (selectedReport) {
      const el = document.getElementById('report-viewer-section');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth' });
      } else {
        setActiveTab('reports');
      }
    } else if (reports.length > 0) {
      loadSingleReport(reports[0].id);
    }
  };

  const currentNoveltiesCount = selectedReport
    ? (selectedReport.top5?.length || 0) +
      (selectedReport.newModels?.length || 0) +
      (selectedReport.openaiUpdates?.length || 0) +
      (selectedReport.claudeUpdates?.length || 0) +
      (selectedReport.skills?.length || 0)
    : 7;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-900 flex flex-col font-sans">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isAutomationActive={status?.isAutomationActive ?? true}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-5 sm:py-8">
        
        {/* PWA In-App Install Banner (hides when running standalone) */}
        <PWAInstallBanner />

        {/* TAB 1: RADAR & INFORMES */}
        {activeTab === 'reports' && (
          <div>
            <StatusHero
              status={status}
              onGenerateNow={handleGenerateNow}
              isGenerating={isGenerating}
              onRefresh={handleRefresh}
              isRefreshing={isRefreshing}
              lastSyncTime={lastSyncTime}
              onViewLatestReport={handleViewLatestReport}
              hasReport={Boolean(selectedReport || reports.length > 0)}
              onOpenPushModal={() => setShowPushModal(true)}
              noveltiesCount={currentNoveltiesCount}
            />

            {/* Selected Report Viewer Section */}
            {selectedReport ? (
              <div id="report-viewer-section">
                <ReportViewer
                  report={selectedReport}
                  onBack={() => {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  onResendEmail={handleResendEmail}
                />
              </div>
            ) : isLoadingReport ? (
              <div className="bg-white rounded-xl p-12 text-center border border-slate-200 mb-8">
                <p className="text-slate-500 text-sm">Cargando informe...</p>
              </div>
            ) : null}

            {/* Previous reports chronological archive */}
            <ReportsList
              reports={reports}
              onSelectReport={loadSingleReport}
              selectedReportId={selectedReport?.id}
            />
          </div>
        )}

        {/* TAB 2: CONFIGURACIÓN */}
        {activeTab === 'config' && (
          <ConfigPanel
            config={config}
            onSaveConfig={handleSaveConfig}
            onTestEmail={handleTestEmail}
          />
        )}

        {/* TAB 3: GUÍA DE DESPLIEGUE EN CLOUD RUN */}
        {activeTab === 'deploy' && <DeploymentGuide />}

      </main>

      {/* Generation Progress Modal */}
      <GenerationModal
        isOpen={showGenerationModal}
        onClose={() => setShowGenerationModal(false)}
        progress={progress}
        onViewReport={(repId) => {
          loadSingleReport(repId);
          setActiveTab('reports');
        }}
        onRetry={handleRetry}
      />

      {/* Push Notification Opt-in Modal */}
      <PushNotificationModal
        isOpen={showPushModal}
        onClose={() => setShowPushModal(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4">
          <p className="font-semibold text-slate-700">AI WEEKLY RADAR · PWA</p>
          <p className="mt-1">
            Sistema de Inteligencia Tecnológica en IA — Preparado para Google Cloud Run & Cloud Scheduler.
          </p>
          <p className="mt-0.5 text-slate-400">
            Sincronización multi-dispositivo · Compatible con iPhone, iPad, Android, Mac y Windows.
          </p>
        </div>
      </footer>
    </div>
  );
}
