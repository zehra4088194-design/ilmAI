import crypto from 'node:crypto';
import type {
  CancelSubscriptionParams,
  CheckoutSession,
  CreateCheckoutParams,
  PaymentProvider,
  SubscriptionRecord,
  WebhookVerificationResult,
} from './provider';

const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;

const PRICE_IDS = {
  PRO: {
    monthly: process.env.PADDLE_PRICE_ID_PRO_MONTHLY,
    annual: process.env.PADDLE_PRICE_ID_PRO_ANNUAL,
  },
  ELITE: {
    monthly: process.env.PADDLE_PRICE_ID_ELITE_MONTHLY,
    annual: process.env.PADDLE_PRICE_ID_ELITE_ANNUAL,
  },
} as const;

function getPaddleApiBaseUrl() {
  return PADDLE_API_KEY?.includes('_sdbx') ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
}

function getCheckoutUrl(successUrl: string) {
  return new URL('/checkout', successUrl).toString();
}

function getPriceId(params: CreateCheckoutParams) {
  const priceId = PRICE_IDS[params.tier][params.billingCycle];
  if (!priceId) {
    throw new Error(`Missing Paddle price id for ${params.tier} (${params.billingCycle})`);
  }
  return priceId;
}

async function paddleRequest<T>(path: string, init?: RequestInit): Promise<T> {
  if (!PADDLE_API_KEY) {
    throw new Error('PADDLE_API_KEY is not configured');
  }

  const response = await fetch(`${getPaddleApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${PADDLE_API_KEY}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const text = await response.text();
  let json: any = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = {};
  }

  if (!response.ok) {
    const providerMessage =
      json?.error?.detail ||
      json?.errors?.[0]?.detail ||
      json?.errors?.[0]?.message ||
      json?.message ||
      `Paddle request failed with status ${response.status}`;
    throw new Error(providerMessage);
  }

  return json as T;
}

export const paddleProvider: PaymentProvider = {
  id: 'paddle',

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession> {
    const priceId = getPriceId(params);
    const checkoutUrl = getCheckoutUrl(params.successUrl);

    const response = await paddleRequest<{
      data?: {
        id: string;
        checkout?: {
          url?: string | null;
        } | null;
      };
    }>('/transactions', {
      method: 'POST',
      body: JSON.stringify({
        collection_mode: 'automatic',
        items: [{ price_id: priceId, quantity: 1 }],
        checkout: { url: checkoutUrl },
        custom_data: {
          user_id: params.userId,
          user_email: params.userEmail,
          tier: params.tier,
          billing_cycle: params.billingCycle,
          region: params.region,
          currency: params.currency,
          success_url: params.successUrl,
          cancel_url: params.cancelUrl,
        },
      }),
    });

    const transactionId = response.data?.id;
    if (!transactionId) {
      throw new Error('Paddle transaction id missing from response');
    }

    const redirectUrl = new URL(checkoutUrl);
    redirectUrl.searchParams.set('transaction_id', transactionId);
    redirectUrl.searchParams.set('success_url', params.successUrl);
    redirectUrl.searchParams.set('cancel_url', params.cancelUrl);

    return {
      url: redirectUrl.toString(),
      providerSessionId: transactionId,
    };
  },

  async cancelSubscription(params: CancelSubscriptionParams): Promise<{ success: boolean }> {
    if (!PADDLE_API_KEY) {
      return { success: false };
    }

    await paddleRequest(`/subscriptions/${params.providerSubscriptionId}/cancel`, {
      method: 'POST',
      body: JSON.stringify({
        effective_from: params.atPeriodEnd ? 'next_billing_period' : 'immediately',
      }),
    });

    return { success: true };
  },

  async getSubscription(providerSubscriptionId: string): Promise<SubscriptionRecord | null> {
    if (!PADDLE_API_KEY) {
      return null;
    }

    const response = await paddleRequest<{
      data?: {
        id: string;
        customer_id: string;
        status: SubscriptionRecord['status'];
        current_billing_period?: {
          starts_at: string;
          ends_at: string;
        } | null;
        scheduled_change?: {
          action?: string | null;
        } | null;
        items?: Array<{
          price?: {
            id?: string | null;
          } | null;
        }>;
      };
    }>(`/subscriptions/${providerSubscriptionId}`);

    const subscription = response.data;
    if (!subscription?.current_billing_period) {
      return null;
    }

    const priceId = subscription.items?.[0]?.price?.id || '';
    const tier =
      priceId === process.env.PADDLE_PRICE_ID_ELITE_MONTHLY || priceId === process.env.PADDLE_PRICE_ID_ELITE_ANNUAL
        ? 'ELITE'
        : 'PRO';

    return {
      providerSubscriptionId: subscription.id,
      providerCustomerId: subscription.customer_id,
      tier,
      status: subscription.status,
      currentPeriodStart: subscription.current_billing_period.starts_at,
      currentPeriodEnd: subscription.current_billing_period.ends_at,
      cancelAtPeriodEnd: subscription.scheduled_change?.action === 'cancel',
    };
  },

  async verifyWebhook(rawBody: string, signatureHeader: string | null): Promise<WebhookVerificationResult> {
    if (!PADDLE_WEBHOOK_SECRET || !signatureHeader) {
      return { valid: false };
    }

    const parts = signatureHeader.split(';').reduce<Record<string, string[]>>((acc, part) => {
      const [key, value] = part.split('=');
      if (key && value) {
        const normalizedKey = key.trim();
        acc[normalizedKey] = [...(acc[normalizedKey] || []), value.trim()];
      }
      return acc;
    }, {});

    const timestamp = parts.ts?.[0];
    const signatures = parts.h1 || [];
    if (!timestamp || signatures.length === 0) {
      return { valid: false };
    }

    const ageInSeconds = Math.abs(Date.now() / 1000 - Number(timestamp));
    if (!Number.isFinite(ageInSeconds) || ageInSeconds > 300) {
      return { valid: false };
    }

    const expectedSignature = crypto
      .createHmac('sha256', PADDLE_WEBHOOK_SECRET)
      .update(`${timestamp}:${rawBody}`)
      .digest('hex');

    const expectedBuffer = Buffer.from(expectedSignature, 'hex');
    const signatureMatches = signatures.some((signature) => {
      const receivedBuffer = Buffer.from(signature, 'hex');
      return receivedBuffer.length === expectedBuffer.length && crypto.timingSafeEqual(receivedBuffer, expectedBuffer);
    });

    if (!signatureMatches) {
      return { valid: false };
    }

    try {
      const payload = JSON.parse(rawBody) as { event_type?: string };
      return { valid: true, eventType: payload.event_type, payload };
    } catch {
      return { valid: false };
    }
  },
};
