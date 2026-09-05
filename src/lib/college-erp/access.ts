import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isCollegeModuleEnabled, normalizeCollegeModules, type CollegeModuleKey } from './modules';
import type { CollegeContext, CollegePermission, CollegeRole } from './types';

// Mirrors src/lib/school-erp/access.ts's ACTIVE_SCHOOL_COOKIE / getSchoolContext /
// schoolAdminHomeForRole shape, scoped to college_organizations / college_memberships instead.
// Deliberately NOT sharing code with school-erp/access.ts beyond the common low-level
// resolveMembershipRedirect() helper — see src/lib/auth/resolveMembershipRedirect.ts and
// docs/SCHOOL_COLLEGE_SEPARATION_TODO.md §5 ("code reuse is fine, data/portals stay separate").
export const ACTIVE_COLLEGE_COOKIE = 'ilm_active_college';

const ROLE_PERMISSIONS: Record<CollegeRole, CollegePermission[]> = {
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
    'ptm.read',
    'ptm.manage',
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
    'ptm.read',
    'ptm.manage',
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
    'ptm.read',
    'ptm.manage',
    'reports.read',
  ],
  staff: [
    'dashboard.read',
    'people.read',
    'attendance.read',
    'academics.read',
    'communication.read',
    'communication.manage',
    'ptm.read',
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
  parent: [
    'dashboard.read',
    'attendance.read',
    'exams.read',
    'fees.read',
    'academics.read',
    'communication.read',
    'ptm.read',
  ],
  student: [
    'dashboard.read',
    'attendance.read',
    'exams.read',
    'fees.read',
    'academics.read',
    'communication.read',
    'ptm.read',
  ],
};

const ROLE_PRIORITY: CollegeRole[] = [
  'owner',
  'admin',
  'admissions',
  'accountant',
  'teacher',
  'staff',
  'parent',
  'student',
];

function mergePermissions(role: CollegeRole, overrides: string[]) {
  return Array.from(new Set([...ROLE_PERMISSIONS[role], ...overrides])) as CollegePermission[];
}

export function hasCollegePermission(context: CollegeContext, permission: CollegePermission) {
  return context.permissions.includes(permission);
}

export function hasCollegeModule(context: CollegeContext, module: CollegeModuleKey) {
  return isCollegeModuleEnabled(context.enabledModules, module);
}

export async function getCollegeContext(
  supabase: SupabaseClient,
  userId: string,
  organizationId?: string
): Promise<CollegeContext | null> {
  const db = supabase as any;
  let query = db
    .from('college_memberships')
    .select(
      // college_campuses named explicitly (!college_memberships_campus_id_fkey) — see the matching
      // comment in school-erp/access.ts's getSchoolContext for why: a second, composite tenant FK
      // on this table makes an unqualified embed ambiguous, which PostgREST rejects outright.
      'id, organization_id, campus_id, profile_id, member_role, permissions, employee_code, designation, status, college_organizations(id, name, slug, organization_type, status, timezone, currency, email, phone, address, logo_url, principal_name, principal_signature_url), college_campuses!college_memberships_campus_id_fkey(id, name, code)'
    )
    .eq('profile_id', userId)
    .eq('status', 'active');
  if (organizationId) query = query.eq('organization_id', organizationId);
  const { data, error } = await query;
  if (error || !data?.length) return null;

  const rows = [...data].sort(
    (left: any, right: any) =>
      ROLE_PRIORITY.indexOf(left.member_role as CollegeRole) - ROLE_PRIORITY.indexOf(right.member_role as CollegeRole)
  );
  const row = rows[0];
  const organization = Array.isArray(row.college_organizations) ? row.college_organizations[0] : row.college_organizations;
  const campus = Array.isArray(row.college_campuses) ? row.college_campuses[0] : row.college_campuses;
  if (!organization || organization.status === 'suspended' || organization.status === 'archived') return null;
  const role = row.member_role as CollegeRole;
  // SECURITY DEFINER function: exposes only the module list to members, while the rest of the
  // plan row (pricing, limits) stays owner/admin-only. Mirrors school's school_enabled_modules.
  const { data: modules } = await db.rpc('college_enabled_modules', { p_organization_id: organization.id });

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
    enabledModules: normalizeCollegeModules(modules),
  };
}

export async function getActiveCollegeOrganizationId() {
  const cookieStore = await cookies();
  return cookieStore.get(ACTIVE_COLLEGE_COOKIE)?.value || undefined;
}

export async function getCollegeContexts(supabase: SupabaseClient, userId: string) {
  const db = supabase as any;
  const { data, error } = await db
    .from('college_memberships')
    .select('organization_id')
    .eq('profile_id', userId)
    .eq('status', 'active');
  if (error || !data?.length) return [] as CollegeContext[];

  const organizationIds: string[] = Array.from(new Set<string>(data.map((row: any) => String(row.organization_id))));
  const contexts = await Promise.all(
    organizationIds.map((organizationId) => getCollegeContext(supabase, userId, organizationId))
  );
  return contexts.filter((context): context is CollegeContext => Boolean(context));
}

export async function requireCollegeContext(permission?: CollegePermission, module?: CollegeModuleKey) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, context: null };
  const organizationId = await getActiveCollegeOrganizationId();
  const context =
    (organizationId ? await getCollegeContext(supabase, user.id, organizationId) : null) ||
    (await getCollegeContext(supabase, user.id));
  if (!context || (permission && !hasCollegePermission(context, permission))) {
    return { supabase, user, context: null };
  }
  if (module && !hasCollegeModule(context, module)) {
    return { supabase, user, context: null };
  }
  return { supabase, user, context };
}

export function collegeAdminHomeForRole(role: CollegeRole) {
  // Stopgap: unlike school's /school (a real student/parent portal), only /college/dashboard
  // exists today — no page.tsx at /college root. Point there until Phase 5 builds a proper
  // college student/parent portal mirroring /school (see docs/COLLEGE_ERP_IMPLEMENTATION.md §4).
  return role === 'student' || role === 'parent' ? '/college/dashboard' : '/college-admin';
}

// Lightweight role lookup for src/middleware.ts — mirrors school-erp/access.ts's
// resolveSchoolRole. See that function's comment for why this stays a separate named helper.
export async function resolveCollegeRole(supabase: SupabaseClient, userId: string) {
  const context = await getCollegeContext(supabase, userId);
  if (!context) return null;
  return { role: context.membership.member_role, organizationId: context.organization.id };
}

// Institutional records do not consume consumer plan quotas, mirroring the school ERP's policy.
export const COLLEGE_ERP_ACCESS_POLICY = {
  requiresConsumerSubscription: false,
  consumesAiCredits: false,
} as const;
