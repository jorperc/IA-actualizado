import React from 'react';
import { Radar, Settings, Cloud, BookOpen, ShieldCheck } from 'lucide-react';

interface HeaderProps {
  activeTab: 'reports' | 'config' | 'deploy';
  setActiveTab: (tab: 'reports' | 'config' | 'deploy') => void;
  isAutomationActive: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  isAutomationActive,
}) => {
  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center text-sky-400 shadow-xs border border-slate-700">
              <Radar className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg text-slate-900 tracking-tight">
                  AI WEEKLY RADAR
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded">
                  Technology Intelligence
                </span>
              </div>
              <p className="text-xs text-slate-500 hidden md:block">
                Investigación automatizada semanal sobre novedades mundiales en IA
              </p>
            </div>
          </div>

          {/* Navigation & Status Badge */}
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden lg:flex items-center gap-2 px-3 py-1 bg-emerald-50 text-emerald-800 rounded-full border border-emerald-200 text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>{isAutomationActive ? '🟢 Automatización activa en Cloud Run' : '⚪ En espera'}</span>
            </div>

            <nav className="flex space-x-1 sm:space-x-2">
              <button
                onClick={() => setActiveTab('reports')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'reports'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>Radar & Informes</span>
              </button>

              <button
                onClick={() => setActiveTab('config')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'config'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Settings className="w-4 h-4" />
                <span>Configuración</span>
              </button>

              <button
                onClick={() => setActiveTab('deploy')}
                className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'deploy'
                    ? 'bg-sky-700 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Cloud className="w-4 h-4" />
                <span className="hidden sm:inline">Despliegue</span> Cloud Run
              </button>
            </nav>
          </div>
        </div>
      </div>
    </header>
  );
};
