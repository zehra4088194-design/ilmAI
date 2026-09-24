'use server';

import { revalidatePath } from 'next/cache';
import slugify from 'slugify';
import { requireAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import { normalizeSchoolModules } from '@/lib/school-erp/modules';
import { syncOrganizationSchoolGrants } from '@/lib/school-erp/subscription-cascade';
import type { SchoolActionState } from '@/lib/school-erp/types';
import { inviteOrFindProfileId } from '@/lib/auth/inviteOrFindProfile';

export async function createSchoolOrganization(
  _state: SchoolActionState,
  formData: FormData
): Promise<SchoolActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };
  const name = String(formData.get('name') || '').trim();
  const ownerEmail = String(formData.get('owner_email') || '')
    .trim()
    .toLowerCase();
  const campusName = String(formData.get('campus_name') || 'Main Campus').trim();
  const slug = slugify(String(formData.get('slug') || name), { lower: true, strict: true }).slice(0, 80);
  if (name.length < 2 || !slug || !ownerEmail.includes('@')) {
    return { success: false, message: 'School name, slug, and a registered owner email are required.' };
  }

  const db = (await createAdminClient()) as any;
  let owner: { id: string; invited: boolean };
  try {
    owner = await inviteOrFindProfileId(ownerEmail, { profileRole: 'teacher', fullNameHint: `${name} Principal` });
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Could not invite the owner email.' };
  }

  const { data: organization, error } = await db
    .from('school_organizations')
    .insert({
      name,
      slug,
      organization_type: String(formData.get('organization_type') || 'school'),
      status: 'active',
      email: String(formData.get('email') || '').trim() || null,
      phone: String(formData.get('phone') || '').trim() || null,
      address: String(formData.get('address') || '').trim() || null,
      created_by: admin.id,
    })
    .select('id')
    .single();
  if (error) return { success: false, message: error.message };

  const { data: campus, error: campusError } = await db
    .from('school_campuses')
    .insert({
      organization_id: organization.id,
      name: campusName || 'Main Campus',
      code: 'MAIN',
      is_main: true,
      address: String(formData.get('address') || '').trim() || null,
    })
    .select('id')
    .single();
  if (campusError) {
    await db.from('school_organizations').delete().eq('id', organization.id);
    return { success: false, message: campusError.message };
  }

  const { error: membershipError } = await db.from('school_memberships').insert({
    organization_id: organization.id,
    campus_id: campus.id,
    profile_id: owner.id,
    member_role: 'owner',
    status: 'active',
  });
  if (membershipError) {
    await db.from('school_organizations').delete().eq('id', organization.id);
    return { success: false, message: membershipError.message };
  }

  await db.from('school_audit_logs').insert({
    organization_id: organization.id,
    actor_user_id: admin.id,
    action: 'create',
    entity_type: 'school_organization',
    entity_id: organization.id,
    metadata: { ownerEmail },
  });
  revalidatePath('/admin/schools');
  return {
    success: true,
    message: owner.invited
      ? `${name} created. An invite email was sent to ${ownerEmail} to set a password — they'll land on their school dashboard as soon as they log in.`
      : `${name} created and assigned to ${ownerEmail}.`,
  };
}

export async function updateSchoolPlanSettings(
  _state: SchoolActionState,
  formData: FormData
): Promise<SchoolActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };
  const organizationId = String(formData.get('organization_id') || '').trim();
  if (!organizationId) return { success: false, message: 'Organization is required.' };
  // Checkbox group: unchecked modules simply do not appear in the payload.
  const enabledModules = normalizeSchoolModules(formData.getAll('enabled_modules')) || [];
  const numberField = (key: string, fallback: number) => {
    const value = Number(formData.get(key));
    return Number.isFinite(value) && value >= 0 ? value : fallback;
  };

  const db = (await createAdminClient()) as any;
  const { data: tier } = await db
    .from('institution_plan_tiers')
    .select('*')
    .eq('id', String(formData.get('plan_tier_id') || ''))
    .maybeSingle();
  const { data: existingPlan } = await db
    .from('school_organization_plan_settings')
    .select('trial_ends_at')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const billingStatus = String(formData.get('billing_status') || 'trial');
  const grantTier = String(formData.get('grant_tier') || 'PRO') === 'ELITE' ? 'ELITE' : 'PRO';
  const trialDaysRaw = Number(formData.get('trial_days'));
  const trialDays = Number.isFinite(trialDaysRaw) && trialDaysRaw > 0 ? Math.floor(trialDaysRaw) : null;
  // Only (re)compute trial_ends_at when a fresh trial_days value was submitted for
  // a 'trial' status — this lets an admin re-save price/modules without silently
  // resetting an already-running trial's clock. Leaving billing_status entirely
  // clears trial_ends_at since it no longer applies.
  const trialEndsAt =
    billingStatus !== 'trial'
      ? null
      : trialDays
        ? new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString()
        : existingPlan?.trial_ends_at || null;

  const payload = {
    organization_id: organizationId,
    plan_tier_id: tier?.id || null,
    billing_status: billingStatus,
    grant_tier: grantTier,
    trial_days: trialDays,
    trial_ends_at: trialEndsAt,
    max_students: numberField('max_students', tier?.max_students || 200),
    max_teachers: numberField('max_teachers', tier?.max_teachers || 25),
    max_storage_gb: numberField('max_storage_gb', tier?.max_storage_gb || 10),
    monthly_price_usd: numberField('monthly_price_usd', tier?.monthly_price_usd || 10),
    monthly_price_pkr: numberField('monthly_price_pkr', tier?.monthly_price_pkr || 0),
    enabled_modules: enabledModules,
    notes: String(formData.get('notes') || '').trim() || null,
    renews_on: String(formData.get('renews_on') || '').trim() || null,
    updated_by: admin.id,
    updated_at: new Date().toISOString(),
  };

  const { error } = await db
    .from('school_organization_plan_settings')
    .upsert(payload, { onConflict: 'organization_id' });
  if (error) return { success: false, message: error.message };

  const shouldGrant =
    billingStatus === 'active' || (billingStatus === 'trial' && !!trialEndsAt && new Date(trialEndsAt) > new Date());
  await syncOrganizationSchoolGrants(organizationId, shouldGrant);

  await db.from('school_audit_logs').insert({
    organization_id: organizationId,
    actor_user_id: admin.id,
    action: 'update',
    entity_type: 'school_plan_settings',
    entity_id: organizationId,
    metadata: {
      maxStudents: payload.max_students,
      billingStatus: payload.billing_status,
      monthlyPriceUsd: payload.monthly_price_usd,
    },
  });
  revalidatePath('/admin/schools');
  return { success: true, message: 'Institution plan settings updated.' };
}
