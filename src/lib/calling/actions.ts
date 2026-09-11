'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { requireCollegeContext } from '@/lib/college-erp/access';
import type { SchoolActionState } from '@/lib/school-erp/types';
import type { CollegeActionState } from '@/lib/college-erp/types';
import { canRolesCall } from './permissions';
import { getCallingSettings } from './queries';
import type { CallPermissionResult, InstitutionType } from './types';

const SETTINGS_TABLE: Record<InstitutionType, string> = {
  school: 'school_calling_settings',
  college: 'college_calling_settings',
};
const MEMBERSHIP_TABLE: Record<InstitutionType, string> = {
  school: 'school_memberships',
  college: 'college_memberships',
};
const CALL_LOG_TABLE: Record<InstitutionType, string> = {
  school: 'school_call_logs',
  college: 'college_call_logs',
};

function flag(formData: FormData, key: string) {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

/**
 * Server-checked permission gate a client must call before starting a PeerJS call — never trust
 * the client's own read of calling settings, since a stale/tampered client could otherwise skip
 * the check entirely. Also writes an 'initiated' row to {school,college}_call_logs so every call
 * attempt (allowed or not) leaves an audit trail, same discipline as every other mutation in this
 * effort. Returns the new log row's id so the client can later mark it accepted/declined/ended.
 */
export async function requestCallPermission(
  institutionType: InstitutionType,
  organizationId: string,
  calleeId: string
): Promise<CallPermissionResult & { callId?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { allowed: false, reason: 'You must be signed in.' };
  if (user.id === calleeId) return { allowed: false, reason: 'You cannot call yourself.' };

  const db = supabase as any;
  
  // Try to get membership role (for org members)
  const [{ data: callerRow }, { data: calleeRow }] = await Promise.all([
    db
      .from(MEMBERSHIP_TABLE[institutionType])
      .select('member_role')
      .eq('organization_id', organizationId)
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .maybeSingle(),
    db
      .from(MEMBERSHIP_TABLE[institutionType])
      .select('member_role')
      .eq('organization_id', organizationId)
      .eq('profile_id', calleeId)
      .eq('status', 'active')
      .maybeSingle(),
  ]);
  
  // For org members: must have active membership
  if (callerRow && !calleeRow) return { allowed: false, reason: 'That person is not reachable in this institution.' };
  if (!callerRow && calleeRow) return { allowed: false, reason: 'You are not an active member of this institution.' };
  
  // If neither has membership, they're independent users — allow calling if settings permit
  const callerRole = callerRow?.member_role || 'student';
  const calleeRole = calleeRow?.member_role || 'student';
  
  const settings = await getCallingSettings(supabase, institutionType, organizationId);
  const verdict = canRolesCall(callerRole, calleeRole, settings);
  if (!verdict.allowed) return verdict;

  const { data: log, error } = await db
    .from(CALL_LOG_TABLE[institutionType])
    .insert({ organization_id: organizationId, caller_id: user.id, callee_id: calleeId, status: 'initiated' })
    .select('id')
    .single();
  if (error) return { allowed: false, reason: 'Could not start the call log — try again.' };
  return { allowed: true, callId: log.id };
}

/** Either participant can move a call log forward (accepted/declined/missed/ended) — RLS already
 * restricts updates to `caller_id`/`callee_id` matching auth.uid(), this is just the typed entry point. */
export async function updateCallStatus(
  institutionType: InstitutionType,
  callId: string,
  status: 'accepted' | 'declined' | 'missed' | 'ended'
) {
  const supabase = await createClient();
  const db = supabase as any;
  const patch: Record<string, unknown> = { status };
  if (status === 'ended') patch.ended_at = new Date().toISOString();
  await db.from(CALL_LOG_TABLE[institutionType]).update(patch).eq('id', callId);
}

async function upsertCallingSettings(institutionType: InstitutionType, organizationId: string, formData: FormData, userId: string) {
  const supabase = await createClient();
  const db = supabase as any;
  const { error } = await db.from(SETTINGS_TABLE[institutionType]).upsert(
    {
      organization_id: organizationId,
      enabled: flag(formData, 'enabled'),
      allow_student_student: flag(formData, 'allow_student_student'),
      allow_student_staff: flag(formData, 'allow_student_staff'),
      allow_parent_staff: flag(formData, 'allow_parent_staff'),
      updated_by: userId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'organization_id' }
  );
  if (error) throw new Error(error.message);
}

export async function updateSchoolCallingSettings(_state: SchoolActionState, formData: FormData): Promise<SchoolActionState> {
  try {
    const { user, context } = await requireSchoolContext('organization.manage');
    if (!user || !context) return { success: false, message: 'You do not have permission for this action.' };
    await upsertCallingSettings('school', context.organization.id, formData, user.id);
    revalidatePath('/school-admin/settings');
    return { success: true, message: 'Calling settings saved.' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Could not save calling settings.' };
  }
}

export async function updateCollegeCallingSettings(_state: CollegeActionState, formData: FormData): Promise<CollegeActionState> {
  try {
    const { user, context } = await requireCollegeContext('organization.manage');
    if (!user || !context) return { success: false, message: 'You do not have permission for this action.' };
    await upsertCallingSettings('college', context.organization.id, formData, user.id);
    revalidatePath('/college-admin/settings');
    return { success: true, message: 'Calling settings saved.' };
  } catch (error) {
    return { success: false, message: error instanceof Error ? error.message : 'Could not save calling settings.' };
  }
}
