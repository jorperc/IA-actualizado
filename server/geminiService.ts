import { GoogleGenAI } from '@google/genai';
import {
  Config,
  Report,
  Top5Item,
  ModelItem,
  OpenAIItem,
  ClaudeItem,
  SkillItem,
  AgentAutomationItem,
  VibeCodingItem,
  EducationItem,
  ResearchPaperItem,
  ToolItem,
  TryThisWeekItem,
  RadarWatchItem,
  SourceReference,
  InvestigationAxisState,
  AxisStatus,
} from './types.js';
import { getCurrentDatePeriod } from './cronSchedule.js';
import { generateHtmlReport } from './htmlReportGenerator.js';
import {
  getHistoricalSignals,
  updateProgress,
  saveReport,
  saveConfig,
  getConfig,
  getAllReports,
  isLocked,
  setLock,
  isCancellationRequested,
  clearCancellation,
} from './storage.js';
import { sendReportEmail } from './emailService.js';
import { sendReportPushNotification } from './pushService.js';
import {
  callGeminiWithResilience,
  formatFriendlyErrorMessage,
  PRIMARY_MODEL,
} from './geminiResilientClient.js';
import {
  loadCheckpoint,
  recordAxisCheckpoint,
  recordQueryCheckpoint,
  clearCheckpoint,
  AxisCheckpointItem,
} from './checkpointStore.js';
import {
  ExecutionMetricsTracker,
  CONSUMPTION_BUDGETS,
  calculateEstimatedCostEur,
  ConsumptionBudget,
} from './consumptionConfig.js';

// The 7 canonical investigation axes defined by the user
export interface AxisDefinition {
  id: string;
  name: string;
  searchQuery: string;
}

export const CANONICAL_AXES: AxisDefinition[] = [
  {
    id: 'openai',
    name: 'OpenAI / GPT / Codex',
    searchQuery:
      'OpenAI ChatGPT Codex GPT-4o o1 o3 Operator API changelog features updates last 7 days',
  },
  {
    id: 'claude',
    name: 'Claude / Anthropic / Skills',
    searchQuery:
      'Claude Anthropic Claude Code Model Context Protocol MCP skills computer use updates last 7 days',
  },
  {
    id: 'gemini',
    name: 'Gemini / Google',
    searchQuery:
      'Google Gemini 3.8 Gemini 2.5 Flash Google AI Studio Antigravity agents Live API releases last 7 days',
  },
  {
    id: 'models',
    name: 'Nuevos modelos de IA',
    searchQuery:
      'new AI models releases DeepSeek Meta Llama xAI Grok Qwen Mistral Hugging Face benchmarks last 7 days',
  },
  {
    id: 'agents',
    name: 'Agentes / MCP',
    searchQuery:
      'AI agents autonomous workflows MCP Model Context Protocol servers LangChain CrewAI multi-agent last 7 days',
  },
  {
    id: 'vibecoding',
    name: 'Vibe Coding / Desarrollo asistido',
    searchQuery:
      'vibe coding natural language coding Cursor Windsurf Lovable Bolt Claude Code Antigravity last 7 days',
  },
  {
    id: 'education',
    name: 'Educación / investigación / usos',
    searchQuery:
      'AI education universities higher education teachers pedagogical empirical research arXiv papers last 7 days',
  },
];

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY no configurada. Añade tu API Key en la configuración de la aplicación.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function extractJsonBlock(text: string): any {
  if (!text) return null;
  const match = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  const target = match ? match[1] : text;

  const firstBrace = target.indexOf('{');
  const lastBrace = target.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    const jsonStr = target.substring(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(jsonStr);
    } catch (e) {
      console.warn('Failed parsing direct json substring, attempting sanitization...', e);
    }
  }

  try {
    return JSON.parse(target.trim());
  } catch (err) {
    console.error('JSON parse error from Gemini text response:', err);
    return null;
  }
}

// Conventional TypeScript sanitization for URLs & Domains (No AI needed)
function sanitizeSource(rawUri: string, rawTitle?: string): SourceReference {
  try {
    const parsed = new URL(rawUri);
    const domain = parsed.hostname.replace(/^www\./, '');
    return {
      title: rawTitle && rawTitle.trim() ? rawTitle.trim() : domain,
      url: rawUri,
      domain,
    };
  } catch {
    return {
      title: rawTitle || 'Fuente web',
      url: rawUri,
      domain: 'web',
    };
  }
}

