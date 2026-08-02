'use client';

import type { RecaptchaAction } from './recaptcha-shared';

type GoogleRecaptcha = {
  ready: (callback: () => void) => void;
  execute: (siteKey: string, options: { action: string }) => Promise<string>;
};

declare global {
  interface Window {
    grecaptcha?: GoogleRecaptcha;
  }
}

const SITE_KEY = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim() || '';
const LOAD_TIMEOUT_MS = 10_000;

function waitForRecaptcha() {
  return new Promise<GoogleRecaptcha>((resolve, reject) => {
    const startedAt = Date.now();
    const check = () => {
      if (window.grecaptcha) {
        resolve(window.grecaptcha);
        return;
      }
      if (Date.now() - startedAt >= LOAD_TIMEOUT_MS) {
        reject(new Error('Security verification could not be loaded. Check your connection and try again.'));
        return;
      }
      window.setTimeout(check, 50);
    };
    check();
  });
}

export async function getRecaptchaToken(action: RecaptchaAction): Promise<string | null> {
  if (!SITE_KEY) return null;
  const recaptcha = await waitForRecaptcha();
  return new Promise<string>((resolve, reject) => {
    recaptcha.ready(() => {
      recaptcha.execute(SITE_KEY, { action }).then(resolve).catch(reject);
    });
  });
}

export async function verifyAuthRecaptcha(action: RecaptchaAction) {
  const token = await getRecaptchaToken(action);
  const response = await fetch('/api/security/recaptcha', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, token }),
  });
  const payload = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) {
    throw new Error(payload.error || 'Security verification failed. Please try again.');
  }
}
