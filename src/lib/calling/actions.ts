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

const SETTINGS_TABLE: Record<'school' | 'college', string> = {
  school: 'school_calling_settings',
  college: 'college_calling_settings',
};
const MEMBERSHIP_TABLE: Record<'school' | 'college', string> = {
  school: 'school_memberships',
  college: 'college_memberships',
};
const CALL_LOG_TABLE: Record<'school' | 'college', string> = {
  school: 'school_call_logs',
  college: 'college_call_logs',
};

function flag(formData: FormData, key: string) {
  return formData.get(key) === 'on' || formData.get(key) === 'true';
}

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

  // A parent/student link is a direct family relationship created by the parent portal.
  // It is intentionally independent of the student's own plan and of institution membership:
  // a parent must always be able to call their attached child, whether the child is Free, Pro,
  // Elite, school-enrolled, college-enrolled, or an ordinary consumer account.
  const { data: familyLink } = await db
    .from('parent_student_links')
    .select('id')
    .eq('status', 'approved')
    .or(`and(parent_id.eq.${user.id},student_id.eq.${calleeId}),and(parent_id.eq.${calleeId},student_id.eq.${user.id})`)
    .maybeSingle();
  if (familyLink) {
    return { allowed: true, callId: crypto.randomUUID() };
  }

  // Consumer accounts do not belong to a school/college. They still use the exact same
  // WebRTC/PeerJS provider, but need no institution membership or organization setting.
  if (institutionType === 'consumer') {
    const { data: callee } = await db.from('profiles').select('id').eq('id', calleeId).maybeSingle();
    if (!callee) return { allowed: false, reason: 'That user could not be found.' };

    const settings = await getCallingSettings(supabase, 'consumer', organizationId);
    const verdict = canRolesCall('student', 'student', settings);
    if (!verdict.allowed) return verdict;

    // Consumer calls do not depend on an institution-specific call-log table. The returned
    // identifier only needs to be unique for the live signaling session.
    return { allowed: true, callId: crypto.randomUUID() };
  }

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

  if (callerRow && !calleeRow) return { allowed: false, reason: 'That person is not reachable in this institution.' };
  if (!callerRow && calleeRow) return { allowed: false, reason: 'You are not an active member of this institution.' };

  const callerRole = callerRow?.member_role || 'student';
  const calleeRole = calleeRow?.member_role || 'student';

  if (
    (callerRole === 'parent' && calleeRole === 'student') ||
    (callerRole === 'student' && calleeRole === 'parent')
  ) {
    const { data: link } = callerRole === 'parent'
      ? await db
          .from(institutionType === 'school' ? 'school_guardians' : 'college_guardians')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('guardian_id', user.id)
          .eq('student_id', calleeId)
          .maybeSingle()
      : await db
          .from(institutionType === 'school' ? 'school_guardians' : 'college_guardians')
          .select('id')
          .eq('organization_id', organizationId)
          .eq('guardian_id', calleeId)
          .eq('student_id', user.id)
          .maybeSingle();
    if (!link) return { allowed: false, reason: 'Parent and student calls are only available for the linked family relationship.' };
  }

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

export async function updateCallStatus(
  institutionType: InstitutionType,
  callId: string,
  status: 'accepted' | 'declined' | 'missed' | 'ended'
) {
  if (institutionType === 'consumer') return;
  const supabase = await createClient();
  const db = supabase as any;
  const patch: Record<string, unknown> = { status };
  if (status === 'ended') patch.ended_at = new Date().toISOString();
  await db.from(CALL_LOG_TABLE[institutionType]).update(patch).eq('id', callId);
}

async function upsertCallingSettings(institutionType: 'school' | 'college', organizationId: string, formData: FormData, userId: string) {
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
