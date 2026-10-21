import { Report, Top5Item, ModelItem, OpenAIItem, ClaudeItem, SkillItem, TryThisWeekItem } from './types.js';

function renderStars(count: number): string {
  const full = '★'.repeat(Math.min(5, Math.max(1, count)));
  const empty = '☆'.repeat(Math.max(0, 5 - count));
  let label = 'INTERESANTE';
  if (count >= 5) label = 'CRÍTICA';
  else if (count >= 4) label = 'MUY IMPORTANTE';
  return `<span style="color: #d97706; font-weight: 700; letter-spacing: 2px;">${full}${empty}</span> <span style="font-size: 11px; text-transform: uppercase; color: #78716c; font-weight: 600; margin-left: 4px;">(${label})</span>`;
}

export function generateHtmlReport(report: Report, isEmailVersion: boolean = false): string {
  const periodText = `${report.period.from} – ${report.period.to}`;

  const top5Html = report.top5
    .map(
      (item: Top5Item, idx: number) => `
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin-bottom: 16px; background-color: #ffffff; box-shadow: 0 1px 3px rgba(0,0,0,0.04);">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
          <h3 style="margin: 0; font-size: 18px; color: #0f172a; font-weight: 700;">
            <span style="display: inline-block; background-color: #0284c7; color: white; border-radius: 50%; width: 24px; height: 24px; text-align: center; line-height: 24px; font-size: 13px; margin-right: 8px;">${idx + 1}</span>
            ${item.title}
          </h3>
          <div>${renderStars(item.stars)}</div>
        </div>
        ${item.isUpdateOfPrevious ? '<div style="display: inline-block; background-color: #fef3c7; color: #92400e; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px; margin-bottom: 10px;">🔄 ACTUALIZACIÓN DE UNA NOVEDAD ANTERIOR</div>' : ''}
        <p style="margin: 8px 0 12px 0; color: #334155; font-size: 15px; line-height: 1.5;">${item.summary}</p>
        
        <div style="display: grid; grid-template-columns: 1fr; gap: 8px; background-color: #f8fafc; padding: 12px; border-radius: 6px; font-size: 14px; margin-bottom: 12px;">
          <div><strong style="color: #0f172a;">Qué cambia:</strong> <span style="color: #475569;">${item.whatChanged}</span></div>
          <div><strong style="color: #0f172a;">Por qué importa:</strong> <span style="color: #475569;">${item.whyItMatters}</span></div>
          <div><strong style="color: #0f172a;">Aplicación práctica:</strong> <span style="color: #475569;">${item.practicalApplication}</span></div>
        </div>

        <div style="font-size: 13px; color: #64748b;">
          <strong>Fuente original:</strong> 
          <a href="${item.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: underline; word-break: break-all;">
            ${item.sourceName || item.sourceUrl}
          </a>
        </div>
      </div>
    `
    )
    .join('');

  const newModelsTable =
    report.newModels.length > 0
      ? `
    <div style="overflow-x: auto; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
        <thead>
          <tr style="background-color: #f1f5f9; color: #0f172a; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 10px 12px;">Modelo</th>
            <th style="padding: 10px 12px;">Empresa</th>
            <th style="padding: 10px 12px;">Novedad</th>
            <th style="padding: 10px 12px;">Importancia</th>
            <th style="padding: 10px 12px;">Fuente</th>
          </tr>
        </thead>
        <tbody>
          ${report.newModels
            .map(
              (m: ModelItem) => `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">${m.model}</td>
              <td style="padding: 10px 12px; color: #475569;">${m.company}</td>
              <td style="padding: 10px 12px; color: #334155;">${m.novelty}</td>
              <td style="padding: 10px 12px;"><span style="background-color: #e0f2fe; color: #0369a1; padding: 2px 8px; border-radius: 4px; font-size: 12px; font-weight: 600;">${m.importance}</span></td>
              <td style="padding: 10px 12px;"><a href="${m.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: underline;">${m.sourceName || 'Enlace'}</a></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `
      : '<p style="color: #64748b; font-style: italic;">Sin nuevos modelos significativos verificados en este ciclo.</p>';

  const openaiHtml = report.openaiUpdates
    .map(
      (item: OpenAIItem) => `
      <div style="border-left: 4px solid #10a37f; background-color: #ffffff; border: 1px solid #e2e8f0; border-left-width: 4px; border-radius: 6px; padding: 16px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
          <h4 style="margin: 0; font-size: 16px; color: #0f172a; font-weight: 700;">${item.title}</h4>
          <span style="background-color: #ecfdf5; color: #065f46; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">${item.type}</span>
        </div>
        ${!item.isConfirmed ? '<span style="background-color: #fef2f2; color: #991b1b; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; margin-bottom: 8px; display: inline-block;">⚠️ NO CONFIRMADO</span>' : ''}
        <p style="margin: 4px 0 8px 0; color: #334155; font-size: 14px;"><strong>Qué es:</strong> ${item.whatIsIt}</p>
        <p style="margin: 4px 0 8px 0; color: #334155; font-size: 14px;"><strong>Qué ha cambiado:</strong> ${item.whatChanged}</p>
        <p style="margin: 4px 0 8px 0; color: #334155; font-size: 14px;"><strong>Qué permite hacer ahora:</strong> ${item.whatItEnables}</p>
        <p style="margin: 4px 0 8px 0; color: #334155; font-size: 14px;"><strong>Por qué es relevante:</strong> ${item.whyRelevant}</p>
        <div style="background-color: #f8fafc; border-radius: 4px; padding: 8px 12px; margin: 8px 0; font-size: 13px; color: #0f172a;">
          <strong>Ejemplo práctico:</strong> ${item.example}
        </div>
        <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
          <strong>Fuente oficial/original:</strong> <a href="${item.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color: #10a37f; text-decoration: underline;">${item.sourceName || item.sourceUrl}</a>
        </div>
      </div>
    `
    )
    .join('');

  const claudeHtml = report.claudeUpdates
    .map(
      (item: ClaudeItem) => `
      <div style="border-left: 4px solid #d97706; background-color: #ffffff; border: 1px solid #e2e8f0; border-left-width: 4px; border-radius: 6px; padding: 16px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; flex-wrap: wrap; gap: 6px;">
          <h4 style="margin: 0; font-size: 16px; color: #0f172a; font-weight: 700;">${item.title}</h4>
          <span style="background-color: #fffbeb; color: #92400e; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 4px;">${item.type}</span>
        </div>
        <p style="margin: 4px 0 8px 0; color: #334155; font-size: 14px;">${item.summary}</p>
        <p style="margin: 4px 0 8px 0; color: #334155; font-size: 14px;"><strong>Qué ha cambiado:</strong> ${item.whatChanged}</p>
        <p style="margin: 4px 0 8px 0; color: #334155; font-size: 14px;"><strong>Por qué es relevante:</strong> ${item.whyRelevant}</p>
        <div style="font-size: 12px; color: #64748b; margin-top: 6px;">
          <strong>Fuente original:</strong> <a href="${item.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color: #d97706; text-decoration: underline;">${item.sourceName || item.sourceUrl}</a>
        </div>
      </div>
    `
    )
    .join('');

  const skillsTable =
    report.skills.length > 0
      ? `
    <div style="overflow-x: auto; margin-bottom: 24px;">
      <table style="width: 100%; border-collapse: collapse; font-size: 14px; text-align: left; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px;">
        <thead>
          <tr style="background-color: #f1f5f9; color: #0f172a; border-bottom: 2px solid #cbd5e1;">
            <th style="padding: 10px 12px;">Skill / MCP</th>
            <th style="padding: 10px 12px;">Plataforma</th>
            <th style="padding: 10px 12px;">Origen</th>
            <th style="padding: 10px 12px;">Función y Qué hace</th>
            <th style="padding: 10px 12px;">Ejemplo Práctico & Uso</th>
            <th style="padding: 10px 12px;">Utilidad</th>
            <th style="padding: 10px 12px;">Fuente</th>
          </tr>
        </thead>
        <tbody>
          ${report.skills
            .map(
              (s: SkillItem) => `
            <tr style="border-bottom: 1px solid #e2e8f0; vertical-align: top;">
              <td style="padding: 10px 12px; font-weight: 700; color: #0f172a;">${s.name}</td>
              <td style="padding: 10px 12px; color: #475569;"><span style="background-color: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px;">${s.platform}</span></td>
              <td style="padding: 10px 12px;">
                ${
                  s.isOfficial
                    ? '<span style="background-color: #ecfdf5; color: #065f46; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">OFICIAL</span>'
                    : '<span style="background-color: #f3f4f6; color: #374151; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">COMUNIDAD</span>'
                }
              </td>
              <td style="padding: 10px 12px; color: #334155;"><strong>${s.purpose}:</strong> ${s.whatItDoes}</td>
              <td style="padding: 10px 12px; color: #475569; font-size: 13px;">${s.practicalExample} ${s.installGuide ? `<div style="margin-top: 4px; font-family: monospace; font-size: 11px; color: #0284c7;">${s.installGuide}</div>` : ''}</td>
              <td style="padding: 10px 12px; font-weight: 600; color: #0284c7;">${s.utilityRating}</td>
              <td style="padding: 10px 12px;"><a href="${s.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: underline;">Enlace</a></td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    </div>
  `
      : '<p style="color: #64748b; font-style: italic;">Sin nuevas skills destacadas esta semana.</p>';

  const vibeCodingHtml = report.vibeCoding
    .map(
      (item) => `
      <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 12px; background-color: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <h4 style="margin: 0; font-size: 15px; color: #0f172a; font-weight: 700;">💻 ${item.tool}</h4>
          <a href="${item.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; font-size: 12px; text-decoration: underline;">${item.sourceName || 'Fuente'}</a>
        </div>
        <p style="margin: 4px 0 6px 0; color: #334155; font-size: 14px;"><strong>Novedad:</strong> ${item.novelty}</p>
        <p style="margin: 0; color: #475569; font-size: 13px;"><strong>Capacidad con lenguaje natural:</strong> ${item.naturalLanguageCapabilities}</p>
      </div>
    `
    )
    .join('');

  const educationHtml = report.education
    .map(
      (item) => `
      <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px; margin-bottom: 12px; background-color: #ffffff;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <h4 style="margin: 0; font-size: 15px; color: #0f172a; font-weight: 700;">🎓 ${item.title}</h4>
          <span style="background-color: #eff6ff; color: #1e40af; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px;">${item.targetLevel}</span>
        </div>
        <p style="margin: 4px 0 6px 0; color: #334155; font-size: 14px;"><strong>Utilidad:</strong> ${item.utility}</p>
        <p style="margin: 0; color: #475569; font-size: 13px;"><strong>Impacto práctico pedagógico:</strong> ${item.practicalImpact}</p>
        <div style="margin-top: 6px; font-size: 12px;"><a href="${item.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: underline;">Fuente: ${item.sourceName || item.sourceUrl}</a></div>
      </div>
    `
    )
    .join('');

  const papersHtml = report.researchPapers
    .slice(0, 5)
    .map(
      (paper) => `
      <div style="border-left: 3px solid #6366f1; background-color: #ffffff; border: 1px solid #e2e8f0; border-left-width: 3px; border-radius: 6px; padding: 14px; margin-bottom: 12px;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px; gap: 8px;">
          <h4 style="margin: 0; font-size: 15px; color: #0f172a; font-weight: 700;">🔬 ${paper.title}</h4>
          <span style="background-color: #e0e7ff; color: #3730a3; font-size: 11px; font-weight: 700; padding: 2px 6px; border-radius: 4px; white-space: nowrap;">${paper.topic}</span>
        </div>
        <div style="font-size: 12px; color: #64748b; margin-bottom: 6px;">Autores / Org: ${paper.authorsOrOrg}</div>
        <p style="margin: 4px 0 8px 0; color: #334155; font-size: 13px; line-height: 1.4;"><strong>Hallazgo clave:</strong> ${paper.keyFinding}</p>
        <a href="${paper.arxivOrPaperUrl}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; font-size: 12px; font-weight: 600; text-decoration: underline;">📄 Ver Paper / arXiv</a>
      </div>
    `
    )
    .join('');

  const tryThisWeekHtml = report.tryThisWeek
    .map(
      (item: TryThisWeekItem) => `
      <div style="border: 2px solid #0284c7; border-radius: 8px; padding: 18px; margin-bottom: 16px; background-color: #f0f9ff;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; flex-wrap: wrap; gap: 8px;">
          <h3 style="margin: 0; font-size: 17px; color: #0369a1; font-weight: 700;">
            #${item.number}: ${item.name}
          </h3>
          <div style="display: flex; gap: 6px;">
            <span style="background-color: #bae6fd; color: #0369a1; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px;">⏱ ${item.estimatedTime}</span>
            <span style="background-color: ${item.difficulty === 'BAJA' ? '#bbf7d0' : item.difficulty === 'MEDIA' ? '#fef08a' : '#fecaca'}; color: #0f172a; font-size: 11px; font-weight: 700; padding: 2px 8px; border-radius: 12px;">Dificultad: ${item.difficulty}</span>
          </div>
        </div>
        <p style="margin: 4px 0 6px 0; color: #0f172a; font-size: 14px;"><strong>Qué es:</strong> ${item.whatItIs}</p>
        <p style="margin: 4px 0 6px 0; color: #0f172a; font-size: 14px;"><strong>Por qué probarlo:</strong> ${item.whyTryIt}</p>
        <p style="margin: 4px 0 6px 0; color: #0f172a; font-size: 14px;"><strong>Qué podrías hacer con ello:</strong> ${item.whatToBuild}</p>
        <div style="background-color: #ffffff; border-radius: 6px; padding: 10px 12px; margin: 8px 0; font-size: 13px; color: #334155; border: 1px solid #bae6fd;">
          <strong>Cómo empezar:</strong> ${item.howToStart}
        </div>
        <div style="margin-top: 10px;">
          <a href="${item.directLink}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 600; padding: 6px 14px; border-radius: 6px;">
            Acceder a la herramienta / documentación →
          </a>
        </div>
      </div>
    `
    )
    .join('');

  const radarHtml = report.radarWatch
    .map((item) => {
      let badgeColor = '#ecfdf5';
      let textColor = '#065f46';
      if (item.status === 'PREVISTO OFICIALMENTE') {
        badgeColor = '#fffbeb';
        textColor = '#92400e';
      } else if (item.status === 'RUMOR') {
        badgeColor = '#fef2f2';
        textColor = '#991b1b';
      }

      return `
        <div style="border-bottom: 1px solid #e2e8f0; padding: 10px 0; display: flex; justify-content: space-between; align-items: flex-start; gap: 12px;">
          <div style="flex: 1;">
            <div style="font-weight: 700; color: #0f172a; font-size: 14px;">${item.item}</div>
            <div style="color: #64748b; font-size: 13px; margin-top: 2px;">${item.notes}</div>
          </div>
          <span style="background-color: ${badgeColor}; color: ${textColor}; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 4px; white-space: nowrap;">
            ${item.status}
          </span>
        </div>
      `;
    })
    .join('');

  const toolsHtml = report.toolsToTry
    .slice(0, 5)
    .map(
      (t) => `
      <li style="margin-bottom: 8px; font-size: 14px; color: #334155;">
        <strong style="color: #0f172a;">${t.name}</strong> (${t.category}): ${t.description} — 
        <a href="${t.link}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: underline;">Probar</a>
      </li>
    `
    )
    .join('');

  const agentsHtml = report.agentsAndAutomation
    .map(
      (a) => `
      <div style="border: 1px solid #e2e8f0; border-radius: 6px; padding: 12px; margin-bottom: 10px; background-color: #ffffff;">
        <h4 style="margin: 0 0 4px 0; font-size: 15px; color: #0f172a; font-weight: 700;">⚙️ ${a.title}</h4>
        <p style="margin: 0 0 4px 0; color: #334155; font-size: 13px;">${a.summary}</p>
        <p style="margin: 0; color: #64748b; font-size: 12px;"><strong>Implicaciones:</strong> ${a.implications} — <a href="${a.sourceUrl}" target="_blank" rel="noopener noreferrer" style="color: #0284c7;">Fuente</a></p>
      </div>
    `
    )
    .join('');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AI Weekly Radar — ${periodText}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; color: #1e293b; line-height: 1.6;">
  <div style="max-width: 860px; margin: 0 auto; padding: 24px 16px; background-color: #f8fafc;">
    
    <!-- HEADER -->
    <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); color: #ffffff; border-radius: 12px; padding: 32px 24px; margin-bottom: 24px; text-align: center; border-bottom: 4px solid #0284c7;">
      <div style="font-size: 12px; text-transform: uppercase; letter-spacing: 2.5px; color: #38bdf8; font-weight: 700; margin-bottom: 6px;">
        SISTEMA DE INTELIGENCIA TECNOLÓGICA & AI RADAR
      </div>
      <h1 style="margin: 0; font-size: 32px; font-weight: 800; letter-spacing: -0.5px;">AI WEEKLY RADAR</h1>
      <div style="margin-top: 8px; font-size: 16px; color: #94a3b8; font-weight: 500;">
        Semana: <strong style="color: #f1f5f9;">${periodText}</strong>
      </div>
      <div style="margin-top: 14px; display: inline-flex; gap: 16px; font-size: 12px; color: #cbd5e1; background-color: rgba(255,255,255,0.08); padding: 6px 16px; border-radius: 20px;">
        <span>🔍 Fuentes analizadas: <strong>${report.sourcesAnalyzedCount}</strong></span>
        <span>⏱ Duración de análisis: <strong>${report.durationSeconds}s</strong></span>
        <span>🧠 Motor: <strong>Gemini Grounding</strong></span>
      </div>
    </div>

    <!-- RESUMEN EJECUTIVO -->
    <div style="background-color: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; padding: 24px; margin-bottom: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.03);">
      <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #0f172a; font-weight: 700; border-bottom: 2px solid #0284c7; padding-bottom: 6px; display: inline-block;">
        📋 RESUMEN EJECUTIVO
      </h2>
      <p style="margin: 0; font-size: 15px; color: #334155; line-height: 1.7;">
        ${report.executiveSummary}
      </p>
    </div>

    <!-- TOP 5 DE LA SEMANA -->
    <div style="margin-bottom: 28px;">
      <h2 style="margin: 0 0 16px 0; font-size: 22px; color: #0f172a; font-weight: 800; display: flex; align-items: center; gap: 8px;">
        🔥 TOP 5 DE LA SEMANA
      </h2>
      <p style="margin: -8px 0 16px 0; color: #64748b; font-size: 14px;">Las novedades críticas que todo profesional del sector debe conocer y comprender.</p>
      ${top5Html}
    </div>

    <!-- NUEVOS MODELOS -->
    <div style="background-color: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 28px;">
      <h2 style="margin: 0 0 14px 0; font-size: 20px; color: #0f172a; font-weight: 700;">
        🧠 NUEVOS MODELOS Y VERSIONES
      </h2>
      ${newModelsTable}
    </div>

    <!-- OPENAI / GPT / CODEX -->
    <div style="margin-bottom: 28px;">
      <h2 style="margin: 0 0 14px 0; font-size: 20px; color: #0f172a; font-weight: 700;">
        🤖 OPENAI / GPT / CODEX
      </h2>
      ${openaiHtml}
    </div>

    <!-- CLAUDE / ANTHROPIC -->
    <div style="margin-bottom: 28px;">
      <h2 style="margin: 0 0 14px 0; font-size: 20px; color: #0f172a; font-weight: 700;">
        🟠 CLAUDE / ANTHROPIC
      </h2>
      ${claudeHtml}
    </div>

    <!-- SKILLS -->
    <div style="background-color: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 28px;">
      <h2 style="margin: 0 0 8px 0; font-size: 20px; color: #0f172a; font-weight: 700;">
        🧩 SKILLS & MCP CONNECTORS
      </h2>
      <p style="margin: 0 0 14px 0; color: #64748b; font-size: 13px;">Especial foco en Claude Skills, GPT/Codex Skills y extensiones de automatización.</p>
      ${skillsTable}
    </div>

    <!-- AGENTES Y AUTOMATIZACIÓN -->
    <div style="margin-bottom: 28px;">
      <h2 style="margin: 0 0 14px 0; font-size: 20px; color: #0f172a; font-weight: 700;">
        ⚙️ AGENTES Y AUTOMATIZACIÓN
      </h2>
      ${agentsHtml}
    </div>

    <!-- VIBE CODING -->
    <div style="margin-bottom: 28px;">
      <h2 style="margin: 0 0 14px 0; font-size: 20px; color: #0f172a; font-weight: 700;">
        💻 VIBE CODING & HERRAMIENTAS DE DESARROLLO
      </h2>
      <p style="margin: -6px 0 12px 0; color: #64748b; font-size: 13px;">Creación de aplicaciones mediante lenguaje natural (Cursor, Windsurf, Claude Code, Antigravity, Lovable, Bolt).</p>
      ${vibeCodingHtml}
    </div>

    <!-- IA Y EDUCACIÓN -->
    <div style="margin-bottom: 28px;">
      <h2 style="margin: 0 0 14px 0; font-size: 20px; color: #0f172a; font-weight: 700;">
        🎓 IA Y EDUCACIÓN
      </h2>
      <p style="margin: -6px 0 12px 0; color: #64748b; font-size: 13px;">Herramientas docentes, tutorización, evaluación y aplicaciones pedagógicas con utilidad práctica contrastada.</p>
      ${educationHtml}
    </div>

    <!-- INVESTIGACIÓN CIENTÍFICA -->
    <div style="margin-bottom: 28px;">
      <h2 style="margin: 0 0 14px 0; font-size: 20px; color: #0f172a; font-weight: 700;">
        🔬 INVESTIGACIÓN CIENTÍFICA (PAPERS DESTACADOS)
      </h2>
      <p style="margin: -6px 0 12px 0; color: #64748b; font-size: 13px;">Máximo 5 papers de alto impacto sobre reasoning, agentes y eficiencia.</p>
      ${papersHtml}
    </div>

    <!-- HERRAMIENTAS PARA PROBAR -->
    <div style="background-color: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 28px;">
      <h2 style="margin: 0 0 12px 0; font-size: 20px; color: #0f172a; font-weight: 700;">
        🛠 HERRAMIENTAS RECOMENDADAS PARA PROBAR
      </h2>
      <ul style="margin: 0; padding-left: 20px;">
        ${toolsHtml}
      </ul>
    </div>

    <!-- ESTO LO PROBARÍA ESTA SEMANA -->
    <div style="margin-bottom: 28px;">
      <h2 style="margin: 0 0 14px 0; font-size: 22px; color: #0369a1; font-weight: 800;">
        ⭐ ESTO LO PROBARÍA ESTA SEMANA
      </h2>
      <p style="margin: -6px 0 14px 0; color: #64748b; font-size: 14px;">Tres recomendaciones hiperprácticas seleccionadas por su retorno inmediato de inversión de tiempo.</p>
      ${tryThisWeekHtml}
    </div>

    <!-- RADAR — QUÉ VIGILAR -->
    <div style="background-color: #ffffff; border-radius: 10px; border: 1px solid #e2e8f0; padding: 20px; margin-bottom: 28px;">
      <h2 style="margin: 0 0 6px 0; font-size: 20px; color: #0f172a; font-weight: 700;">
        🔭 RADAR — QUÉ VIGILAR
      </h2>
      <p style="margin: 0 0 14px 0; color: #64748b; font-size: 13px;">Próximos lanzamientos, eventos y rumores claramente diferenciados de los hechos confirmados.</p>
      ${radarHtml}
    </div>

    <!-- FOOTER -->
    <div style="border-top: 1px solid #cbd5e1; padding-top: 20px; text-align: center; color: #64748b; font-size: 13px;">
      <p style="margin: 0 0 8px 0; font-weight: 600; color: #334155;">AI WEEKLY RADAR — Intelligence System</p>
      <p style="margin: 0;">Generado automáticamente en la nube vía Google Cloud Run & Gemini API Search Grounding.</p>
      ${
        isEmailVersion
          ? `<p style="margin-top: 12px;"><a href="${process.env.APP_URL || '#'}" style="color: #0284c7; font-weight: 600; text-decoration: underline;">Ver panel de control e histórico completo en la aplicación</a></p>`
          : ''
      }
    </div>

  </div>
</body>
</html>`;
}
