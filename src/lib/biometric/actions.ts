'use server';

import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import { requireAdminUser } from '@/lib/admin/auth';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { requireCollegeContext } from '@/lib/college-erp/access';

export type InstitutionType = 'school' | 'college';
export type BiometricActionState = { success: boolean; message: string };

const DEVICE_TABLE: Record<InstitutionType, string> = {
  school: 'school_teacher_biometric_devices',
  college: 'college_teacher_biometric_devices',
};
const MAPPING_TABLE: Record<InstitutionType, string> = {
  school: 'school_teacher_biometric_mappings',
  college: 'college_teacher_biometric_mappings',
};
const ATTENDANCE_PATH: Record<InstitutionType, string> = {
  school: '/school-admin/attendance',
  college: '/college-admin/attendance',
};
const ADMIN_PATH = '/admin/biometric-devices';

// A biometric device can be registered by TWO kinds of caller: (1) the
// platform admin, from /admin/biometric-devices, for ANY school/college — this
// is the explicit requirement ("I can add this biometric to any school"); or
// (2) that specific institution's own owner/admin, from their own
// /school-admin or /college-admin attendance page, scoped to their own
// organization only. Both paths funnel through here so there is exactly one
// place the authorization rule lives.
async function authorizeOrgAccess(institutionType: InstitutionType, organizationId: string) {
  const admin = await requireAdminUser();
  if (admin) return { userId: admin.id, isPlatformAdmin: true };

  if (institutionType === 'school') {
    const { context } = await requireSchoolContext('organization.manage');
    if (context && context.organization.id === organizationId) return { userId: context.userId, isPlatformAdmin: false };
  } else {
    const { context } = await requireCollegeContext('organization.manage');
    if (context && context.organization.id === organizationId) return { userId: context.userId, isPlatformAdmin: false };
  }
  return null;
}

function revalidateFor(institutionType: InstitutionType, isPlatformAdmin: boolean) {
  revalidatePath(isPlatformAdmin ? ADMIN_PATH : ATTENDANCE_PATH[institutionType]);
}

export async function createBiometricDevice(
  institutionType: InstitutionType,
  _state: BiometricActionState,
  formData: FormData
): Promise<BiometricActionState> {
  const organizationId = String(formData.get('organization_id') || '').trim();
  if (!organizationId) return { success: false, message: 'Choose an institution first.' };
  const auth = await authorizeOrgAccess(institutionType, organizationId);
  if (!auth) return { success: false, message: 'You are not authorized to register a device for this institution.' };

  const name = String(formData.get('name') || '').trim();
  const deviceIp = String(formData.get('device_ip') || '').trim();
  const port = Number(formData.get('port')) || 4370;
  const commKey = Number(formData.get('comm_key')) || 0;
  const campusId = String(formData.get('campus_id') || '').trim() || null;
  if (!name || !deviceIp) return { success: false, message: 'Device name and IP are required.' };

  const db = (await createAdminClient()) as any;
  const { error } = await db.from(DEVICE_TABLE[institutionType]).insert({
    organization_id: organizationId,
    campus_id: campusId,
    name,
    device_ip: deviceIp,
    port,
    comm_key: commKey,
    created_by: auth.userId,
  });
  if (error) return { success: false, message: error.message };
  revalidateFor(institutionType, auth.isPlatformAdmin);
  return { success: true, message: 'Device registered. It will sync on the next scheduled run.' };
}

export async function deleteBiometricDevice(
  institutionType: InstitutionType,
  _state: BiometricActionState,
  formData: FormData
): Promise<BiometricActionState> {
  const organizationId = String(formData.get('organization_id') || '').trim();
  const id = String(formData.get('id') || '').trim();
  if (!organizationId || !id) return { success: false, message: 'Missing device.' };
  const auth = await authorizeOrgAccess(institutionType, organizationId);
  if (!auth) return { success: false, message: 'You are not authorized to remove this device.' };

  const db = (await createAdminClient()) as any;
  const { error } = await db.from(DEVICE_TABLE[institutionType]).delete().eq('id', id).eq('organization_id', organizationId);
  if (error) return { success: false, message: error.message };
  revalidateFor(institutionType, auth.isPlatformAdmin);
  return { success: true, message: 'Device removed.' };
}

