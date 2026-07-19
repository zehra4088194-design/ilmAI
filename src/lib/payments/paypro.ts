import type {
  CancelSubscriptionParams,
  CheckoutSession,
  CreateCheckoutParams,
  PaymentProvider,
  SubscriptionRecord,
  WebhookVerificationResult,
} from './provider';

const PAYPRO_CHECKOUT_URL = process.env.PAYPRO_CHECKOUT_URL;
const PAYPRO_WEBHOOK_SECRET = process.env.PAYPRO_WEBHOOK_SECRET;

const PAYPRO_PLAN_IDS = {
  PRO: {
    monthly: process.env.PAYPRO_PLAN_ID_PRO_MONTHLY,
    annual: process.env.PAYPRO_PLAN_ID_PRO_ANNUAL,
  },
  ELITE: {
    monthly: process.env.PAYPRO_PLAN_ID_ELITE_MONTHLY,
    annual: process.env.PAYPRO_PLAN_ID_ELITE_ANNUAL,
  },
} as const;

function getPlanId(params: CreateCheckoutParams) {
  const planId = PAYPRO_PLAN_IDS[params.tier][params.billingCycle];
  if (!planId) {
    throw new Error(`Missing PayPro plan id for ${params.tier} (${params.billingCycle})`);
  }
  return planId;
}

export const payproProvider: PaymentProvider = {
  id: 'paypro',

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession> {
    if (!PAYPRO_CHECKOUT_URL) {
      throw new Error('PAYPRO_CHECKOUT_URL is not configured');
    }

    const planId = getPlanId(params);
    const reference = `${params.userId}:${params.tier}:${params.billingCycle}:${Date.now()}`;
    const checkoutUrl = new URL(PAYPRO_CHECKOUT_URL);
    checkoutUrl.searchParams.set('plan_id', planId);
    checkoutUrl.searchParams.set('reference', reference);
    checkoutUrl.searchParams.set('customer_email', params.userEmail);
    checkoutUrl.searchParams.set('tier', params.tier);
    checkoutUrl.searchParams.set('billing_cycle', params.billingCycle);
    checkoutUrl.searchParams.set('currency', params.currency);
    checkoutUrl.searchParams.set('success_url', params.successUrl);
    checkoutUrl.searchParams.set('cancel_url', params.cancelUrl);

    return {
      url: checkoutUrl.toString(),
      providerSessionId: reference,
    };
  },

  async cancelSubscription(_params: CancelSubscriptionParams): Promise<{ success: boolean }> {
    return { success: false };
  },

  async getSubscription(_providerSubscriptionId: string): Promise<SubscriptionRecord | null> {
    return null;
  },

  async verifyWebhook(rawBody: string, signatureHeader: string | null): Promise<WebhookVerificationResult> {
    if (!PAYPRO_WEBHOOK_SECRET || signatureHeader !== PAYPRO_WEBHOOK_SECRET) {
      return { valid: false };
    }

    try {
      const payload = JSON.parse(rawBody) as { event?: string; event_type?: string; status?: string };
      return {
        valid: true,
        eventType: payload.event_type || payload.event || payload.status,
        payload,
      };
    } catch {
      return { valid: false };
    }
  },
};
