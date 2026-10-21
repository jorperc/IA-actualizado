import { Report } from './types.js';
import { generateHtmlReport } from './htmlReportGenerator.js';

export function getInitialSeedReport(): Report {
  const seedReport: Report = {
    id: 'radar-rep-2026-10-w3',
    title: 'AI Weekly Radar — Informe Semanal de Inteligencia',
    date: '2026-10-21T08:00:00.000Z',
    period: {
      from: '14/10/2026',
      to: '21/10/2026',
    },
    executiveSummary:
      'Esta semana consolida un cambio fundamental de paradigma: la transición definitiva de los modelos conversacionales hacia sistemas de ejecución agéntica autónoma con Computer Use y Model Context Protocol (MCP). Anthropic ha acelerado drásticamente la integración de Claude Skills con Claude Code para desarrollo de software guiado por comandos de voz y texto; OpenAI ha reforzado su infraestructura de Skills para Codex con conectores empresariales de baja latencia; y Google ha extendido las capacidades de Gemini 3.8 y Antigravity para la generación multimodal continua en tiempo real. En el ámbito de la investigación, destacan papers cruciales sobre reasoning test-time compute y destilación de modelos pequeños para ejecución local sin degradación en matemáticas y código. Las herramientas de Vibe Coding continúan madurando con integraciones nativas de depuración iterativa.',
    top5: [
      {
        id: 'top-1',
        title: 'Claude Agent Skills & Claude Code: Ecosistema unificado de ejecución local',
        stars: 5,
        summary:
          'Anthropic ha actualizado la especificación de Claude Skills y Claude Code, permitiendo a los desarrolladores invocar habilidades agénticas personalizadas directamente desde la terminal con sandboxing de seguridad.',
        whatChanged:
          'Se introducen manifiestos de Skills con definición de tipos estricta y soporte para subagentes cooperativos bajo el protocolo MCP.',
        whyItMatters:
          'Reduce el tiempo de configuración de agentes especializados de horas a minutos, eliminando el boilerplate de integración entre herramientas.',
        practicalApplication:
          'Creación de flujos de refactorización masiva de repositorios, auditorías de seguridad en CI/CD y despliegues guiados por voz.',
        sourceUrl: 'https://docs.anthropic.com/claude/docs',
        sourceName: 'Anthropic Official Documentation & Engineering Changelog',
        isUpdateOfPrevious: false,
      },
      {
        id: 'top-2',
        title: 'OpenAI Codex & ChatGPT Work: Nuevos conectores y arquitectura de Skills',
        stars: 5,
        summary:
          'OpenAI amplía las capacidades empresariales de Codex y ChatGPT Work con conectores de memoria persistente y soporte para herramientas locales mediante protocolos abiertos.',
        whatChanged:
          'La API de asistentes añade soporte nativo para invocación de skills con validación schema-first y políticas de ejecución condicional.',
        whyItMatters:
          'Permite a organizaciones conectar sus bases de código privadas y documentación interna sin exponer secretos ni requerir reindexaciones costosas.',
        practicalApplication:
          'Onboarding automatizado de nuevos ingenieros a bases de código complejas y generación asistida de suites de testing extremo a extremo.',
        sourceUrl: 'https://openai.com/index',
        sourceName: 'OpenAI Newsroom & Developer Changelog',
        isUpdateOfPrevious: false,
      },
      {
        id: 'top-3',
        title: 'Google Gemini 3.8 & Antigravity: Agentes interactivos con Grounding Avanzado',
        stars: 5,
        summary:
          'Google DeepMind optimiza la inferencia de Gemini 3.8 y la suite Antigravity, incorporando verificación continua y grounding híbrido (Google Search + herramientas de código) en un solo paso de razonamiento.',
        whatChanged:
          'Mayor velocidad de respuesta en tareas de síntesis profunda y soporte oficial para agentes autónomos con ejecución segura de tareas de navegador.',
        whyItMatters:
          'Resuelve el problema de la desactualización factual en tiempo real al verificar automáticamente cada afirmación contra fuentes primarias indexadas.',
        practicalApplication:
          'Generación de informes de inteligencia de mercado en tiempo real y automatización de análisis documental para investigación científica.',
        sourceUrl: 'https://ai.google.dev',
        sourceName: 'Google AI for Developers Announcements',
        isUpdateOfPrevious: false,
      },
      {
        id: 'top-4',
        title: 'Vibe Coding de segunda generación: Cursor y Windsurf adoptan ejecución multi-archivo nativa',
        stars: 4,
        summary:
          'Los editores centrados en lenguaje natural actualizan sus motores de contexto para admitir generación y edición paralela en decenas de archivos sin pérdida de coherencia sintáctica.',
        whatChanged:
          'Análisis de grafo de dependencias en memoria que predice los efectos colaterales de cambios en tipos de TypeScript antes de escribir los archivos.',
        whyItMatters:
          'Disminuye en más del 70% los errores por referencias rotas o importaciones obsoletas cuando se crean aplicaciones completas desde un solo prompt.',
        practicalApplication:
          'Prototipado rápido de arquitecturas de microservicios y refactorización completa de componentes frontend a Tailwind v4.',
        sourceUrl: 'https://cursor.com/blog',
        sourceName: 'Cursor Engineering Blog',
        isUpdateOfPrevious: true,
      },
      {
        id: 'top-5',
        title: 'IA en Educación: Sistemas de tutoría socrática adaptativa validados empíricamente',
        stars: 4,
        summary:
          'Publicación de resultados preliminares a gran escala sobre agentes de tutoría que guían a los estudiantes sin entregar las respuestas directas, aumentando un 38% la retención conceptual.',
        whatChanged:
          'Modelos calibrados específicamente para retroalimentación formativa y detección de concepciones erróneas comunes en ciencias e ingeniería.',
        whyItMatters:
          'Proporciona a universidades y centros educativos una alternativa pedagógicamente sólida frente a los chatbots que resuelven tareas sin aprendizaje.',
        practicalApplication:
          'Implementación de asistentes de laboratorio para prácticas de programación y física experimental en plataformas universitarias.',
        sourceUrl: 'https://arxiv.org/abs/2410.12345',
        sourceName: 'arXiv Educational AI Research & Benchmarks',
        isUpdateOfPrevious: false,
      },
    ],
    newModels: [
      {
        model: 'Gemini 3.8 Flash',
        company: 'Google / DeepMind',
        novelty: 'Baja latencia con soporte de Search Grounding nativo y alta fidelidad en síntesis',
        importance: '★★★★★',
        sourceUrl: 'https://ai.google.dev',
        sourceName: 'Google AI Docs',
      },
      {
        model: 'Claude 3.7 Sonnet (Hybrid Reasoning)',
        company: 'Anthropic',
        novelty: 'Capacidades de razonamiento extendido seleccionable y control fino de tokens de pensamiento',
        importance: '★★★★★',
        sourceUrl: 'https://www.anthropic.com/news',
        sourceName: 'Anthropic News',
      },
      {
        model: 'Qwen 2.5 Coder 32B Instruct',
        company: 'Alibaba Cloud',
        novelty: 'Rendimiento en coding competitivo con modelos frontera en pesos abiertos para hosting local',
        importance: '★★★★☆',
        sourceUrl: 'https://github.com/QwenLM/Qwen2.5-Coder',
        sourceName: 'GitHub QwenLM',
      },
      {
        model: 'DeepSeek-V3 MoE',
        company: 'DeepSeek',
        novelty: 'Arquitectura Multi-head Latent Attention con inferencia ultra-económica',
        importance: '★★★★☆',
        sourceUrl: 'https://github.com/deepseek-ai',
        sourceName: 'DeepSeek Official',
      },
    ],
    openaiUpdates: [
      {
        title: 'Actualización en el SDK de Asistentes & Conectores de Skills',
        type: 'Skills/MCP',
        whatIsIt: 'Nueva API de definición de herramientas estructuradas para ChatGPT Work y Codex.',
        whatChanged: 'Soporte para esquemas JSON estrictos y reintentos automáticos en llamadas fallidas a endpoints externos.',
        whatItEnables: 'Permite invocar servicios internos corporativos sin requerir middleware de validación manual.',
        whyRelevant: 'Garantiza que el modelo devuelva parámetros 100% tipados respetando el contrato de la API.',
        example: 'Invocación de base de datos SQL con comprobación previa de permisos RBAC del usuario.',
        sourceUrl: 'https://platform.openai.com/docs/changelog',
        sourceName: 'OpenAI Developer Changelog',
        isConfirmed: true,
      },
      {
        title: 'Optimización de latencia en llamadas con Structured Outputs',
        type: 'API/SDK',
        whatIsIt: 'Mejora en el compilador de gramáticas formales para respuestas estructuradas en modelos GPT.',
        whatChanged: 'Reducción del tiempo hasta el primer token en un 40% en esquemas JSON anidados.',
        whatItEnables: 'Construcción de interfaces interactivas donde la respuesta del backend se espera en menos de 1 segundo.',
        whyRelevant: 'Clave para agentes en tiempo real y aplicaciones web responsivas.',
        example: 'Extracción de entidades médicas o financieras complejas con respuesta inmediata al usuario.',
        sourceUrl: 'https://platform.openai.com/docs',
        sourceName: 'OpenAI Documentation',
        isConfirmed: true,
      },
    ],
    claudeUpdates: [
      {
        title: 'Evolución de Claude Code: Modo Multi-Archivo y CLI nativo',
        type: 'Claude Code',
        summary: 'Nueva versión de la herramienta CLI de Anthropic orientada a flujos de trabajo de terminal para ingeniería de software.',
        whatChanged: 'Integración nativa con git, ejecución de tests en sandbox y comprensión contextual del árbol de directorios.',
        whyRelevant: 'Permite resolver incidencias de GitHub y refactorizar componentes completos desde una sola orden.',
        sourceUrl: 'https://docs.anthropic.com/claude/docs/claude-code',
        sourceName: 'Anthropic Docs',
        isConfirmed: true,
      },
      {
        title: 'Despliegue de subagentes en Claude Projects',
        type: 'Artifacts/Projects',
        summary: 'Capacidad de delegar subtareas a agentes secundarios con contextos independientes dentro del mismo proyecto.',
        whatChanged: 'Evita la contaminación del contexto principal al derivar búsquedas o análisis pesados a subhilos.',
        whyRelevant: 'Mantiene alta la precisión en conversaciones extensas de diseño de software y análisis de datos.',
        sourceUrl: 'https://anthropic.com',
        sourceName: 'Anthropic Engineering',
        isConfirmed: true,
      },
    ],
    skills: [
      {
        name: 'claude-skill-postgres-mcp',
        platform: 'Claude',
        isOfficial: true,
        dateAdded: '2026-10-18',
        purpose: 'Inspección y optimización de bases de datos relacionales',
        whatItDoes: 'Permite a Claude ejecutar consultas EXPLAIN ANALYZE seguras y proponer índices óptimos directamente en Postgres.',
        practicalExample: 'claude "analiza la lentitud de la consulta de usuarios en la tabla de facturas y sugiéreme un índice parcial"',
        installGuide: 'npx @modelcontextprotocol/server-postgres "postgresql://localhost/mydb"',
        utilityRating: '★★★★★ (Imprescindible para backend)',
        sourceUrl: 'https://github.com/modelcontextprotocol/servers',
      },
      {
        name: 'codex-skill-test-runner',
        platform: 'GPT/Codex',
        isOfficial: false,
        dateAdded: '2026-10-17',
        purpose: 'Generación y ejecución iterativa de suites de pruebas Vitest/Jest',
        whatItDoes: 'Lee los fallos del terminal y ajusta el código del test o de la función hasta obtener pase en verde.',
        practicalExample: 'codex test --watch --auto-fix',
        installGuide: 'npm install -g codex-skill-test-runner',
        utilityRating: '★★★★☆ (Excelente para TDD)',
        sourceUrl: 'https://github.com/community-ai/codex-skills',
      },
      {
        name: 'mcp-github-enterprise-connector',
        platform: 'MCP',
        isOfficial: true,
        dateAdded: '2026-10-19',
        purpose: 'Automatización de revisiones de Pull Requests en repositorios privados',
        whatItDoes: 'Compara cambios de sintaxis, detecta fallos de arquitectura y redacta comentarios constructivos línea por línea.',
        practicalExample: 'Revisión automática de dependencias y vulnerabilidades en PR entrantes.',
        installGuide: 'docker run -i --rm -e GITHUB_TOKEN mcp/github',
        utilityRating: '★★★★★ (Ahorro de horas en code reviews)',
        sourceUrl: 'https://modelcontextprotocol.io',
      },
    ],
    agentsAndAutomation: [
      {
        title: 'Arquitectura ReAct con verificación formal para agentes de pago',
        summary: 'Nuevos estándares industriales para que agentes financieros no ejecuten transacciones sin doble confirmación en clave pública.',
        implications: 'Establece el estándar de seguridad para la adopción corporativa de agentes con acceso a banca y APIs de terceros.',
        sourceUrl: 'https://arxiv.org',
        sourceName: 'Financial AI Consortium',
      },
      {
        title: 'Model Context Protocol (MCP) supera los 1.000 servidores comunitarios',
        summary: 'El estándar abierto de integración de herramientas impulsado por Anthropic se convierte en el estándar de facto adoptado por múltiples plataformas.',
        implications: 'Permite interoperabilidad entre herramientas sin depender de formatos cerrados de un solo proveedor.',
        sourceUrl: 'https://modelcontextprotocol.io',
        sourceName: 'MCP Foundation',
      },
    ],
    vibeCoding: [
      {
        tool: 'Cursor IDE v0.42',
        novelty: 'Modo Composer con autocompletado especulativo en tiempo real en TypeScript y Python.',
        naturalLanguageCapabilities: 'Permite escribir: "Añade un modal de confirmación con Tailwind y conéctalo al endpoint de borrado" y genera los cambios sincronizados.',
        sourceUrl: 'https://cursor.com',
        sourceName: 'Cursor Changelog',
      },
      {
        tool: 'Windsurf Cascade 2.0',
        novelty: 'Memoria de sesiones prolongada con indexación de arquitectura de repositorio en disco.',
        naturalLanguageCapabilities: 'Comprende el estilo de diseño existente del proyecto antes de sugerir nuevas vistas o componentes.',
        sourceUrl: 'https://codeium.com/windsurf',
        sourceName: 'Windsurf Blog',
      },
      {
        tool: 'Google AI Studio Antigravity',
        novelty: 'Edición en caliente de aplicaciones web full-stack guiadas por lenguaje natural con previsualización segura en Cloud Run.',
        naturalLanguageCapabilities: 'Modifica el backend Express y frontend React en una única instrucción conversacional.',
        sourceUrl: 'https://ai.google.dev',
        sourceName: 'Google Cloud Platform',
      },
    ],
    education: [
      {
        title: 'Tutor Socrático Abierto para Programación Universitaria',
        targetLevel: 'Educación Superior / Universidad',
        utility: 'Guía al alumno haciéndole preguntas dirigidas sobre la complejidad temporal en lugar de facilitarle el algoritmo terminado.',
        practicalImpact: 'Fomenta el pensamiento crítico y evita la dependencia pasiva de herramientas generativas en estudiantes de ingeniería.',
        sourceUrl: 'https://acm.org',
        sourceName: 'ACM Education Conference Preprint',
      },
      {
        title: 'Generador de Rúbricas de Evaluación Alineadas con Competencias',
        targetLevel: 'Docentes de Secundaria y Bachillerato',
        utility: 'Diseña matrices de evaluación objetivas con criterios claros para trabajos por proyectos.',
        practicalImpact: 'Ahorro de hasta un 60% de tiempo de preparación para docentes manteniendo la rigurosidad pedagógica.',
        sourceUrl: 'https://educacion.gob.es',
        sourceName: 'Observatorio Tecnológico Educativo',
      },
    ],
    researchPapers: [
      {
        title: 'Scaling Test-Time Compute without Degradation in Factual Precision',
        authorsOrOrg: 'Stanford University & Google DeepMind',
        topic: 'Reasoning',
        keyFinding: 'Asignar presupuesto de computación adaptativo en el momento de inferencia reduce las alucinaciones en un 42% en problemas de lógica simbólica.',
        arxivOrPaperUrl: 'https://arxiv.org/abs/2410.18001',
      },
      {
        title: 'Autonomous Subagent Networks with Formal MCP Protocols',
        authorsOrOrg: 'MIT CSAIL & Anthropic Researchers',
        topic: 'Agents',
        keyFinding: 'La especialización de agentes pequeños con protocolos de comunicación formales supera a modelos gigantes generalistas en tareas complejas de refactorización.',
        arxivOrPaperUrl: 'https://arxiv.org/abs/2410.18520',
      },
      {
        title: 'Pedagogical Prompting: Empirical Validation of Scaffolded AI Feedback in Higher Education',
        authorsOrOrg: 'Oxford Department of Education',
        topic: 'AI Education',
        keyFinding: 'El andamiaje cognitivo progresivo mediante LLMs mejora significativamente la resolución autónoma de problemas frente a la retroalimentación tradicional.',
        arxivOrPaperUrl: 'https://arxiv.org/abs/2410.19012',
      },
      {
        title: 'Distillation of Frontier Reasoning into 8B Edge Models',
        authorsOrOrg: 'UC Berkeley & DeepSeek Lab',
        topic: 'Small/Local AI',
        keyFinding: 'Técnicas de destilación con cadena de pensamiento verificada permiten que modelos de 8 mil millones de parámetros alcancen un 85% de precisión en GSM8K en hardware doméstico.',
        arxivOrPaperUrl: 'https://arxiv.org/abs/2410.19340',
      },
    ],
    toolsToTry: [
      {
        name: 'MCP Inspector',
        category: 'Desarrollo de Agentes',
        description: 'Herramienta interactiva de depuración para probar servidores y herramientas del protocolo Model Context Protocol localmente.',
        link: 'https://github.com/modelcontextprotocol/inspector',
      },
      {
        name: 'Ollama v0.5',
        category: 'Modelos Locales',
        description: 'Soporte mejorado de cuantización y llamadas a herramientas (function calling) en modelos open-weights pequeños.',
        link: 'https://ollama.com',
      },
      {
        name: 'Claude Code CLI',
        category: 'Terminal / Vibe Coding',
        description: 'Asistente de ingeniería por terminal para git, tests y refactorización guiada por lenguaje natural.',
        link: 'https://docs.anthropic.com',
      },
      {
        name: 'uv Python Package Manager',
        category: 'Herramientas de Ecosistema',
        description: 'Gestor de dependencias y entornos virtuales en Rust con velocidad extrema para pipelines de IA.',
        link: 'https://astral.sh/uv',
      },
    ],
    tryThisWeek: [
      {
        number: 1,
        name: 'Explorar Claude Code CLI en un proyecto local',
        whatItIs: 'La nueva interfaz de línea de comandos de Anthropic para programar, depurar y hacer tests guiados por Claude.',
        whyTryIt: 'Representa el flujo de trabajo de programación más ágil en terminal de la actualidad.',
        whatToBuild: 'Pídele que examine un bug en tus tests unitarios y proponga el fix con un comando git commit directo.',
        howToStart: 'Ejecuta `npm install -g @anthropic-ai/claude-code` y corre `claude` en el directorio de tu proyecto.',
        estimatedTime: '20 minutos',
        difficulty: 'BAJA',
        directLink: 'https://docs.anthropic.com/claude/docs/claude-code',
      },
      {
        number: 2,
        name: 'Montar un servidor MCP de lectura de documentación local',
        whatItIs: 'Un conector estándar que da acceso a tu modelo a carpetas de notas en Markdown o documentación interna.',
        whyTryIt: 'Te permite usar tus manuales y notas privadas como contexto directo en Claude Desktop o Cursor.',
        whatToBuild: 'Conectar tus guías de arquitectura para que el asistente conozca las reglas del equipo.',
        howToStart: 'Descarga el template de `@modelcontextprotocol/server-filesystem` y añade la ruta en tu archivo de configuración.',
        estimatedTime: '30 minutos',
        difficulty: 'MEDIA',
        directLink: 'https://modelcontextprotocol.io',
      },
      {
        number: 3,
        name: 'Probar un modelo de 8B cuantizado con Function Calling en local',
        whatItIs: 'Ejecución en tu propio ordenador de un modelo local capaz de invocar APIs y funciones estructuradas.',
        whyTryIt: 'Privacidad total y cero costes de API para tareas repetitivas de análisis de datos o redacción interna.',
        whatToBuild: 'Un clasificador de correos o resumidor de tickets confidenciales sin conexión a internet.',
        howToStart: 'Instala Ollama y descarga el modelo con `ollama run qwen2.5-coder:7b`.',
        estimatedTime: '15 minutos',
        difficulty: 'BAJA',
        directLink: 'https://ollama.com',
      },
    ],
    radarWatch: [
      {
        item: 'Próxima generación de modelos de razonamiento OpenAI (o3 / series avanzadas)',
        category: 'Modelos Frontera',
        status: 'CONFIRMADO',
        notes: 'Anunciado por liderazgo técnico de OpenAI con foco en benchmarks matemáticos y científicos complejos.',
      },
      {
        item: 'Expansión de Computer Use en entornos móviles y navegador seguro',
        category: 'Agentes Autónomos',
        status: 'PREVISTO OFICIALMENTE',
        notes: 'Pruebas preliminares para navegación web asistida con prevención de ataques por inyección indirecta de prompt.',
      },
      {
        item: 'Integración de Gemini Deep Research en interfaces corporativas de Workspace',
        category: 'Herramientas de Productividad',
        status: 'PREVISTO OFICIALMENTE',
        notes: 'Despliegue gradual previsto para cuentas empresariales con síntesis exhaustiva de fuentes en Docs y Sheets.',
      },
      {
        item: 'Especulaciones sobre GPT-5 o arquitectura unificada no-MoE',
        category: 'Arquitectura',
        status: 'RUMOR',
        notes: 'Debates en redes sociales sin respaldo en changelogs oficiales ni declaraciones de OpenAI. Tratar con cautela.',
      },
    ],
    sourcesAnalyzedCount: 42,
    sourcesList: [
      { title: 'OpenAI Newsroom and Documentation', url: 'https://openai.com/index', domain: 'openai.com' },
      { title: 'Anthropic Official Blog & Changelog', url: 'https://www.anthropic.com/news', domain: 'anthropic.com' },
      { title: 'Google AI Developer Portal', url: 'https://ai.google.dev', domain: 'ai.google.dev' },
      { title: 'Model Context Protocol Specification', url: 'https://modelcontextprotocol.io', domain: 'modelcontextprotocol.io' },
      { title: 'arXiv CS AI Preprints', url: 'https://arxiv.org', domain: 'arxiv.org' },
      { title: 'Cursor Changelog & Documentation', url: 'https://cursor.com', domain: 'cursor.com' },
      { title: 'GitHub Official Repositories', url: 'https://github.com', domain: 'github.com' },
    ],
    durationSeconds: 38,
    createdAt: '2026-10-21T08:00:38.000Z',
    emailStatus: {
      sent: false,
      notConfigured: true,
    },
  };

  seedReport.renderedHtml = generateHtmlReport(seedReport, false);
  return seedReport;
}
