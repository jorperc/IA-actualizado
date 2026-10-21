import React, { useState } from 'react';
import { Download, Share2, PlusSquare, X, Smartphone, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallBanner: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // If already running standalone or dismissed, don't show
  if (isInstalled || dismissed) {
    return null;
  }

  // Only show if installable (Chromium/Android/Desktop) or on iOS Safari
  if (!isInstallable && !isIOS) {
    return null;
  }

  return (
    <>
      <div className="bg-slate-900 text-white px-4 py-2.5 rounded-lg mb-6 flex items-center justify-between gap-3 shadow-md border border-slate-700 animate-in fade-in duration-300">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 border border-sky-400/30">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="text-xs sm:text-sm">
            <span className="font-bold text-sky-300">Instalar AI Weekly Radar</span>
            <span className="hidden sm:inline text-slate-300 ml-1.5">
              Accede directamente desde tu pantalla de inicio con soporte offline
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isInstallable && (
            <button
              onClick={install}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-md text-xs transition-colors shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Instalar</span>
            </button>
          )}

          {isIOS && (
            <button
              onClick={() => setShowIOSGuide(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-md text-xs transition-colors shadow-xs"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Instalar en iPhone</span>
            </button>
          )}

          <button
            onClick={() => setDismissed(true)}
            className="text-slate-400 hover:text-white p-1 rounded transition-colors"
            title="Cerrar aviso"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Installation Instructions Modal */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold text-xs">
                  iOS
                </div>
                <h3 className="font-bold text-slate-900 text-base">
                  Añadir a la pantalla de inicio
                </h3>
              </div>
              <button
                onClick={() => setShowIOSGuide(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs sm:text-sm text-slate-700">
              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="p-1.5 bg-white rounded shadow-xs text-sky-600 shrink-0">
                  <Share2 className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-slate-900">Paso 1:</strong> Pulsa el botón{' '}
                  <strong>Compartir</strong> en la barra inferior de Safari (icono cuadrado con flecha hacia arriba).
                </div>
              </div>

              <div className="flex items-start gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="p-1.5 bg-white rounded shadow-xs text-sky-600 shrink-0">
                  <PlusSquare className="w-5 h-5" />
                </div>
                <div>
                  <strong className="text-slate-900">Paso 2:</strong> Desplázate por el menú y pulsa{' '}
                  <strong>"Añadir a pantalla de inicio"</strong>.
                </div>
              </div>

              <div className="flex items-start gap-3 bg-emerald-50 p-3 rounded-lg border border-emerald-200 text-emerald-900 text-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  La aplicación se abrirá a pantalla completa como una PWA independiente sin barras de navegador.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-5 w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </>
  );
};
