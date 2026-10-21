import React, { useState } from 'react';
import {
  Cloud,
  Terminal,
  Shield,
  Key,
  Copy,
  CheckCircle2,
  ExternalLink,
  Calendar,
  AlertTriangle,
  Server,
  Lock,
} from 'lucide-react';

export const DeploymentGuide: React.FC = () => {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const steps = [
    {
      num: 1,
      title: 'Obtener y configurar la Gemini API Key',
      type: 'MANUAL',
      desc: 'Genera una API Key desde Google AI Studio con cuota suficiente para búsquedas y generación.',
      command: `export GEMINI_API_KEY="AIzaSyTuClaveDeGemini"`,
      notes: 'En AI Studio Build se inyecta en Secrets. Para Cloud Run independiente, se almacena en Google Secret Manager o variables de entorno.',
    },
    {
      num: 2,
      title: 'Verificar la habilitación de Google Search Grounding',
      type: 'MANUAL',
      desc: 'El modelo utiliza `@google/genai` con `tools: [{ googleSearch: {} }]`. No requiere cuota adicional aparte de la API de Gemini.',
      command: `# Ya implementado en server/geminiService.ts
# Verifica que tu clave de Gemini tenga acceso al modelo gemini-3.8-flash`,
      notes: 'La aplicación consulta en vivo fuentes primarias en la web en cada ejecución.',
    },
    {
      num: 3,
      title: 'Configurar Almacenamiento y Persistencia',
      type: 'AUTOMÁTICO / CONFIGURABLE',
      desc: 'La aplicación utiliza el directorio de datos montable `./data` (JSON store transaccional para informes, configuración e histórico de novedades para evitar duplicados).',
      command: `# En Cloud Run puedes asociar un volumen Cloud Storage FUSE o usar el almacenamiento local
mkdir -p data`,
      notes: 'Garantiza la deduplicación contra informes pasados.',
    },
    {
      num: 4,
      title: 'Conectar Gmail API mediante OAuth 2.0',
      type: 'AUTENTICACIÓN OAUTH',
      desc: 'Conecta tu cuenta de Gmail desde la pestaña de Configuración pulsando "CONECTAR CON GMAIL" y valida con "ENVIAR EMAIL DE PRUEBA".',
      command: `# La integración utiliza la Gmail API oficial (scope: https://www.googleapis.com/auth/gmail.send)
# No requiere contraseñas en texto claro ni configuración SMTP manual.
gcloud services enable gmail.googleapis.com`,
      notes: 'Envío seguro certificado por Google OAuth sin almacenar contraseñas ni exponer credenciales en el cliente.',
    },
    {
      num: 5,
      title: 'Definir el Token Secreto del Scheduler (Seguridad)',
      type: 'REQUERIDO',
      desc: 'Genera un token seguro para impedir que cualquier persona de internet invoque el endpoint POST /api/weekly-report.',
      command: `export SCHEDULER_SECRET="$(openssl rand -hex 24)"
echo "Tu secreto generado: $SCHEDULER_SECRET"`,
      notes: 'Cloud Scheduler enviará este valor en el header "Authorization: Bearer <TOKEN>".',
    },
    {
      num: 6,
      title: 'Desplegar la aplicación en Google Cloud Run',
      type: 'COMANDO GCLOUD',
      desc: 'Construye la imagen con el Dockerfile optimizado y despliega el contenedor en la región europea elegida.',
      command: `gcloud run deploy ai-weekly-radar \\
  --source . \\
  --region europe-west1 \\
  --allow-unauthenticated \\
  --port 8080 \\
  --set-env-vars="GEMINI_API_KEY=$GEMINI_API_KEY,SCHEDULER_SECRET=$SCHEDULER_SECRET,TZ=Europe/Madrid"`,
      notes: 'Anota la URL pública resultante que te proporcionará Cloud Run (e.g. https://ai-weekly-radar-xyz.a.run.app).',
    },
    {
      num: 7,
      title: 'Crear la tarea automática en Google Cloud Scheduler (Europe/Madrid)',
      type: 'COMANDO GCLOUD',
      desc: 'Programa la llamada semanal cada lunes a las 08:00 AM hora de Madrid protegida con el token secreto.',
      command: `gcloud scheduler jobs create http ai-weekly-radar-cron \\
  --schedule="0 8 * * 1" \\
  --time-zone="Europe/Madrid" \\
  --uri="https://TU-URL-DE-CLOUD-RUN/api/weekly-report" \\
  --http-method=POST \\
  --headers="Authorization=Bearer $SCHEDULER_SECRET,Content-Type=application/json" \\
  --description="Ejecución semanal automática del radar de IA"`,
      notes: 'Sustituye TU-URL-DE-CLOUD-RUN por la URL real obtenida en el paso 6.',
    },
    {
      num: 8,
      title: 'Protección contra ejecuciones duplicadas y seguridad',
      type: 'VERIFICADO',
      desc: 'El backend incluye un semáforo de exclusión mutua (`isGeneratingLock`) que rechaza peticiones simultáneas con código 409.',
      command: `# Verifica el estado del cerrojo en cualquier momento:
curl -s https://TU-URL-DE-CLOUD-RUN/api/status | grep isRunning`,
      notes: 'Evita consumo innecesario de cuota si se disparan reintentos automáticos.',
    },
    {
      num: 9,
      title: 'Comprobación manual de funcionamiento autónomo',
      type: 'PRUEBA MANUAL',
      desc: 'Fuerza una ejecución desde la terminal como si fuera Cloud Scheduler para comprobar que el pipeline completo responde correctamente.',
      command: `curl -X POST https://TU-URL-DE-CLOUD-RUN/api/weekly-report \\
  -H "Authorization: Bearer $SCHEDULER_SECRET" \\
  -H "Content-Type: application/json"`,
      notes: 'La respuesta devolverá el ID del informe, duración y fuentes analizadas.',
    },
    {
      num: 10,
      title: 'Cerrar el navegador y apagar el ordenador',
      type: 'OBJETIVO CUMPLIDO',
      desc: 'Una vez desplegado en Cloud Run y programado en Cloud Scheduler, el proceso se ejecuta al 100% en la infraestructura de Google Cloud.',
      command: `# No se requiere ninguna acción adicional en local.
# Recibirás el informe semanal automáticamente por correo electrónico.`,
      notes: 'Independencia total del navegador y la máquina del usuario.',
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 sm:p-8 mb-12">
      <div className="pb-6 border-b border-slate-100">
        <div className="flex items-center gap-2 mb-1">
          <span className="bg-sky-100 text-sky-800 text-xs font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Producción en Google Cloud
          </span>
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 flex items-center gap-2">
          <Cloud className="w-6 h-6 text-sky-600" />
          <span>Guía de Despliegue en Google Cloud Run & Cloud Scheduler</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-3xl">
          Sigue esta guía paso a paso para desplegar la aplicación de forma 100% autónoma en Google Cloud. La investigación semanal se ejecutará en la nube aunque apagues tu ordenador.
        </p>
      </div>

      <div className="mt-8 space-y-8">
        {steps.map((step, idx) => (
          <div
            key={step.num}
            className="border border-slate-200 rounded-xl p-5 sm:p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-slate-900 text-white font-extrabold text-xs flex items-center justify-center">
                  {step.num}
                </span>
                <h3 className="font-bold text-slate-900 text-base">
                  {step.title}
                </h3>
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-200 text-slate-700 self-start sm:self-center">
                {step.type}
              </span>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 mb-3 ml-10">
              {step.desc}
            </p>

            {step.command && (
              <div className="ml-10 relative">
                <pre className="bg-slate-900 text-slate-100 p-3.5 rounded-lg text-xs font-mono overflow-x-auto border border-slate-800">
                  <code>{step.command}</code>
                </pre>
                <button
                  onClick={() => copyToClipboard(step.command, idx)}
                  className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                  title="Copiar comando"
                >
                  {copiedIndex === idx ? (
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}

            {step.notes && (
              <div className="ml-10 mt-2 text-xs text-slate-500 italic">
                ℹ️ {step.notes}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
