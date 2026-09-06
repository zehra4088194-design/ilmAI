import crypto from 'node:crypto';
import type {
  CancelSubscriptionParams,
  CheckoutSession,
  CreateCheckoutParams,
  PaymentProvider,
  SubscriptionRecord,
  WebhookVerificationResult,
} from './provider';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { resolvePlanAmountUsd } from '@/lib/platform-settings/shared';

const PADDLE_API_KEY = process.env.PADDLE_API_KEY;
const PADDLE_WEBHOOK_SECRET = process.env.PADDLE_WEBHOOK_SECRET;

// One Paddle PRODUCT per plan family x tier — NOT a price. The actual charge amount is set fresh
// per checkout below, straight from whatever the admin panel currently has saved
// (resolvePlanAmountUsd), via Paddle's non-catalog price API (same pattern as
// createInstitutionCheckout/createSupportCheckout). So a price change in the admin panel takes
// effect immediately on the next checkout — no matching Paddle dashboard price to create/update.
const PRODUCT_IDS = {
  student: { PRO: process.env.PADDLE_PRODUCT_ID_STUDENT_PRO, ELITE: process.env.PADDLE_PRODUCT_ID_STUDENT_ELITE },
  parent: { PRO: process.env.PADDLE_PRODUCT_ID_PARENT_PRO, ELITE: process.env.PADDLE_PRODUCT_ID_PARENT_ELITE },
  teacher: { PRO: process.env.PADDLE_PRODUCT_ID_TEACHER_PRO, ELITE: process.env.PADDLE_PRODUCT_ID_TEACHER_ELITE },
  university: {
    PRO: process.env.PADDLE_PRODUCT_ID_UNIVERSITY_PRO,
    ELITE: process.env.PADDLE_PRODUCT_ID_UNIVERSITY_ELITE,
  },
} as const;

export class PaddleRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly requestId?: string | null
  ) {
    super(message);
    this.name = 'PaddleRequestError';
  }
}

function getPaddleApiBaseUrl() {
  return PADDLE_API_KEY?.includes('_sdbx') ? 'https://sandbox-api.paddle.com' : 'https://api.paddle.com';
}

function getCheckoutUrl(successUrl: string) {
  return new URL('/checkout', successUrl).toString();
}

async function resolveCheckoutPricing(params: CreateCheckoutParams) {
  const family = params.planFamily || 'student';
  const productId = PRODUCT_IDS[family][params.tier];
  if (!productId) {
    throw new Error(`Missing Paddle product id for ${family} ${params.tier}`);
  }
  const settings = await getPlatformSettings();
  const amountUsd = resolvePlanAmountUsd(settings, {
    tier: params.tier,
    billingCycle: params.billingCycle,
    planFamily: params.planFamily,
  });
  if (!(amountUsd > 0)) {
    throw new Error(`Invalid resolved amount for ${family} ${params.tier} (${params.billingCycle})`);
  }
  return { productId, amountUsd };
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
    const requestId = response.headers.get('paddle-request-id') || response.headers.get('request-id');
    const providerMessage =
      json?.error?.detail ||
      json?.errors?.[0]?.detail ||
      json?.errors?.[0]?.message ||
      json?.message ||
      `Paddle request failed with status ${response.status}`;
    throw new PaddleRequestError(providerMessage, response.status, requestId);
  }

  return json as T;
}

