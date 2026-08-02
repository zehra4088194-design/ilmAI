import type { RecaptchaAction } from './recaptcha-shared';

type RecaptchaVerifyResponse = {
  success?: boolean;
  score?: number;
  action?: string;
  hostname?: string;
  'error-codes'?: string[];
};

export type RecaptchaVerification =
  | { success: true; score: number | null; hostname: string | null; skipped: boolean }
  | { success: false; reason: string; score: number | null; hostname: string | null };

function getMinimumScore() {
  const configured = Number(process.env.RECAPTCHA_MIN_SCORE || '0.5');
  return Number.isFinite(configured) && configured >= 0 && configured <= 1 ? configured : 0.5;
}

export async function verifyRecaptchaToken(
  token: string | null | undefined,
  expectedAction: RecaptchaAction
): Promise<RecaptchaVerification> {
  const siteKeyConfigured = Boolean(process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY?.trim());
  const secret = process.env.RECAPTCHA_SECRET_KEY?.trim() || '';

  // This permits a safe staged rollout. Once either key is added, both keys
  // are required and verification fails closed until configuration is fixed.
  if (!siteKeyConfigured && !secret) {
    return { success: true, score: null, hostname: null, skipped: true };
  }
  if (!siteKeyConfigured || !secret) {
    return { success: false, reason: 'recaptcha_misconfigured', score: null, hostname: null };
  }
  if (!token) {
    return { success: false, reason: 'missing_token', score: null, hostname: null };
  }

  const body = new URLSearchParams({ secret, response: token });
  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body,
      cache: 'no-store',
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) {
      return { success: false, reason: 'verification_unavailable', score: null, hostname: null };
    }

    const result = (await response.json()) as RecaptchaVerifyResponse;
    const score = typeof result.score === 'number' ? result.score : null;
    const hostname = typeof result.hostname === 'string' ? result.hostname : null;
    if (!result.success) {
      return {
        success: false,
        reason: result['error-codes']?.join(',') || 'verification_failed',
        score,
        hostname,
      };
    }
    if (result.action !== expectedAction) {
      return { success: false, reason: 'action_mismatch', score, hostname };
    }
    if (score === null || score < getMinimumScore()) {
      return { success: false, reason: 'score_too_low', score, hostname };
    }

    return { success: true, score, hostname, skipped: false };
  } catch (error) {
    console.error('reCAPTCHA verification request failed:', error);
    return { success: false, reason: 'verification_unavailable', score: null, hostname: null };
  }
}

export function logRecaptchaFailure(
  action: RecaptchaAction,
  result: Extract<RecaptchaVerification, { success: false }>
) {
  console.warn('reCAPTCHA rejected a request', {
    action,
    reason: result.reason,
    score: result.score,
    hostname: result.hostname,
  });
}
