import React, { useState } from 'react';
import {
  FileText,
  Mail,
  Download,
  Copy,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ArrowLeft,
  Star,
  Cpu,
  Layers,
  GraduationCap,
  BookOpen,
  Sparkles,
  RefreshCw,
  Terminal,
  ShieldCheck,
  Code,
  Globe,
} from 'lucide-react';
import { Report } from '../types';

interface ReportViewerProps {
  report: Report;
  onBack: () => void;
  onResendEmail: (reportId: string) => Promise<{ success: boolean; error?: string }>;
}

export const ReportViewer: React.FC<ReportViewerProps> = ({
  report,
  onBack,
  onResendEmail,
}) => {
  const [viewMode, setViewMode] = useState<'interactive' | 'rawHtml'>('interactive');
  const [isResending, setIsResending] = useState(false);
  const [resendFeedback, setResendFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
    actionUrl?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const handleResend = async () => {
    setIsResending(true);
    setResendFeedback(null);
    try {
      const res: any = await onResendEmail(report.id);
      if (res.success) {
        setResendFeedback({
          type: 'success',
          text: '✅ Email enviado correctamente mediante Gmail API.',
        });
      } else {
        setResendFeedback({
          type: 'error',
          text: res.error || 'No se pudo enviar el email a través de Gmail API.',
          actionUrl: res.setupInstructionsUrl,
        });
      }
    } catch (err: any) {
      setResendFeedback({
        type: 'error',
        text: `Error: ${err?.message || 'Fallo de conexión'}`,
      });
    } finally {
      setIsResending(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([report.renderedHtml || ''], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AI-Weekly-Radar-${report.period.from.replace(/\//g, '-')}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderStars = (stars: number) => {
    const full = Math.min(5, Math.max(1, stars));
    let label = 'INTERESANTE';
    if (full >= 5) label = 'CRÍTICA';
    else if (full >= 4) label = 'MUY IMPORTANTE';

    return (
      <div className="flex items-center gap-1.5">
        <div className="flex text-amber-500">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`w-4 h-4 ${
                i <= full ? 'fill-amber-400 text-amber-500' : 'text-slate-300'
              }`}
            />
          ))}
        </div>
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
          ({label})
        </span>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-md p-6 sm:p-8 mb-12">
      {/* Top action toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Volver al índice</span>
          </button>

          {/* Email Status Badge (EMAIL_SENT / EMAIL_FAILED) */}
          {report.emailStatus?.status === 'EMAIL_SENT' || report.emailStatus?.sent ? (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
              EMAIL_SENT
            </span>
          ) : report.emailStatus?.status === 'EMAIL_FAILED' || report.emailStatus?.error ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-800 border border-red-200"
              title={report.emailStatus?.error}
            >
              <span className="w-2 h-2 rounded-full bg-red-600"></span>
              EMAIL_FAILED
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Toggle between Interactive and Raw HTML */}
          <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setViewMode('interactive')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'interactive'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Vista Interactiva
            </button>
            <button
              onClick={() => setViewMode('rawHtml')}
              className={`px-3 py-1.5 rounded-md transition-all ${
                viewMode === 'rawHtml'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              HTML Puro / Email
            </button>
          </div>

          {/* Reenviar Email */}
          <button
            onClick={handleResend}
            disabled={isResending}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-800 rounded-lg text-xs font-bold border border-sky-200 transition-colors shadow-2xs"
            title="Reenviar el informe por email mediante Gmail API sin volver a ejecutar la investigación"
          >
            {isResending ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-600" />
            ) : (
              <Mail className="w-3.5 h-3.5 text-sky-600" />
            )}
            <span>REENVIAR EMAIL</span>
          </button>

          {/* Copy link */}
          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-600" />}
            <span>{copied ? 'Copiado' : 'Copiar'}</span>
          </button>

          {/* Download HTML */}
          <button
            onClick={handleDownloadHtml}
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg text-xs font-semibold border border-slate-200 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Descargar</span>
          </button>
        </div>
      </div>

      {/* Resend Status notification */}
      {resendFeedback && (
        <div
          className={`mt-4 p-3 rounded-lg text-xs font-medium flex items-center justify-between gap-3 ${
            resendFeedback.type === 'error'
              ? 'bg-red-50 text-red-800 border border-red-200'
              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {resendFeedback.type === 'error' ? (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            ) : (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            )}
            <span>{resendFeedback.text}</span>
          </div>

          {resendFeedback.actionUrl && (
            <a
              href={resendFeedback.actionUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 px-2.5 py-1 bg-red-700 hover:bg-red-800 text-white rounded text-xs font-bold shrink-0"
            >
              <span>Habilitar Gmail API</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      )}

      {/* RAW HTML PREVIEW MODE */}
      {viewMode === 'rawHtml' ? (
        <div className="mt-6 border border-slate-200 rounded-xl overflow-hidden">
          <iframe
            srcDoc={report.renderedHtml}
            title="AI Weekly Radar HTML Output"
            className="w-full min-h-[800px] border-none"
          />
        </div>
      ) : (
        /* INTERACTIVE STRUCTURED REPORT VIEW */
        <div className="mt-8 space-y-12">
          {/* Header Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-8 text-center border-b-4 border-sky-500 shadow-md">
            <span className="text-xs uppercase tracking-widest text-sky-400 font-bold">
              SISTEMA DE INTELIGENCIA TECNOLÓGICA & AI RADAR
            </span>
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight mt-1 mb-2">
              AI WEEKLY RADAR
            </h1>
            <div className="text-base text-slate-300 font-medium">
              Semana: <strong className="text-white">{report.period.from} – {report.period.to}</strong>
            </div>

            <div className="mt-5 flex items-center justify-center gap-4 text-xs text-slate-300 flex-wrap">
              <span className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                🔍 Fuentes analizadas: <strong className="text-white">{report.sourcesAnalyzedCount}</strong>
              </span>
              <span className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                ⏱ Duración: <strong className="text-white">{report.durationSeconds}s</strong>
              </span>
              <span className="bg-slate-800 px-3 py-1 rounded-full border border-slate-700">
                🌐 Motor: <strong className="text-sky-300">Gemini Grounding</strong>
              </span>
            </div>
          </div>

          {/* 1. RESUMEN EJECUTIVO */}
          <section className="bg-slate-50 border border-slate-200 rounded-xl p-6 sm:p-7">
            <h2 className="text-lg font-bold text-slate-900 border-b-2 border-sky-600 pb-2 inline-block mb-3">
              📋 RESUMEN EJECUTIVO
            </h2>
            <p className="text-slate-700 text-sm sm:text-base leading-relaxed">
              {report.executiveSummary}
            </p>
          </section>

          {/* 2. 🔥 TOP 5 DE LA SEMANA */}
          <section>
            <div className="mb-4">
              <h2 className="text-2xl font-extrabold text-slate-900 flex items-center gap-2">
                <span>🔥 TOP 5 DE LA SEMANA</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-500">
                Las 5 novedades críticas que todo profesional de la Inteligencia Artificial debe conocer.
              </p>
            </div>

            <div className="space-y-4">
              {report.top5.map((item, idx) => (
                <div
                  key={item.id || idx}
                  className="bg-white border border-slate-200 rounded-xl p-5 sm:p-6 shadow-xs hover:border-slate-300 transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-2">
                    <div className="flex items-start gap-3">
                      <span className="shrink-0 w-7 h-7 rounded-full bg-sky-600 text-white font-bold text-xs flex items-center justify-center mt-0.5">
                        {idx + 1}
                      </span>
                      <h3 className="text-lg font-bold text-slate-900 leading-snug">
                        {item.title}
                      </h3>
                    </div>
                    <div className="self-start">{renderStars(item.stars)}</div>
                  </div>

                  {item.isUpdateOfPrevious && (
                    <div className="inline-block bg-amber-50 text-amber-900 text-xs font-bold px-2.5 py-1 rounded-md border border-amber-200 mb-3">
                      🔄 ACTUALIZACIÓN DE UNA NOVEDAD ANTERIOR
                    </div>
                  )}

                  <p className="text-sm text-slate-700 mb-4 leading-relaxed">
                    {item.summary}
                  </p>

                  <div className="bg-slate-50 rounded-lg p-4 text-xs sm:text-sm space-y-2 border border-slate-200/60 mb-4">
                    <div>
                      <strong className="text-slate-900">Qué cambia:</strong>{' '}
                      <span className="text-slate-700">{item.whatChanged}</span>
                    </div>
                    <div>
                      <strong className="text-slate-900">Por qué importa:</strong>{' '}
                      <span className="text-slate-700">{item.whyItMatters}</span>
                    </div>
                    <div>
                      <strong className="text-slate-900">Aplicación práctica:</strong>{' '}
                      <span className="text-slate-700">{item.practicalApplication}</span>
                    </div>
                  </div>

                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <strong>Fuente original:</strong>
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-600 hover:text-sky-800 hover:underline flex items-center gap-1 truncate max-w-md"
                    >
                      <span>{item.sourceName || item.sourceUrl}</span>
                      <ExternalLink className="w-3 h-3 shrink-0" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 3. 🧠 NUEVOS MODELOS */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 mb-3 flex items-center gap-2">
              <Cpu className="w-5 h-5 text-indigo-600" />
              <span>🧠 NUEVOS MODELOS Y VERSIONES</span>
            </h2>

            {report.newModels.length === 0 ? (
              <p className="text-xs text-slate-500 italic">Sin nuevos modelos verificados en este ciclo.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs sm:text-sm border-collapse">
                  <thead>
                    <tr className="border-b-2 border-slate-200 bg-slate-50 text-slate-700 font-bold">
                      <th className="py-2.5 px-3">Modelo</th>
                      <th className="py-2.5 px-3">Empresa</th>
                      <th className="py-2.5 px-3">Novedad</th>
                      <th className="py-2.5 px-3">Importancia</th>
                      <th className="py-2.5 px-3">Fuente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {report.newModels.map((m, i) => (
                      <tr key={i} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-bold text-slate-900">{m.model}</td>
                        <td className="py-2.5 px-3 text-slate-600">{m.company}</td>
                        <td className="py-2.5 px-3 text-slate-700">{m.novelty}</td>
                        <td className="py-2.5 px-3 font-semibold text-sky-700">{m.importance}</td>
                        <td className="py-2.5 px-3">
                          <a
                            href={m.sourceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sky-600 hover:underline inline-flex items-center gap-0.5"
                          >
                            <span>{m.sourceName || 'Enlace'}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* 4. 🤖 OPENAI / GPT / CODEX */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>🤖 OPENAI / GPT / CODEX</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.openaiUpdates.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border-l-4 border-l-emerald-600 border border-slate-200 rounded-lg p-5 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-bold uppercase bg-emerald-50 text-emerald-800 px-2 py-0.5 rounded border border-emerald-200">
                      {item.type}
                    </span>
                  </div>

                  {!item.isConfirmed && (
                    <div className="inline-block bg-red-50 text-red-700 text-[10px] font-bold px-2 py-0.5 rounded mb-2">
                      ⚠️ NO CONFIRMADO
                    </div>
                  )}

                  <div className="space-y-1.5 text-xs sm:text-sm text-slate-700 mb-3">
                    <p><strong>Qué es:</strong> {item.whatIsIt}</p>
                    <p><strong>Qué ha cambiado:</strong> {item.whatChanged}</p>
                    <p><strong>Qué permite hacer:</strong> {item.whatItEnables}</p>
                    <p><strong>Por qué es relevante:</strong> {item.whyRelevant}</p>
                  </div>

                  <div className="bg-slate-50 p-2.5 rounded text-xs text-slate-800 mb-2 border border-slate-200/60">
                    <strong>Ejemplo práctico:</strong> {item.example}
                  </div>

                  <div className="text-xs text-slate-500">
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-700 hover:underline flex items-center gap-1"
                    >
                      <span>Fuente oficial: {item.sourceName || item.sourceUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 5. 🟠 CLAUDE / ANTHROPIC */}
          <section>
            <h2 className="text-xl font-bold text-slate-900 mb-4 flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span>🟠 CLAUDE / ANTHROPIC</span>
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {report.claudeUpdates.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border-l-4 border-l-amber-500 border border-slate-200 rounded-lg p-5 shadow-xs"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4 className="font-bold text-slate-900 text-sm sm:text-base">
                      {item.title}
                    </h4>
                    <span className="text-[10px] font-bold uppercase bg-amber-50 text-amber-800 px-2 py-0.5 rounded border border-amber-200">
                      {item.type}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-slate-700 mb-3">
                    {item.summary}
                  </p>

                  <div className="text-xs space-y-1 text-slate-600 mb-3">
                    <div><strong>Qué ha cambiado:</strong> {item.whatChanged}</div>
                    <div><strong>Por qué es relevante:</strong> {item.whyRelevant}</div>
                  </div>

                  <div className="text-xs text-slate-500">
                    <a
                      href={item.sourceUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-amber-700 hover:underline flex items-center gap-1"
                    >
                      <span>Fuente: {item.sourceName || item.sourceUrl}</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 6. 🧩 SKILLS (Claude & GPT/Codex) */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Layers className="w-5 h-5 text-sky-600" />
              <span>🧩 SKILLS (CLAUDE & GPT/CODEX) & MCP</span>
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Atención prioritaria a Skills oficiales y comunitarias con ejemplos de invocación y utilidad práctica.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs sm:text-sm border-collapse">
                <thead>
                  <tr className="border-b-2 border-slate-200 bg-slate-50 text-slate-700 font-bold">
                    <th className="py-2.5 px-3">Skill / Conector</th>
                    <th className="py-2.5 px-3">Plataforma</th>
                    <th className="py-2.5 px-3">Tipo</th>
                    <th className="py-2.5 px-3">Función</th>
                    <th className="py-2.5 px-3">Ejemplo & Uso</th>
                    <th className="py-2.5 px-3">Utilidad</th>
                    <th className="py-2.5 px-3">Fuente</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {report.skills.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/60 align-top">
                      <td className="py-3 px-3 font-bold text-slate-900 whitespace-nowrap">
                        {s.name}
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[11px] font-semibold">
                          {s.platform}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        {s.isOfficial ? (
                          <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded">
                            OFICIAL
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded">
                            COMUNIDAD
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-700">
                        <strong>{s.purpose}:</strong> {s.whatItDoes}
                      </td>
                      <td className="py-3 px-3 text-slate-600 text-xs">
                        {s.practicalExample}
                        {s.installGuide && (
                          <div className="mt-1 font-mono text-[11px] bg-slate-100 p-1 rounded text-sky-800">
                            {s.installGuide}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 font-semibold text-sky-700 text-xs">
                        {s.utilityRating}
                      </td>
                      <td className="py-3 px-3">
                        <a
                          href={s.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-600 hover:underline"
                        >
                          Enlace
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* 7. 💻 VIBE CODING */}
          <section className="bg-slate-900 text-white rounded-xl p-6 sm:p-7 shadow-sm">
            <h2 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
              <Code className="w-5 h-5 text-sky-400" />
              <span>💻 VIBE CODING & CREACIÓN POR LENGUAJE NATURAL</span>
            </h2>
            <p className="text-xs text-slate-400 mb-5">
              Herramientas que transforman instrucciones en aplicaciones funcionales (Cursor, Windsurf, Claude Code, Antigravity, Lovable, Bolt).
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {report.vibeCoding.map((v, idx) => (
                <div
                  key={idx}
                  className="bg-slate-800 border border-slate-700 rounded-lg p-4 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-bold text-sky-300 text-sm">{v.tool}</span>
                      <a
                        href={v.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-slate-400 hover:text-white text-xs"
                      >
                        {v.sourceName || 'Doc'}
                      </a>
                    </div>
                    <p className="text-xs text-slate-200 mb-2">
                      <strong>Novedad:</strong> {v.novelty}
                    </p>
                    <p className="text-xs text-slate-400">
                      <strong>Capacidades:</strong> {v.naturalLanguageCapabilities}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 8. 🎓 IA Y EDUCACIÓN & 🔬 INVESTIGACIÓN */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Educación */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-blue-600" />
                <span>🎓 IA Y EDUCACIÓN</span>
              </h2>

              <div className="space-y-3">
                {report.education.map((edu, idx) => (
                  <div key={idx} className="border border-slate-200 rounded-lg p-3.5 bg-slate-50/50">
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{edu.title}</h4>
                      <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded font-semibold">
                        {edu.targetLevel}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mb-1"><strong>Utilidad:</strong> {edu.utility}</p>
                    <p className="text-xs text-slate-600"><strong>Impacto pedagógico:</strong> {edu.practicalImpact}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Investigación científica */}
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
              <h2 className="text-lg font-bold text-slate-900 mb-3 flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-600" />
                <span>🔬 INVESTIGACIÓN CIENTÍFICA (MAX 5 PAPERS)</span>
              </h2>

              <div className="space-y-3">
                {report.researchPapers.map((paper, idx) => (
                  <div key={idx} className="border-l-4 border-l-indigo-600 border border-slate-200 rounded-lg p-3 bg-white">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">{paper.title}</h4>
                      <span className="text-[10px] bg-indigo-50 text-indigo-800 px-2 py-0.5 rounded font-bold">
                        {paper.topic}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mb-1">{paper.authorsOrOrg}</p>
                    <p className="text-xs text-slate-700 mb-2"><strong>Hallazgo clave:</strong> {paper.keyFinding}</p>
                    <a
                      href={paper.arxivOrPaperUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline font-semibold inline-flex items-center gap-1"
                    >
                      <span>Ver Paper en arXiv</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 9. ⭐ ESTO LO PROBARÍA ESTA SEMANA (EXACTLY 3) */}
          <section className="bg-sky-50/60 border-2 border-sky-300 rounded-xl p-6 sm:p-8">
            <div className="mb-6">
              <div className="flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-sky-600" />
                <h2 className="text-2xl font-extrabold text-sky-900 tracking-tight">
                  ⭐ ESTO LO PROBARÍA ESTA SEMANA
                </h2>
              </div>
              <p className="text-xs sm:text-sm text-sky-800 mt-1">
                Tres selecciones concretas con alto retorno práctico e instrucciones para probarlas hoy.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {report.tryThisWeek.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-sky-200 rounded-xl p-5 shadow-xs flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <span className="text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded-full">
                        Opción #{item.number}
                      </span>
                      <div className="flex items-center gap-1.5 text-[11px]">
                        <span className="text-slate-500 font-semibold">{item.estimatedTime}</span>
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            item.difficulty === 'BAJA'
                              ? 'bg-emerald-100 text-emerald-800'
                              : item.difficulty === 'MEDIA'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {item.difficulty}
                        </span>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-slate-900 text-base mb-2">
                      {item.name}
                    </h3>

                    <div className="text-xs space-y-2 text-slate-700 mb-4">
                      <p><strong>Qué es:</strong> {item.whatItIs}</p>
                      <p><strong>Por qué probarlo:</strong> {item.whyTryIt}</p>
                      <p><strong>Qué podrías hacer:</strong> {item.whatToBuild}</p>
                    </div>

                    <div className="bg-sky-50 p-2.5 rounded text-xs text-sky-900 mb-4 border border-sky-100">
                      <strong>Cómo empezar:</strong> {item.howToStart}
                    </div>
                  </div>

                  <a
                    href={item.directLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center justify-center gap-1.5 w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    <span>Ir a la herramienta / doc</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ))}
            </div>
          </section>

          {/* 10. 🔭 RADAR — QUÉ VIGILAR */}
          <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs">
            <h2 className="text-xl font-bold text-slate-900 mb-2 flex items-center gap-2">
              <Globe className="w-5 h-5 text-slate-700" />
              <span>🔭 RADAR — QUÉ VIGILAR</span>
            </h2>
            <p className="text-xs text-slate-500 mb-4">
              Próximos lanzamientos clasificados rigurosamente entre hechos confirmados, previstos y rumores no confirmados.
            </p>

            <div className="divide-y divide-slate-100">
              {report.radarWatch.map((r, idx) => (
                <div key={idx} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="font-bold text-slate-900 text-sm">{r.item}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{r.notes}</div>
                  </div>

                  <span
                    className={`self-start sm:self-center shrink-0 px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wider ${
                      r.status === 'CONFIRMADO'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : r.status === 'PREVISTO OFICIALMENTE'
                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                        : 'bg-red-100 text-red-800 border border-red-200'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>
              ))}
            </div>
          </section>

        </div>
      )}
    </div>
  );
};
