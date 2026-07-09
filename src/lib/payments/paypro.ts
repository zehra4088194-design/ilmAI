// ============================================
// PAYPRO PROVIDER (Pakistan Payments)
// ============================================
// TODO: Wire this up to the real PayPro Global / PayPro Pakistan API when
// the merchant contract is available. Until then, only a configured hosted
// checkout URL is considered live so users never hit a fake success page.
// ============================================
import type {
  PaymentProvider,
  CreateCheckoutParams,
  CheckoutSession,
  CancelSubscriptionParams,
  SubscriptionRecord,
  WebhookVerificationResult,
} from './provider';

const PAYPRO_API_KEY = process.env.PAYPRO_API_KEY;
const PAYPRO_WEBHOOK_SECRET = process.env.PAYPRO_WEBHOOK_SECRET;
const PAYPRO_CHECKOUT_URL = process.env.PAYPRO_CHECKOUT_URL;

export const payproProvider: PaymentProvider = {
  id: 'paypro',

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession> {
    if (!PAYPRO_API_KEY || !PAYPRO_CHECKOUT_URL) {
      throw new Error('PayPro online checkout is not configured');
    }

    const checkoutUrl = new URL(PAYPRO_CHECKOUT_URL);
    checkoutUrl.searchParams.set('user_id', params.userId);
    checkoutUrl.searchParams.set('email', params.userEmail);
    checkoutUrl.searchParams.set('tier', params.tier);
    checkoutUrl.searchParams.set('billing_cycle', params.billingCycle);
    checkoutUrl.searchParams.set('currency', params.currency);
    checkoutUrl.searchParams.set('success_url', params.successUrl);
    checkoutUrl.searchParams.set('cancel_url', params.cancelUrl);

    return {
      url: checkoutUrl.toString(),
      providerSessionId: `paypro_hosted_${params.userId}_${Date.now()}`,
    };
  },

  async cancelSubscription(_params: CancelSubscriptionParams): Promise<{ success: boolean }> {
    console.warn('[paypro] cancelSubscription not implemented yet');
    return { success: false };
  },

  async getSubscription(_providerSubscriptionId: string): Promise<SubscriptionRecord | null> {
    console.warn('[paypro] getSubscription not implemented yet');
    return null;
  },

  async verifyWebhook(rawBody: string, signatureHeader: string | null): Promise<WebhookVerificationResult> {
    if (!PAYPRO_WEBHOOK_SECRET || !signatureHeader) {
      return { valid: false };
    }
    try {
      const payload = JSON.parse(rawBody);
      return { valid: false, eventType: (payload as any)?.event, payload };
    } catch {
      return { valid: false };
    }
  },
};
