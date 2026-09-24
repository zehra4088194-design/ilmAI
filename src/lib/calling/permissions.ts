import type { CallingSettings, CallPermissionResult } from './types';

const STAFF_ROLES = new Set(['owner', 'admin', 'admissions', 'teacher', 'staff', 'accountant', 'coordinator']);

function roleBucket(role: string): 'staff' | 'student' | 'parent' {
  if (role === 'student') return 'student';
  if (role === 'parent') return 'parent';
  return 'staff';
}

/**
 * Pure role-pair permission check — no I/O, easy to unit test. `settings.enabled` gates the whole
 * feature for the organization first; then:
 *   - owner/admin (principal) can always call/be called by anyone once calling is enabled.
 *   - staff <-> staff (teacher, coordinator, admissions, accountant, staff) is always allowed.
 *   - student <-> student gated by allow_student_student.
 *   - student <-> staff gated by allow_student_staff.
 *   - parent <-> staff gated by allow_parent_staff.
 *   - parent <-> student is allowed for a linked school guardian/student relationship. The
 *     server-side requestCallPermission() is the final gate for that relationship.
 */
export function canRolesCall(callerRole: string, calleeRole: string, settings: CallingSettings): CallPermissionResult {
  if (!settings.enabled) return { allowed: false, reason: 'Voice calling is turned off for this institution.' };

  if (callerRole === 'owner' || callerRole === 'admin' || calleeRole === 'owner' || calleeRole === 'admin') {
    return { allowed: true };
  }

  const callerBucket = roleBucket(callerRole);
  const calleeBucket = roleBucket(calleeRole);

  if (callerBucket === 'staff' && calleeBucket === 'staff') return { allowed: true };

  if (callerBucket === 'student' && calleeBucket === 'student') {
    return settings.allow_student_student
      ? { allowed: true }
      : { allowed: false, reason: 'Students calling each other is turned off.' };
  }

  if (
    (callerBucket === 'student' && calleeBucket === 'staff') ||
    (callerBucket === 'staff' && calleeBucket === 'student')
  ) {
    return settings.allow_student_staff
      ? { allowed: true }
      : { allowed: false, reason: 'Student-to-teacher calling is turned off.' };
  }

  if (
    (callerBucket === 'parent' && calleeBucket === 'staff') ||
    (callerBucket === 'staff' && calleeBucket === 'parent')
  ) {
    return settings.allow_parent_staff
      ? { allowed: true }
      : { allowed: false, reason: 'Parent-to-teacher calling is turned off.' };
  }

  if (
    (callerBucket === 'parent' && calleeBucket === 'student') ||
    (callerBucket === 'student' && calleeBucket === 'parent')
  ) {
    return { allowed: true };
  }

  return { allowed: false, reason: 'This pair of roles cannot call each other.' };
}

export { STAFF_ROLES };
