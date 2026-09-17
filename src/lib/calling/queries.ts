import type { SupabaseClient } from '@supabase/supabase-js';
import type { CallDirectoryEntry, CallingSettings, InstitutionType } from './types';
import { DEFAULT_CALLING_SETTINGS } from './types';

const SETTINGS_TABLE: Partial<Record<InstitutionType, string>> = {
  school: 'school_calling_settings',
  college: 'college_calling_settings',
};
const DIRECTORY_RPC: Partial<Record<InstitutionType, string>> = {
  school: 'school_call_directory',
  college: 'college_call_directory',
};

export async function getCallingSettings(
  supabase: SupabaseClient,
  institutionType: InstitutionType,
  organizationId: string
): Promise<CallingSettings> {
  if (institutionType === 'consumer') {
    return { organization_id: organizationId, ...DEFAULT_CALLING_SETTINGS };
  }

  const db = supabase as any;
  const { data } = await db
    .from(SETTINGS_TABLE[institutionType]!)
    .select('organization_id, enabled, allow_student_student, allow_student_staff, allow_parent_staff')
    .eq('organization_id', organizationId)
    .maybeSingle();
  if (!data) return { organization_id: organizationId, ...DEFAULT_CALLING_SETTINGS };
  return data as CallingSettings;
}

export async function getCallDirectory(
  supabase: SupabaseClient,
  institutionType: InstitutionType,
  organizationId: string,
  excludeUserId?: string
): Promise<CallDirectoryEntry[]> {
  const db = supabase as any;

  if (institutionType === 'consumer') {
    const { data } = await db
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .order('full_name', { ascending: true })
      .limit(200);
    const list = (data || []).map((item: any) => ({
      profile_id: item.id,
      full_name: item.full_name,
      avatar_url: item.avatar_url,
      member_role: item.role || 'student',
    })) as CallDirectoryEntry[];
    return excludeUserId ? list.filter((item) => item.profile_id !== excludeUserId) : list;
  }

  const { data, error } = await db.rpc(DIRECTORY_RPC[institutionType]!, { p_organization_id: organizationId });
  if (error || !data) return [];
  const list = data as CallDirectoryEntry[];
  return excludeUserId ? list.filter((item) => item.profile_id !== excludeUserId) : list;
}
