import { Report } from './types.js';
import { generateHtmlReport } from './htmlReportGenerator.js';

export interface GmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
  setupInstructionsRequired?: boolean;
  setupInstructionsUrl?: string;
  notConfigured?: boolean;
}

/**
 * Builds an RFC 2822 compliant MIME message and converts it to base64url
 * format required by the Gmail API (https://gmail.googleapis.com/gmail/v1/users/me/messages/send).
 */
export function buildMimeMessage({
  fromName,
  fromEmail,
  toEmail,
  subject,
  htmlContent,
  textContent,
}: {
  fromName: string;
  fromEmail: string;
  toEmail: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}): string {
  const boundary = `====_boundary_${Date.now()}_${Math.random().toString(36).substring(2)}_====`;
  const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`;
  const fromHeader = `"${fromName.replace(/"/g, '')}" <${fromEmail}>`;

  const fallbackText =
    textContent ||
    'AI Weekly Radar: Informe de Inteligencia Tecnológica Semanal en IA. Abre este correo en un cliente compatible con HTML para ver el informe completo con gráficos y fuentes primarias.';

  const lines = [
    `From: ${fromHeader}`,
    `To: ${toEmail}`,
    `Subject: ${encodedSubject}`,
    `MIME-Version: 1.0`,
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    ``,
    `--${boundary}`,
    `Content-Type: text/plain; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(fallbackText, 'utf-8').toString('base64'),
    ``,
    `--${boundary}`,
    `Content-Type: text/html; charset=UTF-8`,
    `Content-Transfer-Encoding: base64`,
    ``,
    Buffer.from(htmlContent, 'utf-8').toString('base64'),
    ``,
    `--${boundary}--`,
  ];

  const mimeString = lines.join('\r\n');

  // Convert to Base64URL string (RFC 4648 §5)
  return Buffer.from(mimeString, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Verifies if an OAuth access token is valid and has the required gmail.send scope
 */
export async function verifyGmailToken(accessToken: string): Promise<{
  valid: boolean;
  email?: string;
  expiresIn?: number;
  error?: string;
}> {
  try {
    const res = await fetch(
      `https://www.googleapis.com/oauth2/v1/tokeninfo?access_token=${encodeURIComponent(
        accessToken
      )}`
    );

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      return {
        valid: false,
        error: errData.error_description || 'Token inválido o expirado.',
      };
    }

    const data = await res.json();
    const scopeStr = data.scope || '';
    const hasSendScope =
      scopeStr.includes('gmail.send') ||
      scopeStr.includes('mail.google.com') ||
      scopeStr.includes('https://www.googleapis.com/auth/gmail.send');

    if (!hasSendScope) {
      return {
        valid: false,
        email: data.email,
        error:
          'El token no incluye el permiso necesario para enviar correos (https://www.googleapis.com/auth/gmail.send).',
      };
    }

    return {
      valid: true,
      email: data.email,
      expiresIn: data.expires_in,
    };
  } catch (err: any) {
    return {
      valid: false,
      error: err?.message || 'Error al conectar con el servidor de validación de Google.',
    };
  }
}

/**
 * Sends an email via the official Gmail API endpoint
 */
export async function sendGmailMessage({
  accessToken,
  fromEmail,
  fromName = 'AI Weekly Radar',
  toEmail,
  subject,
  htmlContent,
  textContent,
}: {
  accessToken: string;
  fromEmail: string;
  fromName?: string;
  toEmail: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
}): Promise<GmailSendResult> {
  const rawBase64Url = buildMimeMessage({
    fromName,
    fromEmail,
    toEmail,
    subject,
    htmlContent,
    textContent,
  });

  try {
    const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        raw: rawBase64Url,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      console.log(`[GmailService] Correo enviado exitosamente vía Gmail API a ${toEmail}. ID: ${data.id}`);
      return {
        success: true,
        messageId: data.id,
      };
    }

    const status = res.status;
    const errorJson = await res.json().catch(() => ({}));
    const errorMessage = errorJson?.error?.message || `Error HTTP ${status} en Gmail API`;

    console.error(`[GmailService] Error en Gmail API (${status}):`, errorJson);

    // Detect if Gmail API is disabled in the Google Cloud Console project
    if (
      status === 403 &&
      (errorMessage.toLowerCase().includes('disabled') ||
        errorMessage.toLowerCase().includes('has not been used') ||
        errorMessage.toLowerCase().includes('not enabled'))
    ) {
      // Extract URL if present in error message or provide direct console URL
      const urlMatch = errorMessage.match(/https:\/\/console\.developers\.google\.com\/[^\s"')]+/);
      const setupUrl =
        urlMatch?.[0] ||
        'https://console.cloud.google.com/apis/library/gmail.googleapis.com';

      return {
        success: false,
        error:
          'La Gmail API no está habilitada en tu proyecto de Google Cloud Console. Haz clic en el enlace para habilitarla con un solo clic.',
        setupInstructionsRequired: true,
        setupInstructionsUrl: setupUrl,
      };
    }

    if (status === 401) {
      return {
        success: false,
        error:
          'La sesión de Gmail ha caducado o el token de acceso expiró. Haz clic en "CONECTAR CON GMAIL" para renovar la autorización.',
      };
    }

    return {
      success: false,
      error: errorMessage,
    };
  } catch (err: any) {
    console.error('[GmailService] Error de red o llamada a Gmail API:', err);
    return {
      success: false,
      error: err?.message || 'Error de conexión con la API de Gmail de Google.',
    };
  }
}

/**
 * Dispatches a completed AI Weekly Radar report via Gmail API
 */
export async function sendReportViaGmail(
  report: Report,
  options: {
    accessToken: string;
    fromEmail: string;
    toEmail: string;
  }
): Promise<GmailSendResult> {
  const { accessToken, fromEmail, toEmail } = options;

  if (!accessToken || !fromEmail) {
    return {
      success: false,
      notConfigured: true,
      error: 'Gmail no está conectado mediante OAuth.',
    };
  }

  if (!toEmail || !toEmail.trim()) {
    return {
      success: false,
      notConfigured: true,
      error: 'Email destinatario del informe no configurado.',
    };
  }

  // Format date for subject: AI Weekly Radar — [fecha]
  const reportDateObj = report.date ? new Date(report.date) : new Date();
  const formattedDate = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(reportDateObj);

  const subject = `AI Weekly Radar — ${formattedDate}`;

  const emailHtml = report.renderedHtml || generateHtmlReport(report, true);
  const plainText = `AI WEEKLY RADAR — ${formattedDate}
