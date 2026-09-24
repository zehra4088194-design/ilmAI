export type InstitutionType = 'school' | 'college';
export type PaymentMethod = 'jazzcash' | 'easypaisa' | 'bank_transfer' | 'card';
export type BillingCycle = 'monthly' | 'annual';
export type VerificationStatus = 'pending_review' | 'verified' | 'rejected';

export type InstitutionPaymentVerification = {
  id: string;
  institution_type: InstitutionType;
  organization_id: string;
  plan_tier_id: string | null;
  billing_cycle: BillingCycle;
  amount_usd: number;
  amount_pkr: number;
  method: PaymentMethod;
  contact_email: string;
  notes: string | null;
  status: VerificationStatus;
  submitted_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  created_at: string;
  // 8-char code (e.g. "A1B2C3D4") the submitter includes with their WhatsApp transaction ID so
  // the JazzCash SMS auto-verify bot can find this exact claim — see src/lib/payments/jazzcash.ts
  // and activateInstitutionPaymentClaim() in ./actions.ts. Null for claims submitted before this
  // feature existed.
  claim_code: string | null;
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
  bank_transfer: 'Bank Transfer',
  card: 'Card (auto-renewal)',
};
