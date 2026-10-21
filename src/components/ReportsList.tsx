import React, { useState } from 'react';
import {
  FileText,
  Calendar,
  Clock,
  Search,
  ExternalLink,
  Mail,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  TrendingUp,
} from 'lucide-react';
import { ReportSummary } from '../types';

interface ReportsListProps {
  reports: ReportSummary[];
  onSelectReport: (id: string) => void;
  selectedReportId?: string;
}

export const ReportsList: React.FC<ReportsListProps> = ({
  reports,
  onSelectReport,
  selectedReportId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredReports = reports.filter((r) => {
    const term = searchTerm.toLowerCase();
    return (
      r.title.toLowerCase().includes(term) ||
      r.period.from.includes(term) ||
      r.period.to.includes(term) ||
      r.top5Titles.some((t) => t.toLowerCase().includes(term))
    );
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-sky-600" />
            <span>Histórico de Informes Semanales</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Informes generados en orden cronológico inverso con análisis de fuentes primarias
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por novedad o fecha..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-xs sm:text-sm focus:outline-hidden focus:ring-2 focus:ring-sky-500 bg-slate-50/50"
          />
        </div>
      </div>

      {/* Reports List */}
      <div className="divide-y divide-slate-100 mt-2">
        {filteredReports.length === 0 ? (
          <div className="py-12 text-center text-slate-500">
            <FileText className="w-10 h-10 mx-auto text-slate-300 mb-2" />
            <p className="text-sm font-medium">No se encontraron informes coincidentes.</p>
            <p className="text-xs text-slate-400">Genera una nueva investigación con el botón superior.</p>
          </div>
        ) : (
          filteredReports.map((report) => {
            const isSelected = report.id === selectedReportId;

            return (
              <div
                key={report.id}
                onClick={() => onSelectReport(report.id)}
                className={`py-5 px-3 rounded-lg cursor-pointer transition-all hover:bg-slate-50/80 ${
                  isSelected ? 'bg-sky-50/70 border-l-4 border-sky-600' : ''
                }`}
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                        <Calendar className="w-3 h-3" />
                        Semana: {report.period.from} – {report.period.to}
                      </span>

                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {report.durationSeconds}s
                      </span>

                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Search className="w-3 h-3 text-emerald-600" />
                        {report.sourcesAnalyzedCount} fuentes
                      </span>

                      {report.emailStatus?.status === 'EMAIL_SENT' || report.emailSent ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          EMAIL_SENT
                        </span>
                      ) : report.emailStatus?.status === 'EMAIL_FAILED' ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-red-800 bg-red-50 px-2 py-0.5 rounded border border-red-200" title={report.emailStatus?.error}>
                          <AlertCircle className="w-3 h-3 text-red-600" />
                          EMAIL_FAILED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                          <Mail className="w-3 h-3 text-slate-400" />
                          Sin despacho
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-900 mt-2 hover:text-sky-700 transition-colors">
                      {report.title}
                    </h3>

                    <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-2">
                      {report.executiveSummaryExcerpt}
                    </p>

                    {/* Top 5 badges preview */}
                    {report.top5Titles && report.top5Titles.length > 0 && (
                      <div className="flex items-center gap-1.5 mt-2.5 flex-wrap">
                        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                          Top 5:
                        </span>
                        {report.top5Titles.slice(0, 3).map((title, i) => (
                          <span
                            key={i}
                            className="text-[11px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded truncate max-w-[240px]"
                          >
                            #{i + 1} {title}
                          </span>
                        ))}
                        {report.top5Titles.length > 3 && (
                          <span className="text-[11px] text-slate-400">
                            +{report.top5Titles.length - 3} más
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="shrink-0 flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectReport(report.id);
                      }}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-900 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                    >
                      <span>Ver informe</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
