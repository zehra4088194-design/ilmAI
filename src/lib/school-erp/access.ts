import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import type { SchoolContext, SchoolPermission, SchoolRole } from './types';

export const ACTIVE_SCHOOL_COOKIE = 'ilm_active_school';

const ROLE_PERMISSIONS: Record<SchoolRole, SchoolPermission[]> = {
  owner: [
    'dashboard.read',
    'organization.manage',
    'people.read',
    'people.manage',
    'admissions.read',
    'admissions.manage',
    'attendance.read',
    'attendance.manage',
    'exams.read',
    'exams.manage',
    'fees.read',
    'fees.manage',
    'payroll.read',
    'payroll.manage',
    'academics.read',
    'academics.manage',
    'communication.read',
    'communication.manage',
    'reports.read',
    'audit.read',
  ],
  admin: [
    'dashboard.read',
    'organization.manage',
    'people.read',
    'people.manage',
    'admissions.read',
    'admissions.manage',
    'attendance.read',
    'attendance.manage',
    'exams.read',
    'exams.manage',
    'fees.read',
    'fees.manage',
    'payroll.read',
    'payroll.manage',
    'academics.read',
    'academics.manage',
    'communication.read',
    'communication.manage',
    'reports.read',
    'audit.read',
  ],
  admissions: [
    'dashboard.read',
    'people.read',
    'admissions.read',
    'admissions.manage',
    'reports.read',
    'communication.read',
  ],
  teacher: [
    'dashboard.read',
    'people.read',
    'attendance.read',
    'attendance.manage',
    'exams.read',
    'exams.manage',
    'academics.read',
    'academics.manage',
    'communication.read',
    'communication.manage',
    'reports.read',
  ],
  staff: [
    'dashboard.read',
    'people.read',
    'attendance.read',
    'academics.read',
    'communication.read',
    'communication.manage',
    'reports.read',
  ],
  accountant: [
    'dashboard.read',
    'people.read',
    'fees.read',
    'fees.manage',
    'payroll.read',
    'payroll.manage',
    'communication.read',
    'reports.read',
  ],
  parent: ['dashboard.read', 'attendance.read', 'exams.read', 'fees.read', 'academics.read', 'communication.read'],
  student: ['dashboard.read', 'attendance.read', 'exams.read', 'fees.read', 'academics.read', 'communication.read'],
};

const ROLE_PRIORITY: SchoolRole[] = ['owner', 'admin', 'admissions', 'accountant', 'teacher', 'staff', 'parent', 'student'];

function mergePermissions(role: SchoolRole, overrides: string[]) {
  return Array.from(new Set([...ROLE_PERMISSIONS[role], ...overrides])) as SchoolPermission[];
}

export function hasSchoolPermission(context: SchoolContext, permission: SchoolPermission) {
  return context.permissions.includes(permission);
}

export async function getSchoolContext(
  supabase: SupabaseClient,
  userId: string,
  organizationId?: string,
): Promise<SchoolContext | null> {
  const db = supabase as any;
  let query = db
    .from('school_memberships')
    .select(
      'id, organization_id, campus_id, profile_id, member_role, permissions, employee_code, designation, status, school_organizations(id, name, slug, organization_type, status, timezone, currency, email, phone, address, logo_url), school_campuses(id, name, code)',
    )
    .eq('profile_id', userId)
    .eq('status', 'active');
  if (organizationId) query = query.eq('organization_id', organizationId);
  const { data, error } = await query;
  if (error || !data?.length) return null;

  const rows = [...data].sort(
    (left: any, right: any) =>
      ROLE_PRIORITY.indexOf(left.member_role as SchoolRole) - ROLE_PRIORITY.indexOf(right.member_role as SchoolRole),
  );
  const row = rows[0];
  const organization = Array.isArray(row.school_organizations)
    ? row.school_organizations[0]
    : row.school_organizations;
  const campus = Array.isArray(row.school_campuses) ? row.school_campuses[0] : row.school_campuses;
  if (!organization || organization.status === 'suspended' || organization.status === 'archived') return null;
  const role = row.member_role as SchoolRole;

  return {
    userId,
    organization,
    membership: {
      id: row.id,
      organization_id: row.organization_id,
      campus_id: row.campus_id,
      profile_id: row.profile_id,
      member_role: role,
      permissions: row.permissions || [],
      employee_code: row.employee_code,
      designation: row.designation,
      status: row.status,
    },
    campus: campus || null,
    permissions: mergePermissions(role, row.permissions || []),
  };
}

export async function getActiveSchoolOrganizationId() {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_SCHOOL_COOKIE)?.value || undefined;
}

export async function getSchoolContexts(supabase: SupabaseClient, userId: string) {
  const db = supabase as any;
  const { data, error } = await db
    .from('school_memberships')
    .select('organization_id')
    .eq('profile_id', userId)
    .eq('status', 'active');
  if (error || !data?.length) return [] as SchoolContext[];

  const organizationIds: string[] = Array.from(
    new Set<string>(data.map((row: any) => String(row.organization_id))),
  );
  const contexts = await Promise.all(
    organizationIds.map((organizationId) => getSchoolContext(supabase, userId, organizationId)),
  );
  return contexts.filter((context): context is SchoolContext => Boolean(context));
}

export async function requireSchoolContext(permission?: SchoolPermission) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, context: null };
  const organizationId = await getActiveSchoolOrganizationId();
  const context =
    (organizationId ? await getSchoolContext(supabase, user.id, organizationId) : null) ||
    (await getSchoolContext(supabase, user.id));
  if (!context || (permission && !hasSchoolPermission(context, permission))) {
    return { supabase, user, context: null };
  }
  return { supabase, user, context };
}

export function schoolAdminHomeForRole(role: SchoolRole) {
  return role === 'student' || role === 'parent' ? '/school' : '/school-admin';
}

// Institutional records do not consume consumer plan quotas. AI-powered
// analysis continues to use the existing FREE/PRO/ELITE credit gateway.
export const SCHOOL_ERP_ACCESS_POLICY = {
  requiresConsumerSubscription: false,
  consumesAiCredits: false,
} as const;
