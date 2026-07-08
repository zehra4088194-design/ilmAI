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
import { paddleProvider } from './paddle';
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
  INTERNATIONAL: paddleProvider,
  PAKISTAN: payproProvider,
};

/** Look up a provider by its string id, e.g. 'paddle' | 'paypro' (used in webhook routes). */
const PROVIDERS_BY_ID: Record<string, PaymentProvider> = {
  paddle: paddleProvider,
  paypro: payproProvider,
};

/**
 * Get the payment provider for a given region.
 * - INTERNATIONAL -> Paddle
 * - PAKISTAN -> PayPro
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

/** Pricing plan -> tier price map, gateway-agnostic. */
export const PLAN_PRICES: Record<'PRO' | 'ELITE', { monthly: number; annual: number }> = {
  PRO: { monthly: 850, annual: 8160 },
  ELITE: { monthly: 1950, annual: 18720 },
};
