import React, { useState, useEffect } from 'react';
import {
  Settings,
  Mail,
  Calendar,
  Layers,
  Save,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Send,
  Cpu,
  ExternalLink,
  LogOut,
  ShieldCheck,
  Info,
} from 'lucide-react';
import { AppConfig, GmailConfig } from '../types';
import {
  connectGmailOAuth,
  getCachedAccessToken,
  disconnectGoogleAuth,
} from '../services/googleAuth';

interface ConfigPanelProps {
  config: AppConfig | null;
  onSaveConfig: (updated: AppConfig) => Promise<boolean>;
  onTestEmail: () => Promise<{ success: boolean; error?: string }>;
}

export const ConfigPanel: React.FC<ConfigPanelProps> = ({
  config,
  onSaveConfig,
}) => {
  const [formData, setFormData] = useState<AppConfig | null>(config);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Gmail specific state
  const [gmailConfig, setGmailConfig] = useState<GmailConfig | null>(
    config?.gmailConfig || null
  );
  const [isConnectingGmail, setIsConnectingGmail] = useState(false);
  const [isTestingGmail, setIsTestingGmail] = useState(false);
  const [emailFeedback, setEmailFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
    actionUrl?: string;
    actionLabel?: string;
  } | null>(null);

  const fetchGmailStatus = async () => {
    try {
      const res = await fetch('/api/gmail/status');
      if (res.ok) {
        const data: GmailConfig = await res.json();
        setGmailConfig(data);
      }
    } catch (e) {
      console.warn('Error fetching Gmail status:', e);
    }
  };

  useEffect(() => {
    if (config) {
      setFormData(config);
      if (config.gmailConfig) {
        setGmailConfig(config.gmailConfig);
      }
    }
    fetchGmailStatus();
  }, [config]);

  if (!formData) {
    return (
      <div className="bg-white rounded-xl p-8 border border-slate-200 text-center">
        <RefreshCw className="w-6 h-6 animate-spin mx-auto text-sky-600 mb-2" />
        <p className="text-sm text-slate-600">Cargando configuración...</p>
      </div>
    );
  }

  const handleCategoryToggle = (key: keyof AppConfig['activeCategories']) => {
    setFormData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        activeCategories: {
          ...prev.activeCategories,
          [key]: !prev.activeCategories[key],
        },
      };
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    try {
      const ok = await onSaveConfig(formData);
      if (ok) {
        setMessage({ type: 'success', text: 'Configuración guardada correctamente.' });
        fetchGmailStatus();
      } else {
        setMessage({ type: 'error', text: 'Error al guardar la configuración.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err?.message || 'Error guardando datos' });
    } finally {
      setIsSaving(false);
    }
  };

  // ----------------------------------------------------
  // GMAIL OAUTH FLOW
  // ----------------------------------------------------
  const handleConnectGmail = async () => {
    setIsConnectingGmail(true);
    setEmailFeedback(null);
    try {
      const { email, accessToken } = await connectGmailOAuth();

      // Send token and email to server for secure validation and server-side storage
      const res = await fetch('/api/gmail/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ email, accessToken }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Error al autorizar la cuenta con el servidor');
      }

      setGmailConfig((prev) => ({
        ...(prev || {
          configured: false,
          senderName: 'AI Weekly Radar',
          recipientEmail: formData.recipientEmail,
        }),
        connected: true,
        configured: data.configured || false,
        senderEmail: data.senderEmail || email,
      }));

      setEmailFeedback({
        type: 'success',
        text: '🟢 Cuenta de Gmail autorizada. Realiza ahora un envío de prueba para comprobar la entrega real.',
      });
    } catch (err: any) {
      console.error('Error connecting Gmail:', err);
      // Friendly message if user closed popup
      if (err?.code === 'auth/popup-closed-by-user') {
        setEmailFeedback({
          type: 'error',
          text: 'Se canceló la ventana de inicio de sesión de Google.',
        });
      } else {
        setEmailFeedback({
          type: 'error',
          text: err?.message || 'Fallo durante la autenticación OAuth con Gmail.',
        });
      }
    } finally {
      setIsConnectingGmail(false);
    }
  };

  const handleDisconnectGmail = async () => {
    try {
      await disconnectGoogleAuth();
      await fetch('/api/gmail/disconnect', { method: 'POST' });
      setGmailConfig((prev) =>
        prev
          ? {
              ...prev,
              connected: false,
              configured: false,
              senderEmail: '',
            }
          : null
      );
      setEmailFeedback({
        type: 'success',
        text: 'Cuenta de Gmail desconectada.',
      });
    } catch (e) {
      console.warn('Error disconnecting:', e);
    }
  };

  const handleTestEmailClick = async () => {
    setIsTestingGmail(true);
    setEmailFeedback(null);
    try {
      const inMemoryToken = getCachedAccessToken();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (inMemoryToken) {
        headers['Authorization'] = `Bearer ${inMemoryToken}`;
      }

      const res = await fetch('/api/gmail/test-email', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          recipientEmail: formData.recipientEmail,
          accessToken: inMemoryToken || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setEmailFeedback({
          type: 'success',
          text: '✅ Email enviado correctamente.',
        });
        setGmailConfig((prev) =>
          prev
            ? {
                ...prev,
                configured: true,
                lastTestSentAt: new Date().toISOString(),
                lastTestStatus: 'SUCCESS',
                lastTestError: undefined,
              }
            : null
        );
      } else {
        // If Google Cloud Console configuration is required (e.g. Gmail API needs enablement)
        if (data.setupInstructionsRequired) {
          setEmailFeedback({
            type: 'error',
            text: `${data.error} (Proyecto Google Cloud: ${gmailConfig?.cloudProjectId || 'gen-lang-client-0800225031'})`,
            actionUrl:
              data.setupInstructionsUrl ||
              'https://console.cloud.google.com/apis/library/gmail.googleapis.com',
            actionLabel: 'Habilitar Gmail API en Google Cloud Console',
          });
        } else {
          setEmailFeedback({
            type: 'error',
            text: `Error al enviar email de prueba: ${data.error || 'Fallo en Gmail API'}`,
          });
        }
      }
    } catch (err: any) {
      setEmailFeedback({
        type: 'error',
        text: err?.message || 'Error al conectar con el servidor para el envío de prueba.',
      });
    } finally {
      setIsTestingGmail(false);
    }
  };

  const isConnected = Boolean(gmailConfig?.connected && gmailConfig?.senderEmail);
  const isConfigured = Boolean(isConnected && gmailConfig?.configured);

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8 mb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-slate-100 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
            <Settings className="w-6 h-6 text-sky-600" />
            <span>Configuración de AI Weekly Radar</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Parámetros de investigación, horario de Google Cloud Scheduler y despacho por Gmail
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-sky-700 text-white rounded-lg text-xs sm:text-sm font-bold shadow-xs transition-colors"
        >
          {isSaving ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          <span>Guardar Cambios</span>
        </button>
      </div>

      {message && (
        <div
          className={`mt-4 p-4 rounded-lg text-xs sm:text-sm flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-red-50 text-red-900 border border-red-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      <form onSubmit={handleSave} className="mt-8 space-y-10">
        
        {/* 1. HORARIO Y AUTOMATIZACIÓN EN NUBE */}
        <section>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
            <Calendar className="w-4 h-4 text-sky-600" />
            <span>1. Horario y Programación Automática (Google Cloud Scheduler)</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Día de la semana
              </label>
              <select
                value={formData.scheduleDay}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scheduleDay: e.target.value as any,
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white"
              >
                <option value="Monday">Lunes (Monday)</option>
                <option value="Tuesday">Martes (Tuesday)</option>
                <option value="Wednesday">Miércoles (Wednesday)</option>
                <option value="Thursday">Jueves (Thursday)</option>
                <option value="Friday">Viernes (Friday)</option>
                <option value="Saturday">Sábado (Saturday)</option>
                <option value="Sunday">Domingo (Sunday)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Hora de ejecución
              </label>
              <select
                value={formData.scheduleHour}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    scheduleHour: parseInt(e.target.value, 10),
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white"
              >
                {Array.from({ length: 24 }).map((_, h) => (
                  <option key={h} value={h}>
                    {String(h).padStart(2, '0')}:00 hrs
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Zona Horaria
              </label>
              <input
                type="text"
                value={formData.timezone}
                onChange={(e) =>
                  setFormData({ ...formData, timezone: e.target.value })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-slate-50"
                placeholder="Europe/Madrid"
              />
              <span className="text-[11px] text-slate-500">Por defecto: Europe/Madrid</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Token Secreto de Scheduler
              </label>
              <input
                type="text"
                value={formData.schedulerSecret}
                onChange={(e) =>
                  setFormData({ ...formData, schedulerSecret: e.target.value })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm font-mono"
                placeholder="Token Bearer"
              />
              <span className="text-[11px] text-slate-500">Protege POST /api/weekly-report</span>
            </div>
          </div>
        </section>

        {/* 2. MOTOR Y PROFUNDIDAD DE INVESTIGACIÓN */}
        <section>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-4 border-b border-slate-100 pb-2">
            <Cpu className="w-4 h-4 text-indigo-600" />
            <span>2. Modelo Gemini y Profundidad de Rastreo</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modelo Gemini Principal
              </label>
              <select
                value={formData.modelName}
                onChange={(e) =>
                  setFormData({ ...formData, modelName: e.target.value })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white font-mono"
              >
                <option value="gemini-3.8-flash">gemini-3.8-flash (Recomendado, veloz con Search Grounding)</option>
                <option value="gemini-flash-latest">gemini-flash-latest</option>
                <option value="gemini-3.1-flash-lite">gemini-3.1-flash-lite (Cost-efficient)</option>
                <option value="gemini-4-argon">gemini-4-argon (Razonamiento extremo)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Modo de Investigación
              </label>
              <select
                value={formData.researchDepth}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    researchDepth: e.target.value as any,
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white"
              >
                <option value="RAPIDO">RÁPIDO (Rastreo ágil de los ejes centrales)</option>
                <option value="NORMAL">NORMAL (Equilibrio óptimo: 7 ejes y verificación)</option>
                <option value="PROFUNDO">PROFUNDO (Rastreo exhaustivo multieje y papers)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nivel Mínimo de Importancia
              </label>
              <select
                value={formData.minImportance}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    minImportance: parseInt(e.target.value, 10),
                  })
                }
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white"
              >
                <option value={3}>★★★☆☆ (Interesante hacia arriba - Filtra ruido)</option>
                <option value={4}>★★★★☆ (Muy Importante y Crítica únicamente)</option>
                <option value={5}>★★★★★ (Solo Novedades Críticas)</option>
              </select>
            </div>
          </div>
        </section>

        {/* 3. CATEGORÍAS ACTIVAS */}
        <section>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 mb-2 border-b border-slate-100 pb-2">
            <Layers className="w-4 h-4 text-sky-600" />
            <span>3. Categorías y Ejes Temáticos Activos</span>
          </h3>
          <p className="text-xs text-slate-500 mb-4">
            Selecciona qué temas prioritarios debe investigar el analista en cada informe semanal
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {[
              { key: 'models', label: 'Modelos' },
              { key: 'openai', label: 'OpenAI / GPT' },
              { key: 'codex', label: 'Codex' },
              { key: 'claude', label: 'Claude' },
              { key: 'claudeSkills', label: 'Claude Skills' },
              { key: 'gptSkills', label: 'GPT/Codex Skills' },
              { key: 'gemini', label: 'Gemini / Google' },
              { key: 'agents', label: 'Agentes y Automatización' },
              { key: 'mcp', label: 'Model Context Protocol (MCP)' },
              { key: 'vibeCoding', label: 'Vibe Coding' },
              { key: 'education', label: 'Educación & Docencia' },
              { key: 'research', label: 'Investigación Científica' },
              { key: 'tools', label: 'Herramientas Prácticas' },
            ].map(({ key, label }) => {
              const active = formData.activeCategories[key as keyof AppConfig['activeCategories']];
              return (
                <label
                  key={key}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border cursor-pointer select-none transition-all ${
                    active
                      ? 'bg-sky-50/70 border-sky-300 text-sky-950 font-semibold'
                      : 'bg-slate-50 border-slate-200 text-slate-500 opacity-70'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    onChange={() =>
                      handleCategoryToggle(key as keyof AppConfig['activeCategories'])
                    }
                    className="rounded text-sky-600 focus:ring-sky-500 w-4 h-4"
                  />
                  <span className="text-xs">{label}</span>
                </label>
              );
            })}
          </div>
        </section>

        {/* 4. INTEGRACIÓN SEGURA CON GMAIL (OAUTH 2.0) */}
        <section>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 border-b border-slate-100 pb-2">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-600" />
              <span>4. Despacho Automático por Gmail (OAuth 2.0)</span>
            </h3>

            <div>
              {isConfigured ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  🟢 Gmail conectado
                </span>
              ) : isConnected ? (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-800 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  🟢 Gmail conectado (Test pendiente)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-3 py-1 rounded-full border border-slate-200">
                  No conectado
                </span>
              )}
            </div>
          </div>

          <p className="text-xs text-slate-500 mb-4">
            Envía el informe semanal automáticamente desde tu cuenta de Gmail mediante la API oficial de Google, sin contraseñas en texto claro ni servidores de terceros.
          </p>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-5 sm:p-6">
            
            {/* Si NO está conectado: botón CONECTAR CON GMAIL */}
            {!isConnected ? (
              <div className="text-center py-6">
                <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center mx-auto mb-3">
                  <Mail className="w-6 h-6" />
                </div>
                <h4 className="text-sm sm:text-base font-bold text-slate-900 mb-1">
                  Conectar Gmail
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto mb-5">
                  Autoriza a AI Weekly Radar para despachar los informes generados directamente desde tu cuenta personal de Gmail.
                </p>

                <button
                  type="button"
                  onClick={handleConnectGmail}
                  disabled={isConnectingGmail}
                  className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white hover:bg-slate-50 text-slate-800 font-bold text-sm rounded-lg border border-slate-300 shadow-xs hover:shadow-md transition-all active:scale-[0.99]"
                >
                  {isConnectingGmail ? (
                    <RefreshCw className="w-5 h-5 animate-spin text-sky-600" />
                  ) : (
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>CONECTAR CON GMAIL</span>
                </button>
              </div>
            ) : (
              /* Si ESTÁ conectado: mostrar estado, cuenta remitente, destinatario editable y botón de prueba */
              <div className="space-y-6">
                
                {/* Banner de estado: 🟢 Gmail conectado */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">🟢</span>
                    <div>
                      <div className="text-xs sm:text-sm font-bold text-emerald-950">
                        Gmail conectado
                      </div>
                      <div className="text-xs text-emerald-800">
                        Autenticación OAuth 2.0 activa con Google Cloud
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleDisconnectGmail}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50 rounded border border-slate-200 transition-colors self-start sm:self-center"
                    title="Desconectar cuenta actual de Gmail"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Cambiar cuenta</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Cuenta remitente */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Cuenta remitente:
                    </label>
                    <div className="flex items-center gap-2 p-2.5 bg-white border border-slate-200 rounded-lg text-xs sm:text-sm font-semibold text-slate-800 shadow-2xs">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span className="truncate">{gmailConfig?.senderEmail}</span>
                    </div>
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Nombre visible: <strong>AI Weekly Radar</strong>
                    </span>
                  </div>

                  {/* Destinatario del informe: campo editable */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Destinatario del informe:
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.recipientEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, recipientEmail: e.target.value })
                      }
                      className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs sm:text-sm bg-white focus:ring-2 focus:ring-sky-500"
                      placeholder="jorperc@gmail.com"
                    />
                    <span className="text-[11px] text-slate-500 mt-1 block">
                      Dirección donde se entregarán los informes HTML completos.
                    </span>
                  </div>
                </div>

                {/* Aviso si aún no se ha probado la entrega */}
                {!isConfigured && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2 text-xs text-amber-900">
                    <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <strong>Verificación requerida:</strong> Para comprobar que la entrega funciona correctamente y marcar el servicio como operativo, pulsa el botón <strong>ENVIAR EMAIL DE PRUEBA</strong>.
                    </div>
                  </div>
                )}

                {/* Botón ENVIAR EMAIL DE PRUEBA */}
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-200">
                  <div className="text-xs text-slate-500">
                    Asunto del mensaje: <strong>AI Weekly Radar — [fecha]</strong>
                  </div>

                  <button
                    type="button"
                    onClick={handleTestEmailClick}
                    disabled={isTestingGmail || !formData.recipientEmail}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-sky-600 hover:bg-sky-700 active:scale-[0.99] text-white rounded-lg text-xs sm:text-sm font-bold shadow-xs transition-all"
                  >
                    {isTestingGmail ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>ENVIAR EMAIL DE PRUEBA</span>
                  </button>
                </div>
              </div>
            )}

            {/* Mensajes de feedback de la prueba de Gmail */}
            {emailFeedback && (
              <div
                className={`mt-4 p-4 rounded-lg text-xs sm:text-sm ${
                  emailFeedback.type === 'success'
                    ? 'bg-emerald-50 text-emerald-950 border border-emerald-300'
                    : 'bg-red-50 text-red-950 border border-red-300'
                }`}
              >
                <div className="flex items-start gap-2.5">
                  {emailFeedback.type === 'success' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold">{emailFeedback.text}</p>
                    
                    {/* Botón directo a Google Cloud Console si falta activar la API */}
                    {emailFeedback.actionUrl && (
                      <div className="mt-3">
                        <a
                          href={emailFeedback.actionUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-bold transition-colors shadow-xs"
                        >
                          <span>{emailFeedback.actionLabel || 'Abrir Google Cloud Console'}</span>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

          </div>
        </section>

        {/* Submit */}
        <div className="pt-4 border-t border-slate-100 flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 hover:bg-sky-700 text-white rounded-lg text-sm font-bold shadow-md transition-colors"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Guardar Configuración</span>
          </button>
        </div>

      </form>
    </div>
  );
};
