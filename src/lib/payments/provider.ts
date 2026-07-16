// ============================================
// PAYMENT PROVIDER INTERFACE
// ============================================
// Every payment gateway (Paddle, PayPro, or additional providers) implements
// this interface. Business logic (API routes, UI components) should NEVER
// import a specific gateway SDK directly — only this contract.
//
// To add another provider:
// 1. Create lib/payments/<provider>.ts implementing PaymentProvider
// 2. Register it in lib/payments/index.ts
// 3. Nothing else in the app needs to change.
// ============================================

export type SubscriptionTier = 'FREE' | 'PRO' | 'ELITE';

export type PaymentRegion = 'INTERNATIONAL' | 'PAKISTAN';

// Module 8 (currency localization): PKR for Pakistan, INR for India — see
// getCurrencyForBoard()/getCurrencyForCountry() in lib/constants.ts.
export type CheckoutCurrency = 'PKR' | 'INR';

export interface CreateCheckoutParams {
  /** Internal Supabase user id */
  userId: string;
  /** User's email, used to pre-fill checkout / match customer */
  userEmail: string;
  /** Plan being purchased */
  tier: Exclude<SubscriptionTier, 'FREE'>;
  /** Billing cycle */
  billingCycle: 'monthly' | 'annual';
  /** Which regional gateway flow to use (International vs Pakistan) */
  region: PaymentRegion;
  /**
   * Currency to charge in — resolved server-side from the user's
   * profiles.board (see /api/payments/create-session), not trusted from the
   * client. PKR is the safe default when a board isn't set yet.
   */
  currency: CheckoutCurrency;
  /** Where to send the user after success/cancel */
  successUrl: string;
  cancelUrl: string;
}

export interface CheckoutSession {
  /** URL the browser should redirect to in order to complete payment */
  url: string;
  /** Provider-specific session/checkout id, stored for reconciliation */
  providerSessionId: string;
}

export interface CancelSubscriptionParams {
  /** Internal Supabase user id */
  userId: string;
  /** Provider-specific subscription id, as stored in our DB */
  providerSubscriptionId: string;
  /** Cancel now vs at period end */
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
  /** Whether the signature/secret check passed */
  valid: boolean;
  /** Normalized event type, e.g. 'checkout.completed' | 'subscription.canceled' */
  eventType?: string;
  /** Raw parsed payload, provider-specific shape */
  payload?: unknown;
}

/**
 * Contract every payment gateway integration must implement.
 * Keep this interface provider-agnostic — no gateway-specific types here.
 */
export interface PaymentProvider {
  /** Human-readable id, e.g. 'paddle' | 'paypro' */
  readonly id: string;

  /** Create a hosted checkout session and return the redirect URL. */
  createCheckout(params: CreateCheckoutParams): Promise<CheckoutSession>;

  /** Cancel an existing subscription with the provider. */
  cancelSubscription(params: CancelSubscriptionParams): Promise<{ success: boolean }>;

  /** Fetch the current state of a subscription from the provider. */
  getSubscription(providerSubscriptionId: string): Promise<SubscriptionRecord | null>;

  /** Verify an incoming webhook request's signature and parse its payload. */
  verifyWebhook(rawBody: string, signatureHeader: string | null): Promise<WebhookVerificationResult>;
}
