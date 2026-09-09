'use server';

import { randomBytes } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { syncOrganizationSchoolGrants } from '@/lib/school-erp/subscription-cascade';
import { syncOrganizationCollegeGrants } from '@/lib/college-erp/subscription-cascade';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { resolveInstitutionPricing } from '@/lib/platform-settings/shared';
import type { BillingCycle, InstitutionPaymentVerification, InstitutionType, PaymentMethod } from './types';

/** 'A1B2C3D4' — short enough to type on WhatsApp, long enough (16^8) that guessing one is not a
 * realistic attack; the real gate against forging a match is still the exact-TID SMS lookup this
 * code is paired with (see src/lib/payments/jazzcash.ts). */
function generateClaimCode() {
  return randomBytes(4).toString('hex').toUpperCase();
}

const ENROLLMENT_TABLE: Record<InstitutionType, string> = {
  school: 'school_enrollments',
  college: 'college_enrollments',
};

// The volume discount is meant to reward genuinely large institutions — read
// from real active enrollment, not an admin-configured max_students ceiling
// (which can be set well above actual headcount and would otherwise let a
// small institution claim a discount it doesn't qualify for).
export async function getActiveStudentCount(institutionType: InstitutionType, organizationId: string) {
  if (!organizationId) return 0;
  const db = (await createAdminClient()) as any;
  const { count } = await db
    .from(ENROLLMENT_TABLE[institutionType])
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('status', 'active');
  return count || 0;
}

export type SubmitPaymentState = { success: boolean; message: string; claimCode?: string | null };

// Master prompt Part 6.2: an institution owner/admin submits a manual payment
// claim (JazzCash/Bank/Card) after sending funds outside the app —
// this only records the claim as `pending_review`; it never activates the plan
// itself (see reviewInstitutionPaymentVerification below for that).
export async function submitInstitutionPaymentVerification(
  institutionType: InstitutionType,
  _state: SubmitPaymentState,
  formData: FormData
): Promise<SubmitPaymentState> {
  const organizationId = String(formData.get('organization_id') || '').trim();
  const planTierId = String(formData.get('plan_tier_id') || '').trim() || null;
  const billingCycle = (formData.get('billing_cycle') === 'annual' ? 'annual' : 'monthly') as BillingCycle;
  const method = String(formData.get('method') || '') as PaymentMethod;
  const contactEmail = String(formData.get('contact_email') || '').trim();
  const notes = String(formData.get('notes') || '').trim() || null;

  if (!organizationId) return { success: false, message: 'Missing organization.' };
  if (!['jazzcash', 'easypaisa', 'bank_transfer', 'card'].includes(method)) {
    return { success: false, message: 'Choose a payment method.' };
  }
  if (!contactEmail.includes('@')) return { success: false, message: 'A contact email is required.' };

  // Verify the caller actually owns/admins this exact organization before
  // recording a claim against it — same guard both portals' settings page uses.
  let profileId: string | null = null;
  if (institutionType === 'school') {
    const { context } = await requireSchoolContext('organization.manage');
    if (!context || context.organization.id !== organizationId) {
      return { success: false, message: 'You are not authorized to submit a payment for this school.' };
    }
    profileId = context.userId;
  } else {
    const { context } = await requireCollegeContext('organization.manage');
    if (!context || context.organization.id !== organizationId) {
      return { success: false, message: 'You are not authorized to submit a payment for this college.' };
    }
    profileId = context.userId;
  }

  const db = (await createAdminClient()) as any;

  // Never trust a client-submitted price for a record an admin will rely on to
  // decide whether real money actually changed hands — recompute it the exact
  // same way the checkout UI displayed it (same global pricing + the org's own
  // active-enrollment count), server-side, right before it's stored.
  const settingsTable = institutionType === 'school' ? 'school_organization_plan_settings' : 'college_organization_plan_settings';
  const [platformSettings, studentCount] = await Promise.all([
    getPlatformSettings(),
    getActiveStudentCount(institutionType, organizationId),
  ]);
  const { usd: amountUsd, pkr: amountPkr } = resolveInstitutionPricing(platformSettings, institutionType, billingCycle, studentCount);

  // Retry once on the (extremely unlikely) chance a freshly generated code collides with an
  // existing one — the unique index (see the jazzcash_auto_verify migration) is the real guard.
  let claimCode = generateClaimCode();
  let { error } = await db.from('institution_payment_verifications').insert({
    institution_type: institutionType,
    organization_id: organizationId,
    plan_tier_id: planTierId,
    billing_cycle: billingCycle,
    amount_usd: amountUsd,
    amount_pkr: amountPkr,
    method,
    contact_email: contactEmail,
    notes,
    submitted_by: profileId,
    claim_code: claimCode,
  });
  if (error?.code === '23505') {
    claimCode = generateClaimCode();
    ({ error } = await db.from('institution_payment_verifications').insert({
      institution_type: institutionType,
      organization_id: organizationId,
      plan_tier_id: planTierId,
      billing_cycle: billingCycle,
      amount_usd: amountUsd,
      amount_pkr: amountPkr,
      method,
      contact_email: contactEmail,
      notes,
      submitted_by: profileId,
      claim_code: claimCode,
    }));
  }
  if (error) return { success: false, message: error.message };

  // Surface the pending claim on the plan-settings row immediately (informational
  // only — does not grant access) so the org sees "we got it" without waiting on
  // the admin, mirroring the schema's existing 'manual_review' billing_status.
  const { data: existing } = await db.from(settingsTable).select('billing_status').eq('organization_id', organizationId).maybeSingle();
  if (!existing || existing.billing_status === 'trial') {
    await db.from(settingsTable).upsert(
      { organization_id: organizationId, billing_status: 'manual_review', updated_at: new Date().toISOString() },
      { onConflict: 'organization_id' }
    );
  }

  revalidatePath(institutionType === 'school' ? '/school-admin/settings' : '/college-admin/settings');
  // The JazzCash SMS auto-verify pipeline is currently disabled (SMS forwarding isn't reliably
  // set up) — every method just goes to manual admin review for now. claim_code is still
  // generated/stored so auto-verify can be turned back on later without a schema change; it's
  // just not surfaced to the payer while it's off.
  return {
    success: true,
    message: 'Payment claim submitted. An admin will verify it shortly.',
    claimCode,
  };
}

