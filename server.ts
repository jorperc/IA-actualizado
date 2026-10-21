import express from 'express';
import http from 'http';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  getConfig,
  saveConfig,
  getAllReports,
  getReportById,
  getProgress,
  isLocked,
  saveReport,
  getGmailConfig,
  saveServerGmailAuth,
  disconnectGmailAuth,
  getServerGmailAuth,
} from './server/storage.js';
import { calculateNextRun } from './server/cronSchedule.js';
import { runWeeklyRadarInvestigation } from './server/geminiService.js';
import { sendReportEmail, testGmailConnection } from './server/emailService.js';
import { verifyGmailToken } from './server/gmailService.js';
import {
  getPublicVapidKey,
  saveSubscription,
  sendTestPushNotification,
} from './server/pushService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '10mb' }));

// ----------------------------------------------------
// API ROUTES
// ----------------------------------------------------

// 1. System Status
app.get('/api/status', (req, res) => {
  try {
    const config = getConfig();
    const reports = getAllReports();
    const gmailConfig = getGmailConfig();
    const nextRun = calculateNextRun(
      config.scheduleDay,
      config.scheduleHour,
      config.scheduleMinute || 0,
      config.timezone || 'Europe/Madrid'
    );

    const isRunning = isLocked();
    const progress = getProgress();

    res.json({
      status: 'active',
      isAutomationActive: true,
      isRunning,
      currentProgress: progress,
      lastRunAt: config.lastRunAt || (reports[0] ? reports[0].date : null),
      nextRunAt: nextRun,
      lastDurationSeconds: config.lastDurationSeconds || (reports[0] ? reports[0].durationSeconds : 0),
      lastSourcesCount: config.lastSourcesCount || (reports[0] ? reports[0].sourcesAnalyzedCount : 0),
      reportsCount: reports.length,
      timezone: config.timezone || 'Europe/Madrid',
      scheduleDay: config.scheduleDay,
      scheduleHour: config.scheduleHour,
      lastError: config.lastError,
      recipientEmail: config.recipientEmail || gmailConfig.recipientEmail,
      isGmailConnected: Boolean(gmailConfig.connected),
      isGmailConfigured: Boolean(gmailConfig.connected && gmailConfig.configured),
      gmailConfig,
      isSmtpConfigured: Boolean(
        config.smtpConfig?.enabled &&
        config.smtpConfig?.host &&
        config.smtpConfig?.user &&
        config.smtpConfig?.pass
      ),
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error fetching status' });
  }
});

// 2. Generation Progress
app.get('/api/progress', (req, res) => {
  res.json(getProgress());
});

// 3. Config
app.get('/api/config', (req, res) => {
  try {
    const config = getConfig();
    const gmailConfig = getGmailConfig();
    // Return config with masked password for display and safe gmail config
    res.json({
      ...config,
      gmailConfig,
      smtpConfig: {
        ...config.smtpConfig,
        pass: config.smtpConfig?.pass ? '********' : '',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error reading config' });
  }
});

app.post('/api/config', (req, res) => {
  try {
    const newConfig = req.body;
    const current = getConfig();

    // If password was sent as '********', retain current password
    if (newConfig.smtpConfig && newConfig.smtpConfig.pass === '********') {
      newConfig.smtpConfig.pass = current.smtpConfig?.pass || '';
    }

    if (newConfig.recipientEmail) {
      saveServerGmailAuth({ recipientEmail: newConfig.recipientEmail.trim() });
    }

    const saved = saveConfig(newConfig);
    const gmailConfig = getGmailConfig();
    res.json({
      success: true,
      config: {
        ...saved,
        gmailConfig,
        smtpConfig: {
          ...saved.smtpConfig,
          pass: saved.smtpConfig?.pass ? '********' : '',
        },
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error saving config' });
  }
});

// 4. Reports List & Single Report
app.get('/api/reports', (req, res) => {
  try {
    const reports = getAllReports();
    // Return list with lightweight summaries for fast rendering
    const list = reports.map((r) => ({
      id: r.id,
      title: r.title,
      date: r.date,
      period: r.period,
      top5Titles: r.top5.map((t) => t.title),
      sourcesAnalyzedCount: r.sourcesAnalyzedCount,
      durationSeconds: r.durationSeconds,
      emailSent: r.emailStatus?.sent ?? false,
      emailStatus: r.emailStatus,
      executiveSummaryExcerpt:
        r.executiveSummary.length > 220
          ? `${r.executiveSummary.substring(0, 220)}...`
          : r.executiveSummary,
    }));
    res.json(list);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error fetching reports' });
  }
});

app.get('/api/reports/:id', (req, res) => {
  try {
    const report = getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Informe no encontrado' });
    }
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error fetching report' });
  }
});

// 5. Trigger Manual Generation ("GENERAR INFORME AHORA")
app.post('/api/reports/generate', async (req, res) => {
  if (isLocked()) {
    return res.status(409).json({
      error: 'Ya hay una investigación de AI Weekly Radar en curso.',
    });
  }

  // Start asynchronous investigation process
  res.json({
    message: 'Investigación iniciada en segundo plano.',
    status: 'STARTED',
  });

  // Launch async runner
  runWeeklyRadarInvestigation('MANUAL').catch((err) => {
    console.error('[Generate endpoint background error]:', err);
  });
});

// 5b. Retry investigation from checkpoint
app.post('/api/reports/retry', async (req, res) => {
  if (isLocked()) {
    return res.status(409).json({
      error: 'Ya hay una investigación de AI Weekly Radar en curso.',
    });
  }

  res.json({
    message: 'Reanudando investigación desde el último punto guardado...',
    status: 'RESUMED',
  });

  runWeeklyRadarInvestigation('MANUAL').catch((err) => {
    console.error('[Retry endpoint background error]:', err);
  });
});


// 6. Resend Email for existing report
app.post('/api/reports/:id/resend-email', async (req, res) => {
  try {
    const report = getReportById(req.params.id);
    if (!report) {
      return res.status(404).json({ error: 'Informe no encontrado' });
    }

    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const { accessToken } = req.body || {};
    const tokenToUse = accessToken || bearerToken;

    const config = getConfig();
    const result = await sendReportEmail(report, config, tokenToUse);

    report.emailStatus = {
      status: result.success ? 'EMAIL_SENT' : 'EMAIL_FAILED',
      sent: result.success,
      recipient: result.recipient || config.recipientEmail,
      sender: result.sender,
      sentAt: result.success ? new Date().toISOString() : undefined,
      error: result.error,
      notConfigured: result.notConfigured,
      messageId: result.messageId,
    };
    saveReport(report);

    res.json({
      success: result.success,
      status: report.emailStatus.status,
      error: result.error,
      notConfigured: result.notConfigured,
      emailStatus: report.emailStatus,
      setupInstructionsRequired: result.setupInstructionsRequired,
      setupInstructionsUrl: result.setupInstructionsUrl,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error reenviando email' });
  }
});

// 7. GMAIL OAUTH INTEGRATION ENDPOINTS
app.get('/api/gmail/status', (req, res) => {
  try {
    const config = getGmailConfig();
    res.json({
      ...config,
      cloudProjectId: 'gen-lang-client-0800225031',
      cloudProjectNumber: '791177028798',
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error obteniendo estado de Gmail' });
  }
});

app.post('/api/gmail/connect', async (req, res) => {
  try {
    const { email, accessToken } = req.body;
    if (!accessToken) {
      return res.status(400).json({ error: 'Falta accessToken de Google' });
    }

    const verification = await verifyGmailToken(accessToken);
    if (!verification.valid) {
      return res.status(401).json({
        error: verification.error || 'Token de acceso inválido',
      });
    }

    const authorizedEmail = verification.email || email;
    const saved = saveServerGmailAuth({
      connected: true,
      senderEmail: authorizedEmail,
      accessToken,
      tokenExpiresAt: Date.now() + (verification.expiresIn || 3600) * 1000,
    });

    res.json({
      success: true,
      connected: true,
      configured: saved.configured,
      senderEmail: saved.senderEmail,
      recipientEmail: saved.recipientEmail,
    });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error conectando Gmail' });
  }
});

app.post('/api/gmail/disconnect', (req, res) => {
  try {
    disconnectGmailAuth();
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err?.message });
  }
});

app.post('/api/gmail/test-email', async (req, res) => {
  try {
    const { recipientEmail, accessToken } = req.body || {};
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const tokenToUse = accessToken || bearerToken;

    const result = await testGmailConnection(recipientEmail, tokenToUse);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, status: 'EMAIL_FAILED', error: err?.message });
  }
});

// Backward compatibility for existing test endpoint
app.post('/api/reports/test-email', async (req, res) => {
  try {
    const { recipientEmail, accessToken } = req.body || {};
    const authHeader = req.headers.authorization;
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;
    const tokenToUse = accessToken || bearerToken;

    const result = await testGmailConnection(recipientEmail, tokenToUse);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, status: 'EMAIL_FAILED', error: err?.message });
  }
});

// 8. Push Notifications API
app.get('/api/push/public-key', (req, res) => {
  try {
    const key = getPublicVapidKey();
    res.json({ publicKey: key });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error obtaining VAPID key' });
  }
});

app.post('/api/push/subscribe', (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Suscripción inválida' });
    }
    saveSubscription({
      ...subscription,
      userAgent: req.headers['user-agent'] || 'unknown',
      createdAt: new Date().toISOString(),
    });
    res.json({ success: true, message: 'Dispositivo registrado para notificaciones push' });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'Error guardando suscripción' });
  }
});

app.post('/api/push/test', async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription) {
      return res.status(400).json({ error: 'Falta objeto subscription' });
    }
    const result = await sendTestPushNotification(subscription);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// 9. Protected Endpoint for Cloud Scheduler: POST /api/weekly-report
app.post('/api/weekly-report', async (req, res) => {
  try {
    const config = getConfig();
    const expectedSecret = config.schedulerSecret || process.env.SCHEDULER_SECRET;

    const authHeader = req.headers.authorization;
    const customHeader = req.headers['x-cloudscheduler-secret'] as string;

    const token = authHeader?.startsWith('Bearer ')
      ? authHeader.substring(7)
      : customHeader;

    if (expectedSecret && token !== expectedSecret) {
      console.warn('[Cloud Scheduler Security] Intento de acceso no autorizado a /api/weekly-report');
      return res.status(401).json({
        error: 'No autorizado. Se requiere token secreto de Cloud Scheduler válido.',
      });
    }

    if (isLocked()) {
      return res.status(409).json({
        error: 'Investigación ya en curso. Ejecución duplicada evitada.',
      });
    }

    console.log('[Cloud Scheduler] Petición válida recibida desde Google Cloud Scheduler. Iniciando investigación semanal...');

    const report = await runWeeklyRadarInvestigation('SCHEDULED');

    res.json({
      success: true,
      message: 'Informe semanal generado satisfactoriamente por Cloud Scheduler',
      reportId: report.id,
      durationSeconds: report.durationSeconds,
      sourcesAnalyzedCount: report.sourcesAnalyzedCount,
    });
  } catch (err: any) {
    console.error('[Cloud Scheduler Error]:', err);
    res.status(500).json({
      error: err?.message || 'Error ejecutando tarea semanal programada',
    });
  }
});

// ----------------------------------------------------
// SERVER / VITE INTEGRATION
// ----------------------------------------------------
const PORT = parseInt(process.env.PORT || '3000', 10);

async function startServer() {
  const httpServer = http.createServer(app);

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`[AI Weekly Radar] Servidor activo en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
});