export async function createBiometricMapping(
  institutionType: InstitutionType,
  _state: BiometricActionState,
  formData: FormData
): Promise<BiometricActionState> {
  const organizationId = String(formData.get('organization_id') || '').trim();
  const deviceId = String(formData.get('device_id') || '').trim();
  const deviceUserId = String(formData.get('device_user_id') || '').trim();
  const membershipId = String(formData.get('membership_id') || '').trim();
  if (!organizationId || !deviceId || !deviceUserId || !membershipId) {
    return { success: false, message: 'Device, punch-card User ID, and teacher are all required.' };
  }
  const auth = await authorizeOrgAccess(institutionType, organizationId);
  if (!auth) return { success: false, message: 'You are not authorized to map a punch card for this institution.' };

  const db = (await createAdminClient()) as any;
  const { data: device } = await db.from(DEVICE_TABLE[institutionType]).select('id').eq('id', deviceId).eq('organization_id', organizationId).maybeSingle();
  if (!device) return { success: false, message: 'Device not found.' };

  const { error } = await db.from(MAPPING_TABLE[institutionType]).insert({ device_id: deviceId, device_user_id: deviceUserId, membership_id: membershipId });
  if (error) return { success: false, message: error.message };
  revalidateFor(institutionType, auth.isPlatformAdmin);
  return { success: true, message: 'Punch card mapped to teacher.' };
}

export async function deleteBiometricMapping(
  institutionType: InstitutionType,
  _state: BiometricActionState,
  formData: FormData
): Promise<BiometricActionState> {
  const organizationId = String(formData.get('organization_id') || '').trim();
  const id = String(formData.get('id') || '').trim();
  if (!organizationId || !id) return { success: false, message: 'Missing mapping.' };
  const auth = await authorizeOrgAccess(institutionType, organizationId);
  if (!auth) return { success: false, message: 'You are not authorized to remove this mapping.' };

  const db = (await createAdminClient()) as any;
  const { error } = await db.from(MAPPING_TABLE[institutionType]).delete().eq('id', id);
  if (error) return { success: false, message: error.message };
  revalidateFor(institutionType, auth.isPlatformAdmin);
  return { success: true, message: 'Mapping removed.' };
}

// Every action below is directly callable from a client component too (not just
// a <form action>), which Next.js turns into a POST RPC endpoint — so each one
// re-checks authorization itself rather than trusting that only an
// already-gated server page renders the button that calls it.
export async function listBiometricDevices(institutionType: InstitutionType, organizationId: string) {
  if (!organizationId || !(await authorizeOrgAccess(institutionType, organizationId))) return [];
  const db = (await createAdminClient()) as any;
  const mappingFk =
    institutionType === 'school' ? 'school_teacher_biometric_mappings' : 'college_teacher_biometric_mappings';
  const { data } = await db
    .from(DEVICE_TABLE[institutionType])
    .select(`*, ${mappingFk}(id, device_user_id, membership_id)`)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  return data || [];
}

// Platform-admin picker source: every school/college organization, name only.
export async function listInstitutionsForAdmin(institutionType: InstitutionType) {
  const admin = await requireAdminUser();
  if (!admin) return [];
  const db = (await createAdminClient()) as any;
  const table = institutionType === 'school' ? 'school_organizations' : 'college_organizations';
  const { data } = await db.from(table).select('id, name').order('name');
  return data || [];
}

// Platform-admin teacher picker source, scoped to whichever institution was selected.
export async function listInstitutionTeachersForAdmin(institutionType: InstitutionType, organizationId: string) {
  const admin = await requireAdminUser();
  if (!admin || !organizationId) return [];
  const db = (await createAdminClient()) as any;
  const table = institutionType === 'school' ? 'school_memberships' : 'college_memberships';
  const { data } = await db
    .from(table)
    .select('id, member_role, profiles(full_name)')
    .eq('organization_id', organizationId)
    .eq('status', 'active')
    .in('member_role', ['owner', 'admin', 'teacher', 'staff'])
    .order('member_role');
  return (data || []).map((row: any) => ({
    id: row.id,
    name: Array.isArray(row.profiles) ? row.profiles[0]?.full_name : row.profiles?.full_name,
  }));
}
