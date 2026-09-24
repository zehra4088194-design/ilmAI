'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { requireCollegeContext } from '@/lib/college-erp/access';
import type { InstitutionType, PaymentMethod } from './types';

export type FeeClaimState = { success: boolean; message: string };

const INVOICE_TABLE: Record<InstitutionType, string> = {
  school: 'school_fee_invoices',
  college: 'college_fee_invoices',
};
const GUARDIAN_TABLE: Record<InstitutionType, string> = {
  school: 'school_guardians',
  college: 'college_guardians',
};
const PAYMENTS_TABLE: Record<InstitutionType, string> = {
  school: 'school_fee_payments',
  college: 'college_fee_payments',
};
// school/college_fee_payments.payment_method only allows 'cash'|'bank'|'card'|'wallet'|'online'|'adjustment' —
// the original JazzCash/Easypaisa/Bank/Card choice is preserved in the `provider` column instead.
const PAYMENT_METHOD_MAP: Record<PaymentMethod, string> = {
  jazzcash: 'wallet',
  easypaisa: 'wallet',
  bank_transfer: 'bank',
  card: 'card',
};

export type FeeInvoiceSummary = {
  id: string;
  organization_id: string;
  student_id: string;
  voucher_number: string;
  total_amount: number;
  paid_amount: number;
  status: string;
};

// Master prompt Part 6.3: a student/parent submits a manual payment claim
// against their own fee invoice. Ownership is re-verified server-side (self or
// an approved guardian link) — never trusted from the form.
export async function loadFeeInvoiceForPayer(
  institutionType: InstitutionType,
  invoiceId: string
): Promise<{ invoice: FeeInvoiceSummary; contactEmail: string; payerId: string } | null> {
  const { context, userId } =
    institutionType === 'school'
      ? await (async () => {
          const { context } = await requireSchoolContext('dashboard.read');
          return { context, userId: context?.userId || null };
        })()
      : await (async () => {
          const { context } = await requireCollegeContext('dashboard.read');
          return { context, userId: context?.userId || null };
        })();
  if (!context || !userId) return null;

  const db = (await createAdminClient()) as any;
  const { data: invoice } = await db
    .from(INVOICE_TABLE[institutionType])
    .select('id, organization_id, student_id, voucher_number, total_amount, paid_amount, status')
    .eq('id', invoiceId)
    .maybeSingle();
  if (!invoice || invoice.organization_id !== context.organization.id) return null;

  const isSelf = invoice.student_id === userId;
  let isGuardian = false;
  if (!isSelf) {
    const { data: link } = await db
      .from(GUARDIAN_TABLE[institutionType])
      .select('id')
      .eq('organization_id', invoice.organization_id)
      .eq('student_id', invoice.student_id)
      .eq('guardian_id', userId)
      .maybeSingle();
    isGuardian = Boolean(link);
  }
  if (!isSelf && !isGuardian) return null;

  const { data: profile } = await db.from('profiles').select('email').eq('id', userId).maybeSingle();
  return { invoice: invoice as FeeInvoiceSummary, contactEmail: profile?.email || '', payerId: userId };
}

