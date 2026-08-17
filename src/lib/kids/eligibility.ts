// Under-8 Kids Dashboard eligibility. Deliberately neutral (not under school-erp
// or college-erp) — applies to EVERY account, individual or institutional, unlike
// the older school-erp/kids-zone.ts grade_level-based check (which only works for
// school-enrolled students and only approximates "young" via grade ≤5, not a real
// age cutoff). This is the primary check going forward; the grade-based one stays
// as a fallback for school-enrolled students who haven't set date_of_birth yet.
import { isEligibleForKidsZone } from '@/lib/school-erp/kids-zone';

export function calculateAge(dateOfBirth: string | null | undefined, now: Date = new Date()): number | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  let age = now.getFullYear() - dob.getFullYear();
  const monthDiff = now.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

export const KIDS_DASHBOARD_AGE_CUTOFF = 8;

/**
 * True for a real, known age under 8. Deliberately conservative when the DOB is
 * missing or unparsable — same "unidentified is treated as not eligible" rule as
 * the grade-based check, since showing the kids UI to an unidentified/older user
 * is worse than a family just needing to fill in date of birth.
 */
export function isYoungLearnerByAge(dateOfBirth: string | null | undefined): boolean {
  const age = calculateAge(dateOfBirth);
  return age !== null && age < KIDS_DASHBOARD_AGE_CUTOFF;
}

/**
 * Combined check used everywhere the app decides whether to show the Kids
 * Dashboard: prefers the real age from date_of_birth; falls back to the existing
 * school grade_level heuristic (grade <= 5) only when no DOB is on file, so
 * school-enrolled young students aren't newly excluded by this change.
 */
export function isKidsDashboardEligible(params: { dateOfBirth?: string | null; schoolGradeLevelText?: string | null }): boolean {
  if (params.dateOfBirth) return isYoungLearnerByAge(params.dateOfBirth);
  if (params.schoolGradeLevelText) return isEligibleForKidsZone(params.schoolGradeLevelText);
  return false;
}
