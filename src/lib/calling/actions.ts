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
  _institutionType: InstitutionType,
  _organizationId: string,
  _calleeId: string
): Promise<CallPermissionResult & { callId?: string }> {
  // Person-to-person browser calling has been retired. Directory contacts now use the device's
  // normal phone dialer through a tel: link, so legacy/stale clients cannot start web calls.
  return {
    allowed: false,
    reason: 'In-app calling is disabled. Use the phone number in the directory.',
  };
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
