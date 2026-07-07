// ============================================
// PAYPRO PROVIDER (Pakistan Payments)
// ============================================
// TODO: Wire this up to the real PayPro Global / PayPro Pakistan API once
// PAYPRO_API_KEY and PAYPRO_WEBHOOK_SECRET env vars are set. This file
// currently returns safe placeholder responses so the app builds and runs
// without a live PayPro account.
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

export const payproProvider: PaymentProvider = {
  id: 'paypro',

  async createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession> {
    // TODO: Replace with real PayPro checkout/order creation call.
    // PayPro is commonly used for JazzCash / Easypaisa / local card rails in Pakistan.
    // Use params.currency ('PKR' | 'INR') as the order currency — PayPro's
    // Pakistan rails are PKR-first, so an 'INR' order here would be unusual
    // (an Indian student would normally go through the INTERNATIONAL/Paddle
    // flow instead) but the field is passed through regardless in case a
    // regional PayPro India integration is added later.
    if (!PAYPRO_API_KEY) {
      console.warn('[paypro] PAYPRO_API_KEY not set — returning placeholder checkout session');
    }

    return {
      url: `${params.successUrl}?provider=paypro&status=not_configured`,
      providerSessionId: `paypro_placeholder_${params.userId}_${Date.now()}`,
    };
  },

  async cancelSubscription(_params: CancelSubscriptionParams): Promise<{ success: boolean }> {
    // TODO: Call PayPro's subscription cancellation endpoint.
    console.warn('[paypro] cancelSubscription not implemented yet');
    return { success: false };
  },

  async getSubscription(_providerSubscriptionId: string): Promise<SubscriptionRecord | null> {
    // TODO: Fetch subscription/order details from PayPro.
    console.warn('[paypro] getSubscription not implemented yet');
    return null;
  },

  async verifyWebhook(rawBody: string, signatureHeader: string | null): Promise<WebhookVerificationResult> {
    // TODO: Verify using PayPro's signature scheme once documented/configured.
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
