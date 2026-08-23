// Which pricing family a profile's personal /subscription page should show. Parents, individual
// (non-institution) teachers, and university students each have their own admin-configurable tier
// pricing (parentPlans/teacherPlans/universityPlans in PlatformSettings) — separate from the
// generic K-12 student subscriptionPlans this page showed for everyone until now. An institution
// member's plan is set by their admin in /admin/schools or /admin/colleges billing, not purchased
// here, so that takes priority over role when both apply (e.g. a teacher who is also school staff).
export type PlanFamily = 'institution' | 'parent' | 'teacher' | 'university' | 'student';

export function resolvePlanFamily(opts: {
  role: string | null | undefined;
  educationLevel: string | null | undefined;
  hasInstitutionMembership: boolean;
}): PlanFamily {
  if (opts.hasInstitutionMembership) return 'institution';
  if (opts.role === 'parent') return 'parent';
  if (opts.role === 'teacher') return 'teacher';
  if (opts.educationLevel === 'university') return 'university';
  return 'student';
}