Semana analizada: ${report.period.from} a ${report.period.to}
Fuentes verificadas: ${report.sourcesAnalyzedCount}

RESUMEN EJECUTIVO:
${report.executiveSummary}

Consulta el informe completo interactivo en la plataforma AI Weekly Radar.`;

  return sendGmailMessage({
    accessToken,
    fromEmail,
    fromName: 'AI Weekly Radar',
    toEmail: toEmail.trim(),
    subject,
    htmlContent: emailHtml,
    textContent: plainText,
  });
}

/**
 * Sends a live verification test email via Gmail API
 */
export async function sendTestEmailViaGmail(options: {
  accessToken: string;
  fromEmail: string;
  toEmail: string;
}): Promise<GmailSendResult> {
  const { accessToken, fromEmail, toEmail } = options;

  if (!accessToken || !fromEmail) {
    return {
      success: false,
      notConfigured: true,
      error: 'Debes conectar tu cuenta de Gmail mediante OAuth antes de realizar el envío de prueba.',
    };
  }

  if (!toEmail || !toEmail.trim()) {
    return {
      success: false,
      error: 'Indica una dirección de correo destinatario válida.',
    };
  }

  const now = new Date();
  const formattedDate = new Intl.DateTimeFormat('es-ES', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(now);

  const formattedTime = new Intl.DateTimeFormat('es-ES', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).format(now);

  const subject = `AI Weekly Radar — ${formattedDate} (Prueba de Conexión)`;

  const testHtml = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; color: #0f172a;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
    <div style="background-color: #0f172a; padding: 28px 24px; text-align: center; border-bottom: 4px solid #0284c7;">
      <span style="font-size: 11px; font-weight: 800; color: #38bdf8; letter-spacing: 2px; text-transform: uppercase;">VERIFICACIÓN GMAIL API EN VIVO</span>
      <h1 style="color: #ffffff; font-size: 24px; font-weight: 900; margin: 8px 0 0 0; letter-spacing: -0.5px;">AI WEEKLY RADAR</h1>
    </div>

    <div style="padding: 28px 24px;">
      <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 8px; padding: 12px 16px; margin-bottom: 20px;">
        <span style="font-size: 14px; font-weight: 700; color: #065f46;">✅ Conexión con Gmail verificada y operativa</span>
      </div>

      <p style="font-size: 15px; line-height: 1.6; color: #334155; margin-top: 0;">
        Este es un mensaje de prueba real enviado a través de la <strong>Gmail API oficial</strong> mediante autenticación OAuth 2.0 segura con Google Cloud.
      </p>

      <div style="background-color: #f1f5f9; border-radius: 8px; padding: 16px; margin: 20px 0; font-size: 13px; color: #475569;">
        <div style="margin-bottom: 8px;"><strong>Cuenta remitente autorizada:</strong> <span style="color: #0284c7;">${fromEmail}</span></div>
        <div style="margin-bottom: 8px;"><strong>Destinatario del informe:</strong> <span style="color: #0284c7;">${toEmail}</span></div>
        <div style="margin-bottom: 8px;"><strong>Nombre del remitente:</strong> AI Weekly Radar</div>
        <div><strong>Fecha y hora del test:</strong> ${formattedDate} a las ${formattedTime}</div>
      </div>

      <p style="font-size: 14px; line-height: 1.6; color: #64748b;">
        A partir de este momento, cada vez que finalice una investigación semanal (programada o manual), el informe HTML completo será despachado automáticamente a esta dirección.
      </p>
    </div>

    <div style="background-color: #f8fafc; padding: 16px 24px; border-top: 1px solid #e2e8f0; font-size: 12px; color: #94a3b8; text-align: center;">
      AI Weekly Radar · Sistema Autónomo de Inteligencia Tecnológica en IA · Google Cloud
    </div>
  </div>
</body>
</html>
  `.trim();

  const plainText = `AI WEEKLY RADAR — Test de Conexión Gmail API
Fecha: ${formattedDate} a las ${formattedTime}

✅ Conexión con Gmail verificada y operativa.
Cuenta remitente autorizada: ${fromEmail}
Destinatario configurado: ${toEmail}

Los informes semanales se entregarán automáticamente a esta dirección.`;

  return sendGmailMessage({
    accessToken,
    fromEmail,
    fromName: 'AI Weekly Radar',
    toEmail: toEmail.trim(),
    subject,
    htmlContent: testHtml,
    textContent: plainText,
  });
}
