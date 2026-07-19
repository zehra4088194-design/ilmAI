import crypto from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';

const originalSecret = process.env.PADDLE_WEBHOOK_SECRET;

afterEach(() => {
  if (originalSecret === undefined) delete process.env.PADDLE_WEBHOOK_SECRET;
  else process.env.PADDLE_WEBHOOK_SECRET = originalSecret;
  vi.resetModules();
});

describe('Paddle webhook verification', () => {
  it('accepts a valid signature when Paddle sends multiple h1 values', async () => {
    const secret = 'paddle-test-secret';
    process.env.PADDLE_WEBHOOK_SECRET = secret;
    vi.resetModules();
    const { paddleProvider } = await import('./paddle');
    const timestamp = String(Math.floor(Date.now() / 1000));
    const body = JSON.stringify({ event_type: 'transaction.completed', data: { id: 'txn_test' } });
    const signature = crypto.createHmac('sha256', secret).update(`${timestamp}:${body}`).digest('hex');

    const result = await paddleProvider.verifyWebhook(body, `ts=${timestamp};h1=${'0'.repeat(64)};h1=${signature}`);

    expect(result.valid).toBe(true);
    expect(result.eventType).toBe('transaction.completed');
  });

  it('rejects signatures outside the replay window', async () => {
    const secret = 'paddle-test-secret';
    process.env.PADDLE_WEBHOOK_SECRET = secret;
    vi.resetModules();
    const { paddleProvider } = await import('./paddle');
    const timestamp = String(Math.floor(Date.now() / 1000) - 301);
    const body = JSON.stringify({ event_type: 'transaction.completed' });
    const signature = crypto.createHmac('sha256', secret).update(`${timestamp}:${body}`).digest('hex');

    expect((await paddleProvider.verifyWebhook(body, `ts=${timestamp};h1=${signature}`)).valid).toBe(false);
  });
});
