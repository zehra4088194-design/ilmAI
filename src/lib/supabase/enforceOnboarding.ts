import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { needsProfileCompletion } from '@/lib/utils/checkProfileComplete';
import { getRequestSiteUrl } from '@/lib/utils/siteUrl';

const ONBOARDING_PATH = '/onboarding/class';
const COMPLETE_PROFILE_PATH = '/onboarding/complete-profile';

const ALWAYS_ALLOWED_PREFIXES = [
  '/onboarding',
  '/api',
  '/_next',
  '/favicon.ico',
];

function pathStartsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname.startsWith(prefix));
}

export async function enforceOnboarding(
  request: NextRequest,
  supabase: SupabaseClient<Database>
) {
  const { pathname } = request.nextUrl;

  if (pathStartsWithAny(pathname, ALWAYS_ALLOWED_PREFIXES)) {
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role, gender, board, grade_level, education_level, university_program, university_semester, onboarding_completed')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    console.error('[enforceOnboarding] Profile lookup failed:', error);
    return null;
  }

  // Institution membership is authoritative for portal accounts. A person can be
  // a school/college coordinator, teacher, owner, etc. while their global profiles.role
  // is still "student" (legacy accounts or an existing consumer account later invited
  // into an institution). Never send such a member through student onboarding.
  const [{ data: schoolMemberships }, { data: collegeMemberships }] = await Promise.all([
    (supabase as any)
      .from('school_memberships')
      .select('member_role')
      .eq('profile_id', user.id)
      .eq('status', 'active'),
    (supabase as any)
      .from('college_memberships')
      .select('member_role')
      .eq('profile_id', user.id)
      .eq('status', 'active'),
  ]);
  const hasInstitutionNonStudentMembership =
    (schoolMemberships || []).some((row: any) => row.member_role !== 'student') ||
    (collegeMemberships || []).some((row: any) => row.member_role !== 'student');

  if (profile.role !== 'student' || hasInstitutionNonStudentMembership) {
    return null;
  }

  if (needsProfileCompletion(profile)) {
    return NextResponse.redirect(`${getRequestSiteUrl(request)}${COMPLETE_PROFILE_PATH}`);
  }

  if (profile.onboarding_completed === false) {
    return NextResponse.redirect(`${getRequestSiteUrl(request)}${ONBOARDING_PATH}`);
  }

  return null;
}
