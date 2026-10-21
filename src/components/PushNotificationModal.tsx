import React, { useState, useEffect } from 'react';
import { Bell, BellRing, CheckCircle2, AlertTriangle, X, Shield, Smartphone } from 'lucide-react';
import {
  isPushNotificationSupported,
  getNotificationPermission,
  registerPushSubscription,
} from '../utils/pushManager';

interface PushNotificationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribed?: () => void;
}

export const PushNotificationModal: React.FC<PushNotificationModalProps> = ({
  isOpen,
  onClose,
  onSubscribed,
}) => {
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isRegistering, setIsRegistering] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPermission(getNotificationPermission());
      setFeedback(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const supported = isPushNotificationSupported();

  const handleSubscribe = async () => {
    setIsRegistering(true);
    setFeedback(null);
    try {
      const res = await registerPushSubscription();
      if (res.success) {
        setPermission('granted');
        setFeedback({
          type: 'success',
          text: '¡Notificaciones activadas! Recibirás avisos de nuevos informes semanales en este dispositivo.',
        });
        if (onSubscribed) onSubscribed();
      } else {
        setFeedback({
          type: 'error',
          text: res.error || 'No se pudo activar las notificaciones push.',
        });
        setPermission(getNotificationPermission());
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        text: err?.message || 'Error inesperado al activar notificaciones.',
      });
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200">
        
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                Notificaciones Push en PWA
              </h3>
              <p className="text-[11px] text-slate-500">
                AI Weekly Radar Intelligence Alerts
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-3 text-xs sm:text-sm text-slate-700">
          <div className="bg-sky-50 border border-sky-100 rounded-xl p-3.5">
            <p className="font-semibold text-sky-950 mb-1">
              ¿Para qué se utilizan las notificaciones?
            </p>
            <ul className="space-y-1 text-sky-900 text-xs list-disc list-inside">
              <li>Avisarte cuando se complete el informe semanal automático de los lunes.</li>
              <li>Notificarte cuando finalice una investigación solicitada manualmente, aunque hayas cerrado la app o bloqueado el dispositivo.</li>
              <li>Acceder con un solo toque directamente al informe generado.</li>
            </ul>
          </div>

          {!supported && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                Tu navegador actual no soporta Push Notifications nativas. En iPhone/iPad, asegúrate de haber añadido la app a la pantalla de inicio (iOS 16.4+).
              </div>
            </div>
          )}

          {feedback && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-red-50 text-red-900 border border-red-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {permission === 'granted' && !feedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Las notificaciones push ya están activadas en este dispositivo.</span>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="mt-6 flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Cerrar
          </button>

          {supported && permission !== 'granted' && (
            <button
              onClick={handleSubscribe}
              disabled={isRegistering}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
            >
              <BellRing className="w-3.5 h-3.5" />
              <span>{isRegistering ? 'Activando...' : 'Activar Notificaciones'}</span>
            </button>
          )}
        </div>

      </div>
    </div>
  );
};
