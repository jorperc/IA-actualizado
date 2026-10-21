/**
 * PWA Push Notification Management Utility
 */

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isPushNotificationSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getNotificationPermission(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

export async function registerPushSubscription(): Promise<{ success: boolean; error?: string }> {
  if (!isPushNotificationSupported()) {
    return {
      success: false,
      error: 'Las notificaciones push no están soportadas en este navegador o entorno.',
    };
  }

  try {
    // 1. Request permission
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return {
        success: false,
        error: 'Permiso de notificaciones denegado por el usuario.',
      };
    }

    // 2. Fetch VAPID Public Key from server
    const keyRes = await fetch('/api/push/public-key');
    if (!keyRes.ok) {
      throw new Error('No se pudo obtener la clave VAPID pública del servidor.');
    }
    const { publicKey } = await keyRes.json();
    if (!publicKey) {
      throw new Error('Clave pública VAPID no disponible.');
    }

    // 3. Register or get Service Worker registration
    let reg = await navigator.serviceWorker.getRegistration();
    if (!reg) {
      reg = await navigator.serviceWorker.register('/sw.js');
    }
    await navigator.serviceWorker.ready;

    // 4. Subscribe with PushManager
    const convertedKey = urlBase64ToUint8Array(publicKey);
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription) {
      subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedKey as unknown as BufferSource,
      });
    }

    // 5. Send subscription to server
    const saveRes = await fetch('/api/push/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription }),
    });

    if (!saveRes.ok) {
      throw new Error('Error al registrar la suscripción en el servidor.');
    }

    return { success: true };
  } catch (err: any) {
    console.error('[PushManager] Error:', err);
    return {
      success: false,
      error: err?.message || 'Error registrando notificaciones push.',
    };
  }
}
