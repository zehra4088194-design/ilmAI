'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { syncOrganizationSchoolGrants } from '@/lib/school-erp/subscription-cascade';
import { syncOrganizationCollegeGrants } from '@/lib/college-erp/subscription-cascade';
import type { BillingCycle, InstitutionPaymentVerification, InstitutionType, PaymentMethod } from './types';

export type SubmitPaymentState = { success: boolean; message: string };

// Master prompt Part 6.2: an institution owner/admin submits a manual payment
// claim (JazzCash/Easypaisa/Bank/Card) after sending funds outside the app —
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
  const amountUsd = Number(formData.get('amount_usd')) || 0;
  const amountPkr = Number(formData.get('amount_pkr')) || 0;
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
  const { error } = await db.from('institution_payment_verifications').insert({
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
  });
  if (error) return { success: false, message: error.message };

  // Surface the pending claim on the plan-settings row immediately (informational
  // only — does not grant access) so the org sees "we got it" without waiting on
  // the admin, mirroring the schema's existing 'manual_review' billing_status.
  const settingsTable = institutionType === 'school' ? 'school_organization_plan_settings' : 'college_organization_plan_settings';
  const { data: existing } = await db.from(settingsTable).select('billing_status').eq('organization_id', organizationId).maybeSingle();
  if (!existing || existing.billing_status === 'trial') {
    await db.from(settingsTable).upsert(
      { organization_id: organizationId, billing_status: 'manual_review', updated_at: new Date().toISOString() },
      { onConflict: 'organization_id' }
    );
  }

  revalidatePath(institutionType === 'school' ? '/school-admin/settings' : '/college-admin/settings');
  return { success: true, message: 'Payment claim submitted. An admin will verify it shortly.' };
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

// Verifying is the only place a manual payment claim actually turns into paid
// access: it flips the org's plan-settings billing_status to 'active' and runs
// the existing member-grant cascade (same function /admin/schools's billing
// toggle already calls), so nothing about how access is granted is duplicated.
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

  const db = (await createAdminClient()) as any;
  const { data: claim } = await db.from('institution_payment_verifications').select('*').eq('id', id).maybeSingle();
  if (!claim) return { success: false, message: 'Payment claim not found.' };
  if (claim.status !== 'pending_review') return { success: false, message: 'This claim was already reviewed.' };

  const { error } = await db
    .from('institution_payment_verifications')
    .update({ status: decision, reviewed_by: admin.id, reviewed_at: new Date().toISOString(), review_notes: reviewNotes })
    .eq('id', id);
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
        updated_by: admin.id,
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

  revalidatePath('/admin/institution-payments');
  return { success: true, message: decision === 'verified' ? 'Plan activated.' : 'Claim rejected.' };
}
