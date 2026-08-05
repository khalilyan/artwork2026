import { useEffect } from 'react';
import { api } from '../services/api.js';

const permissionPromptDelayMs = 1800;
const pushPromptAttemptKey = 'artwork-push-prompt-attempted';

function getPushServiceWorkerPath() {
  const basePath = import.meta.env.BASE_URL || '/';
  const normalizedBasePath = basePath.endsWith('/') ? basePath : `${basePath}/`;
  return `${normalizedBasePath}artwork-push-sw.js`;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = `${base64String}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let index = 0; index < rawData.length; index += 1) {
    outputArray[index] = rawData.charCodeAt(index);
  }

  return outputArray;
}

async function subscribeToPush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
    return;
  }

  const { enabled, publicKey } = await api.pushPublicKey();
  if (!enabled || !publicKey) return;

  const registration = await navigator.serviceWorker.register(getPushServiceWorkerPath());
  const permission = Notification.permission === 'default'
    ? await Notification.requestPermission()
    : Notification.permission;

  if (permission !== 'granted') return;

  const existingSubscription = await registration.pushManager.getSubscription();
  const subscription = existingSubscription ?? await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(publicKey),
  });

  await api.savePushSubscription(subscription.toJSON());
}

export function usePushNotifications(enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;
    if (window.sessionStorage.getItem(pushPromptAttemptKey) === '1') return undefined;

    window.sessionStorage.setItem(pushPromptAttemptKey, '1');

    const timer = window.setTimeout(() => {
      subscribeToPush().catch(() => {
        // Push is optional; failed subscriptions should never interrupt shopping.
      });
    }, permissionPromptDelayMs);

    return () => window.clearTimeout(timer);
  }, [enabled]);
}
