// ============================================
// PAYMENTS - PUBLIC ENTRYPOINT
// ============================================
// The rest of the app should ONLY import from 'lib/payments' (this file),
// never from './paddle' or './paypro' directly, and NEVER from 'stripe'.
//
// Usage:
//   import { getPaymentProvider } from '@/lib/payments';
//   const provider = getPaymentProvider('PAKISTAN'); // or 'INTERNATIONAL'
//   const session = await provider.createCheckout({ ... });
// ============================================
import type { PaymentProvider, PaymentRegion } from './provider';
import { payproProvider } from './paypro';

export type {
  PaymentProvider,
  PaymentRegion,
  CreateCheckoutParams,
  CheckoutSession,
  CancelSubscriptionParams,
  SubscriptionRecord,
  WebhookVerificationResult,
  SubscriptionTier,
} from './provider';

const PROVIDERS: Record<PaymentRegion, PaymentProvider> = {
  INTERNATIONAL: payproProvider,
  PAKISTAN: payproProvider,
};

/** Look up a provider by its string id, e.g. 'paddle' | 'paypro' (used in webhook routes). */
const PROVIDERS_BY_ID: Record<string, PaymentProvider> = {
  paypro: payproProvider,
};

/**
 * Get the payment provider for a given region.
 * - PAKISTAN -> PayPro
 * - INTERNATIONAL/Card checkout is intentionally disabled in the visible flow.
 */
export function getPaymentProvider(region: PaymentRegion): PaymentProvider {
  const provider = PROVIDERS[region];
  if (!provider) {
    throw new Error(`No payment provider configured for region: ${region}`);
  }
  return provider;
}

/** Get a payment provider by its id (e.g. inside a /api/payments/[provider]/webhook route). */
export function getPaymentProviderById(id: string): PaymentProvider {
  const provider = PROVIDERS_BY_ID[id];
  if (!provider) {
    throw new Error(`Unknown payment provider id: ${id}`);
  }
  return provider;
}

export function getPaymentAvailability() {
  const paddleConfigured = false;
  const payproConfigured = Boolean(
    process.env.PAYPRO_API_KEY &&
    process.env.PAYPRO_WEBHOOK_SECRET &&
    process.env.PAYPRO_CHECKOUT_URL
  );

  return {
    paddleConfigured,
    payproConfigured,
    automatedAvailable: paddleConfigured || payproConfigured,
  };
}

export function isPaymentRegionConfigured(region: PaymentRegion) {
  const availability = getPaymentAvailability();
  return region === 'INTERNATIONAL' ? false : availability.payproConfigured;
}

/** Pricing plan -> tier price map, gateway-agnostic. */
export const PLAN_PRICES: Record<'PRO' | 'ELITE', { monthly: number; annual: number }> = {
  PRO: { monthly: 500, annual: 4800 },
  ELITE: { monthly: 800, annual: 7680 },
};
