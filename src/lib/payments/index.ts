// ============================================
// PAYMENTS - PUBLIC ENTRYPOINT
// ============================================
import type { PaymentProvider, PaymentRegion } from './provider';
import { paddleProvider } from './paddle';
import { payproProvider } from './paypro';
import { isPlayConsumptionOnlyRequest } from './distribution';

export type { PaymentProvider, PaymentRegion, CreateCheckoutParams, CheckoutSession, CancelSubscriptionParams, SubscriptionRecord, WebhookVerificationResult, SubscriptionTier, BillingCycle } from './provider';
export { getPublicRequestUrl, getRequestHost, isPlayConsumptionOnlyHost, isPlayConsumptionOnlyRequest, PLAY_CONSUMPTION_ONLY_HEADER } from './distribution';
export { PaddleRequestError } from './paddle';

export type PaymentAvailability = { paddleConfigured: boolean; localGatewayConfigured: boolean; automatedAvailable: boolean; consumptionOnly: boolean };
const PROVIDERS: Partial<Record<PaymentRegion, PaymentProvider>> = { GLOBAL: paddleProvider, PK: payproProvider };
const PROVIDERS_BY_ID: Record<string, PaymentProvider> = { paddle: paddleProvider, paypro: payproProvider };

export function getPaymentProvider(region: PaymentRegion): PaymentProvider {
  const provider = PROVIDERS[region];
  if (!provider) throw new Error(`No payment provider configured for region: ${region}`);
  return provider;
}
export function getPaymentProviderById(id: string): PaymentProvider {
  const provider = PROVIDERS_BY_ID[id];
  if (!provider) throw new Error(`Unknown payment provider id: ${id}`);
  return provider;
}
function hasPaddleBaseCredentials() {
  return Boolean(process.env.PADDLE_API_KEY && process.env.PADDLE_WEBHOOK_SECRET && process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN);
}

export function getPaymentAvailability(requestHeaders?: Pick<Headers, 'get'>): PaymentAvailability {
  const consumptionOnly = requestHeaders ? isPlayConsumptionOnlyRequest(requestHeaders) : false;
  const productIds = [
    'PADDLE_PRODUCT_ID_STUDENT_PRO','PADDLE_PRODUCT_ID_STUDENT_ELITE',
    'PADDLE_PRODUCT_ID_PARENT_PRO','PADDLE_PRODUCT_ID_PARENT_ELITE',
    'PADDLE_PRODUCT_ID_TEACHER_PRO','PADDLE_PRODUCT_ID_TEACHER_ELITE',
    'PADDLE_PRODUCT_ID_UNIVERSITY_PRO','PADDLE_PRODUCT_ID_UNIVERSITY_ELITE',
  ];
  const paddleProductConfigured = productIds.some((key) => Boolean(process.env[key]));
  const paddleConfigured = !consumptionOnly && hasPaddleBaseCredentials() && paddleProductConfigured;
  const payproCredentialsConfigured = Boolean(
    process.env.PAYPRO_CHECKOUT_URL && process.env.PAYPRO_WEBHOOK_SECRET &&
    process.env.PAYPRO_PLAN_ID_PRO_MONTHLY && process.env.PAYPRO_PLAN_ID_PRO_ANNUAL &&
    process.env.PAYPRO_PLAN_ID_ELITE_MONTHLY && process.env.PAYPRO_PLAN_ID_ELITE_ANNUAL
  );
  const localGatewayConfigured = !consumptionOnly && payproCredentialsConfigured;
  return { paddleConfigured, localGatewayConfigured, automatedAvailable: paddleConfigured || localGatewayConfigured, consumptionOnly };
}
export function isPaymentRegionConfigured(region: PaymentRegion, requestHeaders?: Pick<Headers, 'get'>) {
  const availability = getPaymentAvailability(requestHeaders);
  return region === 'GLOBAL' ? availability.paddleConfigured : region === 'PK' ? availability.localGatewayConfigured : false;
}
export const PLAN_PRICES: Record<'PRO'|'ELITE',{monthly:number;annual:number}> = { PRO:{monthly:2.99,annual:28.7}, ELITE:{monthly:4.99,annual:47.9} };
