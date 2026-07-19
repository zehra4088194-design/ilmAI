'use client';

import { getApps, initializeApp } from 'firebase/app';
import { deleteToken, getMessaging, getToken, isSupported, type Messaging } from 'firebase/messaging';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

function isFirebaseConfigured() {
  return Boolean(
    firebaseConfig.apiKey &&
      firebaseConfig.projectId &&
      firebaseConfig.messagingSenderId &&
      firebaseConfig.appId &&
      process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
  );
}

async function getClientMessaging(): Promise<Messaging | null> {
  if (!isFirebaseConfigured() || typeof window === 'undefined' || !(await isSupported())) return null;
  const app = getApps()[0] || initializeApp(firebaseConfig);
  return getMessaging(app);
}

function getServiceWorkerUrl() {
  const params = new URLSearchParams({
    apiKey: firebaseConfig.apiKey,
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId,
    storageBucket: firebaseConfig.storageBucket,
    messagingSenderId: firebaseConfig.messagingSenderId,
    appId: firebaseConfig.appId,
  });
  return `/firebase-messaging-sw.js?${params.toString()}`;
}

export async function enablePushNotifications() {
  const messaging = await getClientMessaging();
  if (!messaging || !('serviceWorker' in navigator) || !('Notification' in window)) {
    return { status: 'unavailable' as const };
  }

  const permission = await window.Notification.requestPermission();
  if (permission !== 'granted') return { status: 'denied' as const };

  const registration = await navigator.serviceWorker.register(getServiceWorkerUrl(), { scope: '/' });
  const token = await getToken(messaging, {
    vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
    serviceWorkerRegistration: registration,
  });
  if (!token) return { status: 'unavailable' as const };

  const response = await fetch('/api/push/subscriptions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, platform: 'web' }),
  });
  if (!response.ok) throw new Error('Push subscription could not be saved.');
  return { status: 'enabled' as const };
}

export async function disablePushNotifications() {
  const messaging = await getClientMessaging();
  if (!messaging) return;

  try {
    const registration = await navigator.serviceWorker.getRegistration('/');
    const token = await getToken(messaging, {
      vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (token) {
      await fetch('/api/push/subscriptions', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    }
    await deleteToken(messaging);
  } catch {
    // Turning the preference off must still work if this browser lost its old token.
  }
}