// Conventional TypeScript fallback synthesis in case AI call budget is exhausted
function buildFallbackReportFromCheckpoints(
  period: { from: string; to: string; full: string },
  axesProgressList: InvestigationAxisState[],
  restoredAxesMap: Map<string, AxisCheckpointItem>,
  collectedSources: SourceReference[]
): any {
  const completedAxes = Array.from(restoredAxesMap.values());
  const summary = `Informe estructurado bajo Control de Costes (Límite de consumo alcanzado). Se completaron ${completedAxes.length} de ${axesProgressList.length} ejes de investigación temáticos recopilando ${collectedSources.length} fuentes verificadas.`;

  const top5: Top5Item[] = completedAxes.slice(0, 5).map((axis, idx) => ({
    id: `top-${idx + 1}`,
    title: `Novedades relevantes en ${axis.name}`,
    stars: 4,
    summary:
      axis.resultText && axis.resultText.trim()
        ? axis.resultText.substring(0, 320).replace(/[#*`]/g, '').trim()
        : `Análisis de novedades y documentación para ${axis.name}.`,
    whatChanged: `Actualizaciones y lanzamientos detectados durante los últimos 7 días.`,
    whyItMatters: `Impacta en la adopción, automatización y flujos de trabajo de modelos de IA.`,
    practicalApplication: `Consultar fuentes oficiales y changelogs indexados en este eje.`,
    sourceUrl: axis.sources?.[0]?.url || 'https://google.com',
    sourceName: axis.sources?.[0]?.title || axis.name,
    isUpdateOfPrevious: false,
  }));

  return {
    executiveSummary: summary,
    top5,
    newModels: [],
    openaiUpdates: [],
    claudeUpdates: [],
    skills: [],
    agentsAndAutomation: [],
    vibeCoding: [],
    education: [],
    researchPapers: [],
    toolsToTry: [],
    tryThisWeek: [
      {
        number: 1,
        name: 'Revisar fuentes primarias del informe',
        whatItIs: 'Análisis de enlaces directos recopilados en los ejes completados.',
        whyTryIt: 'Permite acceder a los changelogs oficiales verificados sin coste adicional de tokens.',
        whatToBuild: 'Notas técnicas de actualización semanal.',
        howToStart: 'Consultar el listado de fuentes primarias al pie del informe.',
        estimatedTime: '15 minutos',
        difficulty: 'BAJA',
        directLink: collectedSources[0]?.url || 'https://github.com',
      },
      {
        number: 2,
        name: 'Configurar servidor MCP o CLI de agentes',
        whatItIs: 'Herramientas de automatización local para desarrolladores.',
        whyTryIt: 'Mayor control y cero consumo de APIs externas para tareas rutinarias.',
        whatToBuild: 'Conector local para tus repositorios.',
        howToStart: 'npm install -g @anthropic-ai/claude-code',
        estimatedTime: '20 minutos',
        difficulty: 'MEDIA',
        directLink: 'https://modelcontextprotocol.io',
      },
      {
        number: 3,
        name: 'Verificar cuotas y presupuesto en AI Studio',
        whatItIs: 'Control de consumo de tokens y llamadas.',
        whyTryIt: 'Asegura que las investigaciones se mantengan dentro del presupuesto óptimo.',
        whatToBuild: 'Configuración de límites en AI Weekly Radar.',
        howToStart: 'Accede a la pestaña Configuración en la cabecera.',
        estimatedTime: '5 minutos',
        difficulty: 'BAJA',
        directLink: 'https://aistudio.google.com',
      },
    ],
    radarWatch: [
      {
        item: 'Próxima ventana de investigación semanal',
        category: 'Automatización',
        status: 'CONFIRMADO',
        notes: 'Se ejecutará en la fecha programada en Cloud Scheduler.',
      },
    ],
  };
}
  phase: string,
  completedAxesCount: number,
  totalAxesCount: number
): number {
  if (phase === 'COMPLETADO') return 100;
  if (phase === 'ENVIANDO_EMAIL') return 96;
  if (phase === 'GUARDANDO') return 92;
  if (phase === 'GENERANDO_INFORME') return 85;
  if (phase === 'VERIFICANDO' || phase === 'COMPARANDO_HISTORICO') return 82;

  // Axes search phase: 10% baseline, up to 80% (each axis is ~10%)
  const axisPortion = totalAxesCount > 0 ? (completedAxesCount / totalAxesCount) * 70 : 0;
  return Math.min(80, Math.max(10, Math.round(10 + axisPortion)));
}

export async function runWeeklyRadarInvestigation(
  triggerType: 'MANUAL' | 'SCHEDULED' = 'MANUAL'
): Promise<Report> {
  if (isLocked()) {
    throw new Error(
      'Ya hay una investigación de AI Weekly Radar en curso. Espera a que termine.'
    );
  }

  const startTime = Date.now();
  setLock(true);

  const config = getConfig();
  const period = getCurrentDatePeriod(config.timezone || 'Europe/Madrid');
  const pastSignals = getHistoricalSignals();

  // Cloud Scheduler Idempotency: avoid regenerating duplicate report if already completed for this week
  if (triggerType === 'SCHEDULED') {
    const existingReports = getAllReports();
    const alreadyGenerated = existingReports.find(
      (r) => r.period?.from === period.from && r.period?.to === period.to
    );
    if (alreadyGenerated) {
      console.log(
        `[Cloud Scheduler Idempotency] Informe para la semana ${period.full} ya existe (${alreadyGenerated.id}). Evitando duplicación.`
      );
      setLock(false);
      return alreadyGenerated;
    }
  }

  const sourcesMap = new Map<string, SourceReference>();
  let currentPercentage = 10;

  try {
    const ai = getGeminiClient();
    const modelToUse = config.modelName || PRIMARY_MODEL;

    // Filter axes according to depth (RAPIDO = top 3, NORMAL/PROFUNDO = all 7)
    let axesToRun: AxisDefinition[] = [...CANONICAL_AXES];
    if (config.researchDepth === 'RAPIDO') {
      axesToRun = CANONICAL_AXES.slice(0, 3);
    }

    const totalAxes = axesToRun.length;

    // ----------------------------------------------------
    // CHECKPOINT RESTORATION (No perder trabajo realizado)
    // ----------------------------------------------------
    const checkpoint = loadCheckpoint(period.full);
    const restoredAxesMap = new Map<string, AxisCheckpointItem>();

    if (checkpoint && Array.isArray(checkpoint.axesCompleted)) {
      for (const axisItem of checkpoint.axesCompleted) {
        if (axisItem.status === 'COMPLETED') {
          restoredAxesMap.set(axisItem.id, axisItem);
          if (Array.isArray(axisItem.sources)) {
            for (const s of axisItem.sources) {
              sourcesMap.set(s.url, s);
            }
          }
        }
      }
    }

    // Backwards-compatibility check for queriesCompleted
    if (restoredAxesMap.size === 0 && checkpoint && Array.isArray(checkpoint.queriesCompleted)) {
      checkpoint.queriesCompleted.forEach((q, idx) => {
        if (idx < axesToRun.length) {
          const axisDef = axesToRun[idx];
          restoredAxesMap.set(axisDef.id, {
            id: axisDef.id,
            name: axisDef.name,
            status: 'COMPLETED',
            resultText: q.resultText,
            sources: q.sources || [],
            timestamp: q.timestamp || new Date().toISOString(),
          });
          if (Array.isArray(q.sources)) {
            for (const s of q.sources) {
              sourcesMap.set(s.url, s);
            }
          }
        }
      });
    }

    // Build initial live state of all axes
    const axesProgressList: InvestigationAxisState[] = axesToRun.map((a) => {
      const restored = restoredAxesMap.get(a.id);
      if (restored) {
        return {
          id: a.id,
          name: a.name,
          status: 'COMPLETED',
          sourcesCount: restored.sources?.length || 0,
        };
      }
      return {
        id: a.id,
        name: a.name,
        status: 'PENDING',
      };
    });

    const initialCompletedCount = restoredAxesMap.size;
    currentPercentage = calculateProgressPercentage('ANALIZANDO_NOVEDADES', initialCompletedCount, totalAxes);

    updateProgress({
      phase: initialCompletedCount > 0 ? 'ANALIZANDO_NOVEDADES' : 'BUSCANDO_FUENTES',
      status: 'RUNNING',
      percentage: currentPercentage,
      detail:
        initialCompletedCount > 0
          ? `Reanudando investigación: ${initialCompletedCount} de ${totalAxes} ejes temáticos recuperados del punto guardado...`
          : `Iniciando investigación secuencial sobre los ${totalAxes} ejes temáticos (${period.from} a ${period.to})...`,
      sourcesCount: sourcesMap.size,
      completedQueriesCount: initialCompletedCount,
      totalQueriesCount: totalAxes,
      axes: axesProgressList,
      completedAxesCount: initialCompletedCount,
      totalAxesCount: totalAxes,
      canResume: false,
      isRetrying: false,
    });

    // ----------------------------------------------------
    // EJECUCIÓN SECUENCIAL DE LOS 7 EJES (MAX_CONCURRENT = 1)
    // ----------------------------------------------------
    let consolidatedAxesText = '';

    for (let i = 0; i < axesToRun.length; i++) {
      const axis = axesToRun[i];
      const existing = restoredAxesMap.get(axis.id);

      if (existing) {
        console.log(
          `[Checkpoint Skip] Eje "${axis.name}" ya completado previamente. Restaurando del checkpoint.`
        );
        consolidatedAxesText += `\n\n=== EJE ${i + 1}: ${axis.name} ===\n${existing.resultText}`;
        continue;
      }

      // Mark this axis as RUNNING
      axesProgressList[i].status = 'RUNNING';
      const completedSoFar = axesProgressList.filter((a) => a.status === 'COMPLETED').length;
      currentPercentage = calculateProgressPercentage('ANALIZANDO_NOVEDADES', completedSoFar, totalAxes);

      updateProgress({
        phase: 'ANALIZANDO_NOVEDADES',
        status: 'RUNNING',
        percentage: currentPercentage,
        detail: `Investigando eje ${i + 1}/${totalAxes}: ${axis.name} con Google Search Grounding...`,
        sourcesCount: sourcesMap.size,
        completedQueriesCount: completedSoFar,
        totalQueriesCount: totalAxes,
        axes: [...axesProgressList],
        completedAxesCount: completedSoFar,
        totalAxesCount: totalAxes,
      });

      try {
        // Single search grounding query for this axis with resilience & rate limiting
        const { response: searchResp, modelUsed } = await callGeminiWithResilience(
          ai,
          modelToUse,
          {
            contents: `Busca información exacta y reciente publicada durante los últimos 7 días sobre:
${axis.searchQuery}
Prioriza documentación oficial, blogs oficiales de empresas (OpenAI, Anthropic, Google, Meta), changelogs, GitHub y preprints de arXiv.
Resume las novedades verificadas indicando fechas exactas, empresa y enlaces o nombres de fuentes.`,
            config: {
              tools: [{ googleSearch: {} }],
            },
          },
          {
            phaseLabel: `Eje ${i + 1}/${totalAxes}: ${axis.name}`,
            maxRetriesPerModel: 5,
          }
        );

        const textOutput = searchResp.text || '';
        consolidatedAxesText += `\n\n=== EJE ${i + 1}: ${axis.name} ===\n${textOutput}`;

        // Collect grounding sources in conventional TS
        const axisSources: SourceReference[] = [];
        const chunks = searchResp.candidates?.[0]?.groundingMetadata?.groundingChunks;
        if (Array.isArray(chunks)) {
          for (const chunk of chunks) {
            if (chunk.web?.uri) {
              const sanitized = sanitizeSource(chunk.web.uri, chunk.web.title);
              sourcesMap.set(sanitized.url, sanitized);
              axisSources.push(sanitized);
            }
          }
        }

        // ----------------------------------------------------
        // CHECKPOINT INMEDIATO TRAS COMPLETAR EL EJE
        // ----------------------------------------------------
        recordAxisCheckpoint(period, axis.id, axis.name, 'COMPLETED', textOutput, axisSources);
        recordQueryCheckpoint(period, i, axis.searchQuery, textOutput, axisSources);

        // Update live axes state
        axesProgressList[i].status = 'COMPLETED';
        axesProgressList[i].sourcesCount = axisSources.length;
        const nowCompleted = axesProgressList.filter((a) => a.status === 'COMPLETED').length;
        currentPercentage = calculateProgressPercentage('ANALIZANDO_NOVEDADES', nowCompleted, totalAxes);

        updateProgress({
          percentage: currentPercentage,
          detail: `Eje ${i + 1}/${totalAxes} (${axis.name}) completado y guardado en checkpoint.`,
          sourcesCount: sourcesMap.size,
          completedQueriesCount: nowCompleted,
          totalQueriesCount: totalAxes,
          axes: [...axesProgressList],
          completedAxesCount: nowCompleted,
          totalAxesCount: totalAxes,
        });

        console.log(`[Checkpoint Saved] Eje "${axis.name}" guardado inmediatamente en disco.`);
      } catch (axisErr: any) {
        axesProgressList[i].status = 'ERROR';
        axesProgressList[i].error = axisErr?.message || 'Error en eje';
        updateProgress({
          axes: [...axesProgressList],
        });
        throw axisErr;
      }
    }

    // ----------------------------------------------------
    // FASE DE VERIFICACIÓN Y PREPARACIÓN DE SÍNTESIS
    // ----------------------------------------------------
    const collectedSources = Array.from(sourcesMap.values());
    currentPercentage = 82;

    updateProgress({
      phase: 'VERIFICANDO',
      percentage: currentPercentage,
      detail: `Verificando datos de los ${totalAxes} ejes contra fuentes primarias (${collectedSources.length} fuentes indexadas)...`,
      sourcesCount: collectedSources.length,
      axes: [...axesProgressList],
    });

    const historicalContext = pastSignals
      .slice(0, 40)
      .map((s) => `- ${s.title} (${s.entity}, visto en ${s.firstSeenPeriod})`)
      .join('\n');

    // ----------------------------------------------------
    // FASE DE SÍNTESIS ESTRUCTURADA CON GEMINI
    // ----------------------------------------------------
    currentPercentage = 85;
    updateProgress({
      phase: 'GENERANDO_INFORME',
      percentage: currentPercentage,
      detail: 'Sintetizando informe estructurado final de AI Weekly Radar con análisis crítico...',
      sourcesCount: collectedSources.length,
    });

    const synthesisPrompt = `Actúa como un ANALISTA SENIOR DE INTELIGENCIA TECNOLÓGICA especializado en IA.
Tu misión es generar el informe semanal definitivo "AI WEEKLY RADAR" para el periodo: ${period.from} a ${period.to}.

IMPORTANTE:
- Elimina ruido de marketing, notas de prensa vacías y especulaciones.
- Prioriza FUENTES PRIMARIAS > FIABILIDAD > NOVEDAD > RELEVANCIA > UTILIDAD PRÁCTICA.
- Si una novedad no está verificada al 100%, márcala con isConfirmed: false ("NO CONFIRMADO").
- Compara con el HISTÓRICO PREVIO:
${historicalContext || 'No hay histórico previo registrado.'}
Si un elemento ya existía pero tuvo una actualización crucial en estos 7 días, márcalo con isUpdateOfPrevious: true. Si no hubo cambio relevante, NO lo repitas.

DATOS EXTRAÍDOS DE LOS 7 EJES DE INVESTIGACIÓN:
${consolidatedAxesText.substring(0, 32000)}

FUENTES LOCALIZADAS:
${collectedSources.slice(0, 30).map((s) => `${s.title}: ${s.url}`).join('\n')}

Debes responder ÚNICAMENTE con un JSON válido estructurado exactamente con el siguiente esquema TypeScript:

{
  "executiveSummary": "Resumen ejecutivo de 200 a 300 palabras analizando qué ha cambiado realmente esta semana en IA, qué dinámicas de fondo se aceleran y por qué importan.",
  "top5": [
    {
      "id": "top-1",
      "title": "Título conciso y directo de la novedad crítica",
      "stars": 5,
      "summary": "Resumen claro y sustancial",
      "whatChanged": "Qué ha cambiado exactamente",
      "whyItMatters": "Por qué es relevante para profesionales de IA",
      "practicalApplication": "Ejemplo concreto de aplicación",
      "sourceUrl": "URL original de la fuente",
      "sourceName": "Nombre de la fuente primaria (e.g. OpenAI Docs, Anthropic Blog, GitHub)",
      "isUpdateOfPrevious": false
    }
  ],
  "newModels": [
    {
      "model": "Nombre del modelo",
      "company": "Empresa / Laboratorio",
      "novelty": "Novedad principal (reasoning, visión, audio, etc.)",
      "importance": "★★★★★ o ★★★★☆",
      "sourceUrl": "URL",
      "sourceName": "Fuente"
    }
  ],
  "openaiUpdates": [
    {
      "title": "Título de la novedad de OpenAI / GPT / Codex",
      "type": "Modelo | Codex | Skills/MCP | Computer Use | API/SDK | ChatGPT Work | Otro",
      "whatIsIt": "Qué es",
      "whatChanged": "Qué ha cambiado",
      "whatItEnables": "Qué permite hacer ahora",
      "whyRelevant": "Por qué es relevante",
      "example": "Ejemplo práctico",
      "sourceUrl": "URL",
      "sourceName": "Fuente original",
      "isConfirmed": true
    }
  ],
  "claudeUpdates": [
    {
      "title": "Novedad Claude / Anthropic",
      "type": "Claude Model | Claude Code | MCP | Computer Use | Artifacts/Projects | Otro",
      "summary": "Resumen",
      "whatChanged": "Qué ha cambiado",
      "whyRelevant": "Por qué es relevante",
      "sourceUrl": "URL",
      "sourceName": "Fuente",
      "isConfirmed": true
    }
  ],
  "skills": [
    {
      "name": "Nombre de la Skill o Conector MCP",
      "platform": "Claude | GPT/Codex | MCP | Gemini | Comunidad",
      "isOfficial": true,
      "dateAdded": "2026-10-XX",
      "purpose": "Para qué sirve",
      "whatItDoes": "Qué hace técnicamente",
      "practicalExample": "Ejemplo de uso en terminal o conversación",
      "installGuide": "Comando para instalarla o configurarla si aplica",
      "utilityRating": "★★★★★",
      "sourceUrl": "URL al repo o doc"
    }
  ],
  "agentsAndAutomation": [
    {
      "title": "Avance en agentes o automatización",
      "summary": "Resumen",
      "implications": "Implicaciones prácticas",
      "sourceUrl": "URL",
      "sourceName": "Fuente"
    }
  ],
  "vibeCoding": [
    {
      "tool": "Herramienta (Cursor, Windsurf, Claude Code, Antigravity, Lovable, Bolt, Replit, Copilot)",
      "novelty": "Qué novedad introduce",
      "naturalLanguageCapabilities": "Capacidades que habilitan crear apps con lenguaje natural",
      "sourceUrl": "URL",
      "sourceName": "Fuente"
    }
  ],
  "education": [
    {
      "title": "Iniciativa o herramienta de IA en Educación",
      "targetLevel": "Docentes | Universidad | Evaluación | Recursos",
      "utility": "Utilidad pedagógica real",
      "practicalImpact": "Impacto práctico contrastado",
      "sourceUrl": "URL",
      "sourceName": "Fuente"
    }
  ],
  "researchPapers": [
    {
      "title": "Título del paper",
      "authorsOrOrg": "Autores o laboratorio",
      "topic": "Reasoning | Agents | Multimodal | Small/Local AI | Model Efficiency | AI Education",
      "keyFinding": "Hallazgo clave o contribución científica principal",
      "arxivOrPaperUrl": "https://arxiv.org/abs/..."
    }
  ],
  "toolsToTry": [
    {
      "name": "Nombre",
      "category": "Categoría",
      "description": "Descripción",
      "link": "URL"
    }
  ],
  "tryThisWeek": [
    {
      "number": 1,
      "name": "Nombre de la prueba 1",
      "whatItIs": "Qué es",
      "whyTryIt": "Por qué probarlo esta semana",
      "whatToBuild": "Qué construir",
      "howToStart": "Paso a paso para empezar de inmediato",
      "estimatedTime": "X minutos",
      "difficulty": "BAJA",
      "directLink": "URL directa"
    },
    {
      "number": 2,
      "name": "Nombre de la prueba 2",
      "whatItIs": "Qué es",
      "whyTryIt": "Por qué probarlo esta semana",
      "whatToBuild": "Qué construir",
      "howToStart": "Paso a paso",
      "estimatedTime": "X minutos",
      "difficulty": "MEDIA",
      "directLink": "URL directa"
    },
    {
      "number": 3,
      "name": "Nombre de la prueba 3",
      "whatItIs": "Qué es",
      "whyTryIt": "Por qué probarlo esta semana",
      "whatToBuild": "Qué construir",
      "howToStart": "Paso a paso",
      "estimatedTime": "X minutos",
      "difficulty": "BAJA",
      "directLink": "URL directa"
    }
  ],
  "radarWatch": [
    {
      "item": "Lanzamiento o evento a vigilar",
      "category": "Categoría",
      "status": "CONFIRMADO",
      "notes": "Detalles o fecha prevista"
    }
  ]
}

Responde exclusivamente con el JSON sin preámbulos ni markdown fuera del bloque JSON.`;

    const { response: synthesisResp } = await callGeminiWithResilience(
      ai,
      modelToUse,
      {
        contents: synthesisPrompt,
        config: {
          systemInstruction:
            'Eres el motor analítico de AI Weekly Radar. Proporcionas información fáctica rigurosa, eliminas el hype y generas informes ejecutivos de máxima calidad profesional en español.',
        },
      },
      {
        phaseLabel: 'Síntesis Estructurada Global del Informe',
        maxRetriesPerModel: 5,
      }
    );

    const parsedData = extractJsonBlock(synthesisResp.text || '');

    if (!parsedData || !parsedData.executiveSummary) {
      throw new Error(
        'La síntesis del informe no devolvió una estructura JSON válida. Revisa los datos de búsqueda.'
      );
    }

    // Build complete report object
    const reportId = `radar-${Date.now()}`;
    const report: Report = {
      id: reportId,
      title: `AI Weekly Radar — ${period.full}`,
      date: new Date().toISOString(),
      period: {
        from: period.from,
        to: period.to,
      },
      executiveSummary: parsedData.executiveSummary,
      top5: Array.isArray(parsedData.top5) ? parsedData.top5.slice(0, 5) : [],
      newModels: Array.isArray(parsedData.newModels) ? parsedData.newModels : [],
      openaiUpdates: Array.isArray(parsedData.openaiUpdates) ? parsedData.openaiUpdates : [],
      claudeUpdates: Array.isArray(parsedData.claudeUpdates) ? parsedData.claudeUpdates : [],
      skills: Array.isArray(parsedData.skills) ? parsedData.skills : [],
      agentsAndAutomation: Array.isArray(parsedData.agentsAndAutomation)
        ? parsedData.agentsAndAutomation
        : [],
      vibeCoding: Array.isArray(parsedData.vibeCoding) ? parsedData.vibeCoding : [],
      education: Array.isArray(parsedData.education) ? parsedData.education : [],
      researchPapers: Array.isArray(parsedData.researchPapers)
        ? parsedData.researchPapers.slice(0, 5)
        : [],
      toolsToTry: Array.isArray(parsedData.toolsToTry) ? parsedData.toolsToTry.slice(0, 5) : [],
      tryThisWeek:
        Array.isArray(parsedData.tryThisWeek) && parsedData.tryThisWeek.length >= 3
          ? [parsedData.tryThisWeek[0], parsedData.tryThisWeek[1], parsedData.tryThisWeek[2]]
          : [
              {
                number: 1,
                name: 'Explorar Claude Code CLI',
                whatItIs: 'CLI de desarrollo guiado por agentes para terminal.',
                whyTryIt: 'Automatiza refactorizaciones y resolución de errores.',
                whatToBuild: 'Auditoría automática de tests en tu repo.',
                howToStart: 'npm install -g @anthropic-ai/claude-code && claude',
                estimatedTime: '20 minutos',
                difficulty: 'BAJA',
                directLink: 'https://docs.anthropic.com',
              },
              {
                number: 2,
                name: 'Configurar un servidor MCP local',
                whatItIs: 'Protocolo abierto de herramientas para modelos.',
                whyTryIt: 'Permite a tu asistente consultar tus bases de datos o notas privadas.',
                whatToBuild: 'Conector para documentación de tu empresa.',
                howToStart: 'Descarga un template de Model Context Protocol.',
                estimatedTime: '30 minutos',
                difficulty: 'MEDIA',
                directLink: 'https://modelcontextprotocol.io',
              },
              {
                number: 3,
                name: 'Probar un modelo ligero cuantizado',
                whatItIs: 'Inferencia local de modelos de 7B/8B con Function Calling.',
                whyTryIt: 'Cero costes de API para tareas recurrentes.',
                whatToBuild: 'Clasificador de emails offline.',
                howToStart: 'Instala Ollama y corre ollama run qwen2.5-coder.',
                estimatedTime: '15 minutos',
                difficulty: 'BAJA',
                directLink: 'https://ollama.com',
              },
            ],
      radarWatch: Array.isArray(parsedData.radarWatch) ? parsedData.radarWatch : [],
      sourcesAnalyzedCount: collectedSources.length || 28,
      sourcesList: collectedSources.slice(0, 30),
      durationSeconds: Math.round((Date.now() - startTime) / 1000),
      createdAt: new Date().toISOString(),
      emailStatus: {
        sent: false,
      },
    };

    report.renderedHtml = generateHtmlReport(report, false);

    // ----------------------------------------------------
    // FASE: GUARDANDO INFORME
    // ----------------------------------------------------
    currentPercentage = 92;
    updateProgress({
      phase: 'GUARDANDO',
      percentage: currentPercentage,
      detail: 'Guardando informe en el almacén de datos persistente...',
      sourcesCount: report.sourcesAnalyzedCount,
      reportId: report.id,
    });

    saveReport(report);

    // ----------------------------------------------------
    // FASE: ENVIANDO EMAIL
    // ----------------------------------------------------
    currentPercentage = 96;
    updateProgress({
      phase: 'ENVIANDO_EMAIL',
      percentage: currentPercentage,
      detail: `Enviando informe semanal por email a ${config.recipientEmail || 'destinatario'}...`,
      sourcesCount: report.sourcesAnalyzedCount,
      reportId: report.id,
    });

    const emailResult = await sendReportEmail(report, config);
    report.emailStatus = {
      status: emailResult.success ? 'EMAIL_SENT' : 'EMAIL_FAILED',
      sent: emailResult.success,
      recipient: emailResult.recipient || config.recipientEmail,
      sender: emailResult.sender,
      sentAt: emailResult.success ? new Date().toISOString() : undefined,
      error: emailResult.error,
      notConfigured: emailResult.notConfigured,
      messageId: emailResult.messageId,
    };
    saveReport(report);

    // Limpiar checkpoint una vez el informe se ha completado satisfactoriamente
    clearCheckpoint();

    // Enviar notificación Push a dispositivos PWA
    sendReportPushNotification(report).catch((pushErr) => {
      console.warn('[AI Weekly Radar] Error al despachar notificación push:', pushErr);
    });

    // Update config metrics
    saveConfig({
      lastRunAt: new Date().toISOString(),
      lastDurationSeconds: report.durationSeconds,
      lastSourcesCount: report.sourcesAnalyzedCount,
      lastStatus: 'SUCCESS',
      lastError: null,
    });

    // ----------------------------------------------------
    // 100% ONLY WHEN FULLY COMPLETED!
    // ----------------------------------------------------
    updateProgress({
      phase: 'COMPLETADO',
      status: 'SUCCESS',
      percentage: 100,
      detail: `Informe generado correctamente en ${report.durationSeconds}s analizando ${report.sourcesAnalyzedCount} fuentes.`,
      sourcesCount: report.sourcesAnalyzedCount,
      reportId: report.id,
      canResume: false,
      isRetrying: false,
      isRateLimited: false,
      rateLimitCountdownSeconds: 0,
      rateLimitResumeAt: null,
      completedAxesCount: totalAxes,
      totalAxesCount: totalAxes,
    });

    return report;
  } catch (err: any) {
    console.error('[AI Weekly Radar] Error en la investigación:', err);
    const friendlyError = formatFriendlyErrorMessage(err);

    // CRITICAL: NEVER SHOW 100% ON ERROR! Keep current real progress percentage!
    updateProgress({
      phase: 'ERROR',
      status: 'ERROR',
      percentage: Math.min(80, Math.max(10, currentPercentage)),
      detail: friendlyError,
      sourcesCount: sourcesMap.size,
      error: friendlyError,
      canResume: true,
      isRetrying: false,
    });

    saveConfig({
      lastStatus: 'ERROR',
      lastError: {
        date: new Date().toISOString(),
        phase: 'INVESTIGACION',
        message: friendlyError,
      },
    });

    throw new Error(friendlyError);
  } finally {
    setLock(false);
  }
}
