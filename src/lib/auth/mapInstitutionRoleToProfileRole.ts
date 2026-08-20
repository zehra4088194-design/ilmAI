// Plain (non-'use server') helper split out of inviteOrFindProfile.ts — a file with a top-level
// 'use server' directive treats every export as a Server Action, and Server Actions must be
// async functions. This is a pure synchronous mapper with no side effects, so it can't live in
// that file; keeping it here is what makes `next build` pass.
//
// SECURITY: profileRole must never be 'admin' — profiles.role === 'admin' grants
// platform-admin access via requireAdminUser() (src/lib/admin/auth.ts). Institution
// roles (owner/admin/teacher/staff/...) are tracked entirely in
// school_memberships/college_memberships.member_role, never on profiles.role, which
// only reflects the generic consumer-app persona. That is why every institution
// member — including an "owner" or institution "admin" — maps to profileRole
// 'teacher' below, never 'admin'.

export type InvitableProfileRole = 'teacher' | 'student' | 'parent' | 'principal';

/**
 * Maps an institution membership role (school_memberships.member_role /
 * college_memberships.member_role) to the generic profiles.role enum
 * (student | teacher | admin | parent | principal). Never returns 'admin' — see file header.
 */
export function mapInstitutionRoleToProfileRole(memberRole: string): InvitableProfileRole {
  if (memberRole === 'parent') return 'parent';
  if (memberRole === 'student') return 'student';
  // owner, principal map to institution-level principal persona
  if (memberRole === 'owner' || memberRole === 'principal') return 'principal';
  // admissions, accountant, staff, teacher all become 'teacher' —
  // a safe non-platform-admin generic staff persona.
  return 'teacher';
}
