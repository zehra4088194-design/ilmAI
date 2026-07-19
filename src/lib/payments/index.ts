// ============================================
// PAYMENTS - PUBLIC ENTRYPOINT
// ============================================
// The rest of the app should ONLY import from 'lib/payments' (this file),
// never from './paddle' directly.
//
// Usage:
//   import { getPaymentProvider } from '@/lib/payments';
//   const provider = getPaymentProvider('GLOBAL');
//   const session = await provider.createCheckout({ ... });
// ============================================
import type { PaymentProvider, PaymentRegion } from './provider';
import { paddleProvider } from './paddle';
import { payproProvider } from './paypro';
import { isPlayConsumptionOnlyRequest } from './distribution';

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
export {
  getPublicRequestUrl,
  getRequestHost,
  isPlayConsumptionOnlyHost,
  isPlayConsumptionOnlyRequest,
  PLAY_CONSUMPTION_ONLY_HEADER,
} from './distribution';

export type PaymentAvailability = {
  paddleConfigured: boolean;
  localGatewayConfigured: boolean;
  automatedAvailable: boolean;
  consumptionOnly: boolean;
};

const PROVIDERS: Partial<Record<PaymentRegion, PaymentProvider>> = {
  GLOBAL: paddleProvider,
  PK: payproProvider,
};

/** Look up a provider by its string id (used in webhook routes). */
const PROVIDERS_BY_ID: Record<string, PaymentProvider> = {
  paddle: paddleProvider,
  paypro: payproProvider,
};

/**
 * Get the payment provider for a given region.
 * GLOBAL uses Paddle card checkout; PK can use a local PayPro provider when
 * merchant checkout credentials are configured.
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

export function getPaymentAvailability(requestHeaders?: Pick<Headers, 'get'>): PaymentAvailability {
  const consumptionOnly = requestHeaders ? isPlayConsumptionOnlyRequest(requestHeaders) : false;
  const paddleCredentialsConfigured = Boolean(
    process.env.PADDLE_API_KEY &&
    process.env.PADDLE_WEBHOOK_SECRET &&
    process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN &&
    process.env.PADDLE_PRICE_ID_PRO_MONTHLY &&
    process.env.PADDLE_PRICE_ID_PRO_ANNUAL &&
    process.env.PADDLE_PRICE_ID_ELITE_MONTHLY &&
    process.env.PADDLE_PRICE_ID_ELITE_ANNUAL
  );
  const paddleConfigured = !consumptionOnly && paddleCredentialsConfigured;
  const payproCredentialsConfigured = Boolean(
    process.env.PAYPRO_CHECKOUT_URL &&
      process.env.PAYPRO_WEBHOOK_SECRET &&
      process.env.PAYPRO_PLAN_ID_PRO_MONTHLY &&
      process.env.PAYPRO_PLAN_ID_PRO_ANNUAL &&
      process.env.PAYPRO_PLAN_ID_ELITE_MONTHLY &&
      process.env.PAYPRO_PLAN_ID_ELITE_ANNUAL
  );
  const localGatewayConfigured = !consumptionOnly && payproCredentialsConfigured;
  return {
    paddleConfigured,
    localGatewayConfigured,
    automatedAvailable: paddleConfigured || localGatewayConfigured,
    consumptionOnly,
  };
}

export function isPaymentRegionConfigured(region: PaymentRegion, requestHeaders?: Pick<Headers, 'get'>) {
  const availability = getPaymentAvailability(requestHeaders);
  if (region === 'GLOBAL') return availability.paddleConfigured;
  if (region === 'PK') return availability.localGatewayConfigured;
  return false;
}

/** Pricing plan -> tier price map, gateway-agnostic. */
export const PLAN_PRICES: Record<'PRO' | 'ELITE', { monthly: number; annual: number }> = {
  PRO: { monthly: 2.99, annual: 28.7 },
  ELITE: { monthly: 4.99, annual: 47.9 },
};