export async function submitFeePaymentClaim(
  institutionType: InstitutionType,
  _state: FeeClaimState,
  formData: FormData
): Promise<FeeClaimState> {
  const invoiceId = String(formData.get('invoice_id') || '').trim();
  const method = String(formData.get('method') || '') as PaymentMethod;
  const contactEmail = String(formData.get('contact_email') || '').trim();
  const amount = Number(formData.get('amount')) || 0;
  const notes = String(formData.get('notes') || '').trim() || null;

  if (!invoiceId) return { success: false, message: 'Missing invoice.' };
  if (!['jazzcash', 'easypaisa', 'bank_transfer', 'card'].includes(method)) {
    return { success: false, message: 'Choose a payment method.' };
  }
  if (!contactEmail.includes('@')) return { success: false, message: 'A contact email is required.' };
  if (amount <= 0) return { success: false, message: 'Enter the amount you paid.' };

  const loaded = await loadFeeInvoiceForPayer(institutionType, invoiceId);
  if (!loaded) return { success: false, message: 'You are not authorized to pay this invoice.' };
  const outstanding = Number(loaded.invoice.total_amount) - Number(loaded.invoice.paid_amount);
  if (amount > outstanding + 0.01) {
    return { success: false, message: `Amount exceeds the outstanding balance (${outstanding.toFixed(2)}).` };
  }

  const db = (await createAdminClient()) as any;
  const { error } = await db.from('institution_fee_payment_claims').insert({
    institution_type: institutionType,
    organization_id: loaded.invoice.organization_id,
    invoice_id: invoiceId,
    student_id: loaded.invoice.student_id,
    amount,
    method,
    contact_email: contactEmail,
    notes,
    submitted_by: loaded.payerId,
  });
  if (error) return { success: false, message: error.message };

  revalidatePath(institutionType === 'school' ? '/school' : '/college/dashboard');
  return { success: true, message: 'Payment claim submitted. The finance office will verify it shortly.' };
}

export async function listPendingFeePaymentClaims(institutionType: InstitutionType, organizationId: string) {
  const db = (await createAdminClient()) as any;
  const { data } = await db
    .from('institution_fee_payment_claims')
    .select('*, profiles!institution_fee_payment_claims_student_id_fkey(full_name)')
    .eq('institution_type', institutionType)
    .eq('organization_id', organizationId)
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true });
  return data || [];
}

export async function reviewFeePaymentClaim(
  institutionType: InstitutionType,
  _state: FeeClaimState,
  formData: FormData
): Promise<FeeClaimState> {
  const id = String(formData.get('id') || '').trim();
  const decision = String(formData.get('decision') || '');
  if (!id || (decision !== 'verified' && decision !== 'rejected')) {
    return { success: false, message: 'Invalid review request.' };
  }

  const { context, reviewerId } =
    institutionType === 'school'
      ? await (async () => {
          const { context } = await requireSchoolContext('fees.manage');
          return { context, reviewerId: context?.userId || null };
        })()
      : await (async () => {
          const { context } = await requireCollegeContext('fees.manage');
          return { context, reviewerId: context?.userId || null };
        })();
  if (!context || !reviewerId) return { success: false, message: 'You do not have permission to review fee payments.' };

  const db = (await createAdminClient()) as any;
  const { data: claim } = await db.from('institution_fee_payment_claims').select('*').eq('id', id).maybeSingle();
  if (!claim || claim.institution_type !== institutionType || claim.organization_id !== context.organization.id) {
    return { success: false, message: 'Payment claim not found.' };
  }
  if (claim.status !== 'pending_review') return { success: false, message: 'This claim was already reviewed.' };

  const { error } = await db
    .from('institution_fee_payment_claims')
    .update({ status: decision, reviewed_by: reviewerId, reviewed_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { success: false, message: error.message };

  if (decision === 'verified') {
    const receiptNumber = `MC-${Date.now().toString(36).toUpperCase()}`;
    const { error: paymentError } = await db.from(PAYMENTS_TABLE[institutionType]).insert({
      organization_id: claim.organization_id,
      invoice_id: claim.invoice_id,
      amount: claim.amount,
      payment_method: PAYMENT_METHOD_MAP[claim.method as PaymentMethod] || 'online',
      provider: claim.method,
      receipt_number: receiptNumber,
      received_by: reviewerId,
      notes: claim.notes ? `Manual claim: ${claim.notes}` : 'Verified manual payment claim.',
    });
    if (paymentError) return { success: false, message: paymentError.message };
  }

  revalidatePath(institutionType === 'school' ? '/school-admin/fees' : '/college-admin/fees');
  return { success: true, message: decision === 'verified' ? 'Payment recorded.' : 'Claim rejected.' };
}