export async function listPendingInstitutionPaymentVerifications(): Promise<InstitutionPaymentVerification[]> {
  const admin = await requireAdminUser();
  if (!admin) return [];
  const db = (await createAdminClient()) as any;
  const { data } = await db
    .from('institution_payment_verifications')
    .select('*')
    .eq('status', 'pending_review')
    .order('created_at', { ascending: true });
  return (data || []) as InstitutionPaymentVerification[];
}

export type ReviewState = { success: boolean; message: string };
export type ActivationOutcome = { success: boolean; message: string; institutionType?: InstitutionType };

/**
 * The actual "turn a claim into paid access" logic — flips the org's plan-settings billing_status
 * to 'active' and runs the existing member-grant cascade (same function /admin/schools's billing
 * toggle already calls). Extracted out of reviewInstitutionPaymentVerification (below) so the
 * JazzCash SMS auto-verify endpoint (src/app/api/payments/jazzcash/verify/route.ts) can activate a
 * claim the exact same way a human admin's approval does, instead of a second copy of this logic
 * drifting out of sync. `reviewedBy` is null for an automated match (no admin in the loop);
 * `decision` supports 'rejected' too so the admin path below can still keep using this helper.
 */
export async function activateInstitutionPaymentClaim(
  claimId: string,
  decision: 'verified' | 'rejected',
  options: { reviewedBy: string | null; reviewNotes?: string | null }
): Promise<ActivationOutcome> {
  const db = (await createAdminClient()) as any;
  const { data: claim } = await db.from('institution_payment_verifications').select('*').eq('id', claimId).maybeSingle();
  if (!claim) return { success: false, message: 'Payment claim not found.' };
  if (claim.status !== 'pending_review') return { success: false, message: 'This claim was already reviewed.' };

  const { error } = await db
    .from('institution_payment_verifications')
    .update({
      status: decision,
      reviewed_by: options.reviewedBy,
      reviewed_at: new Date().toISOString(),
      review_notes: options.reviewNotes ?? null,
    })
    .eq('id', claimId);
  if (error) return { success: false, message: error.message };

  if (decision === 'verified') {
    const settingsTable =
      claim.institution_type === 'school' ? 'school_organization_plan_settings' : 'college_organization_plan_settings';
    const renewsOn = new Date();
    renewsOn.setMonth(renewsOn.getMonth() + (claim.billing_cycle === 'annual' ? 12 : 1));
    await db.from(settingsTable).upsert(
      {
        organization_id: claim.organization_id,
        billing_status: 'active',
        plan_tier_id: claim.plan_tier_id,
        renews_on: renewsOn.toISOString().slice(0, 10),
        updated_by: options.reviewedBy,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'organization_id' }
    );
    if (claim.institution_type === 'school') {
      await syncOrganizationSchoolGrants(claim.organization_id, true);
    } else {
      await syncOrganizationCollegeGrants(claim.organization_id, true);
    }
  }

  return {
    success: true,
    message: decision === 'verified' ? 'Plan activated.' : 'Claim rejected.',
    institutionType: claim.institution_type,
  };
}

export async function reviewInstitutionPaymentVerification(
  _state: ReviewState,
  formData: FormData
): Promise<ReviewState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };

  const id = String(formData.get('id') || '').trim();
  const decision = String(formData.get('decision') || '');
  const reviewNotes = String(formData.get('review_notes') || '').trim() || null;
  if (!id || (decision !== 'verified' && decision !== 'rejected')) {
    return { success: false, message: 'Invalid review request.' };
  }

  const outcome = await activateInstitutionPaymentClaim(id, decision, { reviewedBy: admin.id, reviewNotes });
  if (outcome.success) revalidatePath('/admin/institution-payments');
  return outcome;
}
