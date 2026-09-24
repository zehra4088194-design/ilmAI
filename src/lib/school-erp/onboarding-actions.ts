'use server';

// ============================================
// SELF-SERVE SCHOOL TRIAL
// Until now every institution had to be provisioned by a platform admin in
// /admin/schools, and the owner had to already exist by exact email. That put
// a manual step in front of every single lead. This lets a signed-in user
// stand up their own trial institution; the platform admin's job becomes
// approving and upgrading, not data entry.
//
// Trials start on billing_status 'trial', so the PRO AI grant cascade stays
// off until a platform admin marks the institution active.
// ============================================

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import slugify from 'slugify';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { checkDailyLimit } from '@/lib/rate-limit';
import { ACTIVE_SCHOOL_COOKIE } from './access';
import type { SchoolActionState } from './types';

const ORGANIZATION_TYPES = ['school', 'academy', 'college'];

async function uniqueSlug(db: any, base: string) {
  const root = slugify(base, { lower: true, strict: true }).slice(0, 60) || 'school';
  for (let attempt = 0; attempt < 25; attempt += 1) {
    const candidate = attempt === 0 ? root : `${root}-${attempt + 1}`;
    const { data } = await db.from('school_organizations').select('id').eq('slug', candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${Math.floor(Date.now() / 1000)}`;
}

export async function startSchoolTrial(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  let destination = '';
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, message: 'Sign in first to start a school trial.' };

    const name = String(formData.get('name') || '').trim();
    const organizationType = String(formData.get('organization_type') || 'school');
    const campusName = String(formData.get('campus_name') || '').trim() || 'Main Campus';
    if (name.length < 3) return { success: false, message: 'Enter the full name of your institution.' };
    if (!ORGANIZATION_TYPES.includes(organizationType)) {
      return { success: false, message: 'Choose school, academy, or college.' };
    }

    const limit = await checkDailyLimit(user.id, 'erp_mutation:start-trial', 3);
    if (!limit.success) return { success: false, message: 'Too many trial attempts today. Try again tomorrow.' };

    const db = (await createAdminClient()) as any;

    // One trial per person. A second institution is a sales conversation, not
    // a self-serve action.
    const { data: existingOwnership } = await db
      .from('school_memberships')
      .select('organization_id')
      .eq('profile_id', user.id)
      .eq('member_role', 'owner')
      .eq('status', 'active')
      .maybeSingle();
    if (existingOwnership) {
      return {
        success: false,
        message: 'You already own an institution. Contact support to add another one.',
      };
    }

    const slug = await uniqueSlug(db, name);
    const { data: organization, error } = await db
      .from('school_organizations')
      .insert({
        name,
        slug,
        organization_type: organizationType,
        status: 'trial',
        email: String(formData.get('email') || '').trim() || user.email || null,
        phone: String(formData.get('phone') || '').trim() || null,
        address: String(formData.get('address') || '').trim() || null,
        created_by: user.id,
      })
      .select('id')
      .single();
    if (error) return { success: false, message: error.message };

    const { data: campus, error: campusError } = await db
      .from('school_campuses')
      .insert({
        organization_id: organization.id,
        name: campusName,
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
      profile_id: user.id,
      member_role: 'owner',
      status: 'active',
    });
    if (membershipError) {
      await db.from('school_organizations').delete().eq('id', organization.id);
      return { success: false, message: membershipError.message };
    }

    // A trigger creates the default plan row; make sure the trial flag is set
    // even if that row already existed.
    await db
      .from('school_organization_plan_settings')
      .upsert({ organization_id: organization.id, billing_status: 'trial' }, { onConflict: 'organization_id' });

    await db.from('school_audit_logs').insert({
      organization_id: organization.id,
      actor_user_id: user.id,
      action: 'create',
      entity_type: 'school_organization',
      entity_id: organization.id,
      metadata: { source: 'self_serve_trial', slug },
    });

    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_SCHOOL_COOKIE, organization.id, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 180,
    });
    destination = '/school-admin/launchpad';
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : 'The institution could not be created.',
    };
  }

  // redirect() throws by design, so it must run outside the try/catch.
  redirect(destination);
}
