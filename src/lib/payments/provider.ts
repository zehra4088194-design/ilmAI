// ============================================
// PAYMENT PROVIDER INTERFACE
// ============================================

export type SubscriptionTier = 'FREE' | 'PRO' | 'ELITE';
export type PaymentRegion = 'GLOBAL' | 'PK';
export type CheckoutCurrency = 'USD' | 'PKR';
export type BillingCycle = 'monthly' | 'annual' | 'one_time';

export interface CreateCheckoutParams {
  userId: string;
  userEmail: string;
  tier: Exclude<SubscriptionTier, 'FREE'>;
  billingCycle: BillingCycle;
  planFamily?: 'student' | 'parent' | 'teacher' | 'university';
  region: PaymentRegion;
  currency: CheckoutCurrency;
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  url: string;
  providerSessionId: string;
}

export interface CancelSubscriptionParams {
  userId: string;
  providerSubscriptionId: string;
  atPeriodEnd?: boolean;
}

export interface SubscriptionRecord {
  providerSubscriptionId: string;
  providerCustomerId: string;
  tier: SubscriptionTier;
  status: 'active' | 'past_due' | 'canceled' | 'trialing' | 'incomplete';
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
}

export interface WebhookVerificationResult {
  valid: boolean;
  eventType?: string;
  payload?: unknown;
}

export interface PaymentProvider {
  readonly id: string;
  createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession>;
  cancelSubscription(params: CancelSubscriptionParams): Promise<{ success: boolean }>;
  getSubscription(providerSubscriptionId: string): Promise<SubscriptionRecord | null>;
  verifyWebhook(rawBody: string, signatureHeader: string | null): Promise<WebhookVerificationResult>;
}
