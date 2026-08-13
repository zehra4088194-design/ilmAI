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
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  jazzcash: 'JazzCash',
  easypaisa: 'Easypaisa',
  bank_transfer: 'Bank Transfer',
  card: 'Card (auto-renewal)',
};