export const paddleProvider: PaymentProvider = {
  id: 'paddle',

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession> {
    const { productId, amountUsd } = await resolveCheckoutPricing(params);
    const checkoutUrl = getCheckoutUrl(params.successUrl);
    const unitPriceCents = String(Math.round(amountUsd * 100));
    const family = params.planFamily || 'student';

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
        items: [
          {
            price: {
              product_id: productId,
              description: `ilm AI ${family} ${params.tier} (${params.billingCycle})`,
              unit_price: { amount: unitPriceCents, currency_code: 'USD' },
              billing_cycle: { interval: params.billingCycle === 'annual' ? 'year' : 'month', frequency: 1 },
            },
            quantity: 1,
          },
        ],
        checkout: { url: checkoutUrl },
        custom_data: {
          user_id: params.userId,
          user_email: params.userEmail,
          tier: params.tier,
          billing_cycle: params.billingCycle,
          plan_family: family,
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
        custom_data?: Record<string, unknown> | null;
      };
    }>(`/subscriptions/${providerSubscriptionId}`);

    const subscription = response.data;
    if (!subscription?.current_billing_period) {
      return null;
    }

    // Prices are set per-checkout now (see createCheckout/resolveCheckoutPricing), not pre-created
    // catalog prices, so there's no fixed price id to match against a tier — custom_data.tier
    // (set unconditionally in createCheckout) is the only reliable source, same as the webhook.
    const tier = subscription.custom_data?.tier === 'ELITE' ? 'ELITE' : 'PRO';

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

// Institution (school/college) billing doesn't fit the FREE/PRO/ELITE catalog-price model the
// PaymentProvider interface above assumes — the amount is a per-student rate with volume/annual
// discounts computed server-side by resolveInstitutionPricing(), so there's no fixed price to
// pre-create in Paddle's catalog per tier. Paddle's non-catalog pricing (an inline `price` object
// instead of a `price_id`, attached to one existing Product) handles this without needing dozens
// of pre-created prices: PADDLE_INSTITUTION_PRODUCT_ID is the one Product every institution
// transaction attaches to; the actual amount/interval is set fresh per checkout, straight from
// whatever resolveInstitutionPricing already computed and displayed to the principal.
export type InstitutionCheckoutParams = {
  organizationId: string;
  institutionType: 'school' | 'college';
  billingCycle: 'monthly' | 'annual';
  /** Per-student total for this billing cycle, in whole USD (e.g. 8.50) — already discounted. */
  amountUsd: number;
  userId: string;
  userEmail: string;
  successUrl: string;
  cancelUrl: string;
};

export async function createInstitutionCheckout(params: InstitutionCheckoutParams): Promise<CheckoutSession> {
  const productId = process.env.PADDLE_INSTITUTION_PRODUCT_ID;
  if (!productId) {
    throw new Error('PADDLE_INSTITUTION_PRODUCT_ID is not configured');
  }
  if (!(params.amountUsd > 0)) {
    throw new Error('Invalid institution checkout amount');
  }

  const checkoutUrl = getCheckoutUrl(params.successUrl);
  // Paddle wants the unit price in the currency's smallest unit (cents for USD) as a string.
  const unitPriceCents = String(Math.round(params.amountUsd * 100));

  const response = await paddleRequest<{
    data?: { id: string };
  }>('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      collection_mode: 'automatic',
      items: [
        {
          price: {
            product_id: productId,
            description: `Ilm AI ${params.institutionType} plan (${params.billingCycle})`,
            unit_price: { amount: unitPriceCents, currency_code: 'USD' },
            billing_cycle: { interval: params.billingCycle === 'annual' ? 'year' : 'month', frequency: 1 },
          },
          quantity: 1,
        },
      ],
      checkout: { url: checkoutUrl },
      custom_data: {
        organization_id: params.organizationId,
        institution_type: params.institutionType,
        billing_cycle: params.billingCycle,
        user_id: params.userId,
        user_email: params.userEmail,
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

  return { url: redirectUrl.toString(), providerSessionId: transactionId };
}

// "Support ilm AI" donations — same non-catalog-price pattern as createInstitutionCheckout above:
// one pre-existing Product (PADDLE_SUPPORT_PRODUCT_ID), amount set fresh per checkout from
// whatever the visitor picked in the donate widget. `cycle: 'one_time'` omits billing_cycle (a
// single charge, no recurring subscription created); 'monthly'/'annual' sets it, so it becomes a
// real recurring subscription that auto-charges the saved card each period, same mechanism as
// every other plan (see resolveCheckoutPricing above). Works signed out — userId/userEmail are
// optional since a visitor can donate without an account.
export type SupportCheckoutParams = {
  amountUsd: number;
  cycle: 'one_time' | 'monthly' | 'annual';
  userId?: string | null;
  userEmail?: string | null;
  successUrl: string;
  cancelUrl: string;
};

export async function createSupportCheckout(params: SupportCheckoutParams): Promise<CheckoutSession> {
  const productId = process.env.PADDLE_SUPPORT_PRODUCT_ID;
  if (!productId) {
    throw new Error('PADDLE_SUPPORT_PRODUCT_ID is not configured');
  }
  if (!(params.amountUsd > 0)) {
    throw new Error('Invalid donation amount');
  }

  const checkoutUrl = getCheckoutUrl(params.successUrl);
  const unitPriceCents = String(Math.round(params.amountUsd * 100));
  const cycleLabel = params.cycle === 'monthly' ? 'monthly' : params.cycle === 'annual' ? 'yearly' : 'one-time';

  const response = await paddleRequest<{
    data?: { id: string };
  }>('/transactions', {
    method: 'POST',
    body: JSON.stringify({
      collection_mode: 'automatic',
      items: [
        {
          price: {
            product_id: productId,
            description: `Support ilm AI (${cycleLabel})`,
            unit_price: { amount: unitPriceCents, currency_code: 'USD' },
            ...(params.cycle !== 'one_time'
              ? { billing_cycle: { interval: params.cycle === 'annual' ? 'year' : 'month', frequency: 1 } }
              : {}),
          },
          quantity: 1,
        },
      ],
      checkout: { url: checkoutUrl },
      custom_data: {
        purpose: 'donation',
        tier: 'FREE', // Not a plan upgrade — keeps resolveTier's fallback from mistaking this for one.
        cycle: params.cycle,
        user_id: params.userId || null,
        user_email: params.userEmail || null,
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

  return { url: redirectUrl.toString(), providerSessionId: transactionId };
}
