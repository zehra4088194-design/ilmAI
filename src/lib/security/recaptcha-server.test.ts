import { afterEach, describe, expect, it, vi } from 'vitest';
import { verifyRecaptchaToken } from './recaptcha-server';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe('verifyRecaptchaToken', () => {
  it('allows a staged rollout when neither key is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', '');
    vi.stubEnv('RECAPTCHA_SECRET_KEY', '');

    await expect(verifyRecaptchaToken(null, 'contact_submit')).resolves.toMatchObject({
      success: true,
      skipped: true,
    });
  });

  it('fails closed when only one key is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', 'site-key');
    vi.stubEnv('RECAPTCHA_SECRET_KEY', '');

    await expect(verifyRecaptchaToken('token', 'contact_submit')).resolves.toMatchObject({
      success: false,
      reason: 'recaptcha_misconfigured',
    });
  });

  it('accepts a valid matching action and score', async () => {
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', 'site-key');
    vi.stubEnv('RECAPTCHA_SECRET_KEY', 'secret-key');
    vi.stubEnv('RECAPTCHA_MIN_SCORE', '0.5');
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true, score: 0.9, action: 'contact_submit', hostname: 'ilmai.study' }))
    );

    await expect(verifyRecaptchaToken('token', 'contact_submit')).resolves.toMatchObject({
      success: true,
      score: 0.9,
      skipped: false,
    });
  });

  it('rejects action mismatches and low scores', async () => {
    vi.stubEnv('NEXT_PUBLIC_RECAPTCHA_SITE_KEY', 'site-key');
    vi.stubEnv('RECAPTCHA_SECRET_KEY', 'secret-key');
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, score: 0.9, action: 'demo_start', hostname: 'ilmai.study' }))
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ success: true, score: 0.2, action: 'contact_submit', hostname: 'ilmai.study' }))
      );

    await expect(verifyRecaptchaToken('token', 'contact_submit')).resolves.toMatchObject({
      success: false,
      reason: 'action_mismatch',
    });
    await expect(verifyRecaptchaToken('token', 'contact_submit')).resolves.toMatchObject({
      success: false,
      reason: 'score_too_low',
    });
  });
});
