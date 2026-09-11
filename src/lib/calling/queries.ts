import type { SupabaseClient } from '@supabase/supabase-js';
import type { CallDirectoryEntry, CallingSettings, InstitutionType } from './types';
import { DEFAULT_CALLING_SETTINGS } from './types';

const SETTINGS_TABLE: Record<InstitutionType, string> = {
  school: 'school_calling_settings',
  college: 'college_calling_settings',
};
const DIRECTORY_RPC: Record<InstitutionType, string> = {
  school: 'school_call_directory',
  college: 'college_call_directory',
};

/** Row may not exist yet (no admin has opened the settings card) — defaults to "everything off". */
export async function getCallingSettings(
  supabase: SupabaseClient,
  institutionType: InstitutionType,
  organizationId: string
): Promise<CallingSettings> {
  const db = supabase as any;
  const { data } = await db
    .from(SETTINGS_TABLE[institutionType])
    .select('organization_id, enabled, allow_student_student, allow_student_staff, allow_parent_staff')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (!data) return { organization_id: organizationId, ...DEFAULT_CALLING_SETTINGS, enabled: false };
  return data as CallingSettings;
}

/** Uses the security-definer RPC — see the migration for why (RLS on the base tables is tighter
 * than "any org member can see everyone's name", so a student/parent needs this narrower view). */
export async function getCallDirectory(
  supabase: SupabaseClient,
  institutionType: InstitutionType,
  organizationId: string,
  excludeUserId?: string
): Promise<CallDirectoryEntry[]> {
  const db = supabase as any;
  const { data, error } = await db.rpc(DIRECTORY_RPC[institutionType], { p_organization_id: organizationId });
  if (error || !data) return [];
  const list = data as CallDirectoryEntry[];
  return excludeUserId ? list.filter((item) => item.profile_id !== excludeUserId) : list;
}
