import nodemailer from 'nodemailer';
import { Config, Report } from './types.js';
import { generateHtmlReport } from './htmlReportGenerator.js';
import {
  sendReportViaGmail,
  sendTestEmailViaGmail,
  GmailSendResult,
} from './gmailService.js';
import {
  getServerGmailAuth,
  markGmailAsConfigured,
  saveServerGmailAuth,
} from './storage.js';

export interface SendEmailResult {
  success: boolean;
  status: 'EMAIL_SENT' | 'EMAIL_FAILED';
  messageId?: string;
  sender?: string;
  recipient?: string;
  error?: string;
  notConfigured?: boolean;
  setupInstructionsRequired?: boolean;
  setupInstructionsUrl?: string;
}

/**
 * Dispatches a generated report to the configured recipient.
 * Prioritizes the secure, authorized Gmail API integration.
 */
export async function sendReportEmail(
  report: Report,
  config: Config,
  overrideAccessToken?: string
): Promise<SendEmailResult> {
  const gmailAuth = getServerGmailAuth();
  const recipient = (config.recipientEmail || gmailAuth.recipientEmail || '').trim();

  if (!recipient) {
    return {
      success: false,
      status: 'EMAIL_FAILED',
      notConfigured: true,
      error: 'Destinatario de correo no configurado.',
    };
  }

  // 1. GMAIL API DISPATCH (Primary & Required Method)
  const tokenToUse = overrideAccessToken || gmailAuth.accessToken;

  if (gmailAuth.connected && tokenToUse && gmailAuth.senderEmail) {
    try {
      console.log(
        `[EmailService] Despachando informe "${report.title}" vía Gmail API desde "${gmailAuth.senderEmail}" a "${recipient}"...`
      );

      const result: GmailSendResult = await sendReportViaGmail(report, {
        accessToken: tokenToUse,
        fromEmail: gmailAuth.senderEmail,
        toEmail: recipient,
      });

      if (result.success) {
        return {
          success: true,
          status: 'EMAIL_SENT',
          messageId: result.messageId,
          sender: gmailAuth.senderEmail,
          recipient,
        };
      }

      return {
        success: false,
        status: 'EMAIL_FAILED',
        error: result.error || 'Error al enviar a través de Gmail API',
        sender: gmailAuth.senderEmail,
        recipient,
        setupInstructionsRequired: result.setupInstructionsRequired,
        setupInstructionsUrl: result.setupInstructionsUrl,
      };
    } catch (err: any) {
      console.error('[EmailService] Excepción durante el despacho vía Gmail API:', err);
      return {
        success: false,
        status: 'EMAIL_FAILED',
        error: err?.message || 'Error inesperado con Gmail API',
        sender: gmailAuth.senderEmail,
        recipient,
      };
    }
  }

  // 2. Fallback to SMTP if legacy credentials exist and Gmail is not yet linked
  const smtp = config.smtpConfig;
  const isSmtpConfigured =
    smtp && smtp.enabled && smtp.host && smtp.user && smtp.pass;

  if (isSmtpConfigured) {
    try {
      const transporter = nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port || 587,
        secure: smtp.secure ?? false,
        auth: {
          user: smtp.user,
          pass: smtp.pass,
        },
        tls: {
          rejectUnauthorized: false,
        },
      });

      // Format date: AI Weekly Radar — [fecha]
      const reportDateObj = report.date ? new Date(report.date) : new Date();
      const formattedDate = new Intl.DateTimeFormat('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(reportDateObj);

      const subject = `AI Weekly Radar — ${formattedDate}`;
      const emailHtml = report.renderedHtml || generateHtmlReport(report, true);

      const info = await transporter.sendMail({
        from: `"AI Weekly Radar" <${smtp.user}>`,
        to: recipient,
        subject,
        html: emailHtml,
        text: `${report.title}\nSemana: ${report.period.from} - ${report.period.to}\n\nRESUMEN EJECUTIVO:\n${report.executiveSummary}`,
      });

      return {
        success: true,
        status: 'EMAIL_SENT',
        messageId: info.messageId,
        sender: smtp.user,
        recipient,
      };
    } catch (err: any) {
      return {
        success: false,
        status: 'EMAIL_FAILED',
        error: err?.message || 'Error al enviar por SMTP',
        recipient,
      };
    }
  }

  // 3. Neither Gmail nor SMTP configured
  console.log('[EmailService] Gmail no está conectado mediante OAuth. Envío automático omitido.');
  return {
    success: false,
    status: 'EMAIL_FAILED',
    notConfigured: true,
    error:
      'Gmail no está conectado mediante OAuth 2.0. Conecta tu cuenta de Gmail en la sección de Configuración para activar el despacho automático.',
  };
}

/**
 * Sends a real live test email via Gmail API or fallback
 */
export async function testGmailConnection(
  recipientEmail?: string,
  overrideAccessToken?: string
): Promise<SendEmailResult> {
  const gmailAuth = getServerGmailAuth();
  const recipient = (recipientEmail || gmailAuth.recipientEmail || '').trim();

  if (!recipient) {
    return {
      success: false,
      status: 'EMAIL_FAILED',
      error: 'Indica un email destinatario para el test.',
    };
  }

  const tokenToUse = overrideAccessToken || gmailAuth.accessToken;

  if (!gmailAuth.connected || !tokenToUse || !gmailAuth.senderEmail) {
    return {
      success: false,
      status: 'EMAIL_FAILED',
      notConfigured: true,
      error:
        'Primero debes pulsar "CONECTAR CON GMAIL" para autorizar tu cuenta de envío mediante Google OAuth.',
    };
  }

  const result: GmailSendResult = await sendTestEmailViaGmail({
    accessToken: tokenToUse,
    fromEmail: gmailAuth.senderEmail,
    toEmail: recipient,
  });

  if (result.success) {
    // Only mark Gmail as fully configured AFTER a real test email succeeds!
    markGmailAsConfigured(new Date().toISOString());

    return {
      success: true,
      status: 'EMAIL_SENT',
      messageId: result.messageId,
      sender: gmailAuth.senderEmail,
      recipient,
    };
  }

  saveServerGmailAuth({
    lastTestStatus: 'ERROR',
    lastTestError: result.error,
  });

  return {
    success: false,
    status: 'EMAIL_FAILED',
    error: result.error,
    sender: gmailAuth.senderEmail,
    recipient,
    setupInstructionsRequired: result.setupInstructionsRequired,
    setupInstructionsUrl: result.setupInstructionsUrl,
  };
}
