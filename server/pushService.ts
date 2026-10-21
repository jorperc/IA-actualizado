import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import webpush from 'web-push';
import { Report } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');
const VAPID_FILE = path.join(DATA_DIR, 'vapid.json');
const SUBSCRIPTIONS_FILE = path.join(DATA_DIR, 'push_subscriptions.json');

export interface PushSubscriptionItem {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  userAgent?: string;
  createdAt: string;
}

interface VapidKeys {
  publicKey: string;
  privateKey: string;
  contactEmail: string;
}

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function getOrGenerateVapid(): VapidKeys {
  ensureDataDir();
  if (fs.existsSync(VAPID_FILE)) {
    try {
      const raw = fs.readFileSync(VAPID_FILE, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      console.warn('Error reading vapid.json, regenerating keys');
    }
  }

  const generated = webpush.generateVAPIDKeys();
  const vapid: VapidKeys = {
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    contactEmail: 'mailto:radar@example.com',
  };
  fs.writeFileSync(VAPID_FILE, JSON.stringify(vapid, null, 2), 'utf-8');
  return vapid;
}

let vapidKeys = getOrGenerateVapid();

try {
  webpush.setVapidDetails(
    vapidKeys.contactEmail,
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
} catch (err) {
  console.error('Error configuring web-push VAPID:', err);
}

export function getPublicVapidKey(): string {
  return vapidKeys.publicKey;
}

export function getSubscriptions(): PushSubscriptionItem[] {
  ensureDataDir();
  if (!fs.existsSync(SUBSCRIPTIONS_FILE)) {
    return [];
  }
  try {
    const raw = fs.readFileSync(SUBSCRIPTIONS_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveSubscription(sub: PushSubscriptionItem): void {
  ensureDataDir();
  const subs = getSubscriptions();
  // Deduplicate by endpoint
  const filtered = subs.filter((s) => s.endpoint !== sub.endpoint);
  filtered.push(sub);
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
  console.log(`[PushService] Nueva suscripción push guardada. Total activas: ${filtered.length}`);
}

export function removeSubscription(endpoint: string): void {
  ensureDataDir();
  const subs = getSubscriptions();
  const filtered = subs.filter((s) => s.endpoint !== endpoint);
  fs.writeFileSync(SUBSCRIPTIONS_FILE, JSON.stringify(filtered, null, 2), 'utf-8');
}

export async function sendReportPushNotification(report: Report): Promise<{ sent: number; failed: number }> {
  const subs = getSubscriptions();
  if (subs.length === 0) {
    console.log('[PushService] No hay dispositivos suscritos para notificación push.');
    return { sent: 0, failed: 0 };
  }

  const totalNovelties =
    (report.top5?.length || 0) +
    (report.newModels?.length || 0) +
    (report.openaiUpdates?.length || 0) +
    (report.claudeUpdates?.length || 0) +
    (report.skills?.length || 0);

  const topSample = report.top5?.slice(0, 3).map((t) => t.title).join(' · ') || 'Novedades críticas en IA';

  const payload = JSON.stringify({
    title: 'AI Weekly Radar',
    body: `🔴 ${totalNovelties || 7} novedades importantes esta semana\n${topSample}`,
    icon: '/pwa-192x192.png',
    badge: '/favicon-32x32.png',
    data: {
      reportId: report.id,
      url: `/?report=${report.id}`,
    },
  });

  let sent = 0;
  let failed = 0;

  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: sub.keys,
        },
        payload
      );
      sent++;
    } catch (err: any) {
      failed++;
      console.warn(`[PushService] Error enviando push a ${sub.endpoint.substring(0, 35)}...:`, err?.message);
      // Remove stale or expired subscriptions (404/410)
      if (err?.statusCode === 404 || err?.statusCode === 410) {
        removeSubscription(sub.endpoint);
      }
    }
  }

  console.log(`[PushService] Push enviado: ${sent} exitosos, ${failed} fallidos.`);
  return { sent, failed };
}

export async function sendTestPushNotification(subscription: PushSubscriptionItem): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = JSON.stringify({
      title: 'AI Weekly Radar',
      body: '🔔 Notificaciones push configuradas correctamente en este dispositivo.',
      icon: '/pwa-192x192.png',
      badge: '/favicon-32x32.png',
      data: {
        url: '/',
      },
    });

    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: subscription.keys,
      },
      payload
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Error enviando push de prueba' };
  }
}
