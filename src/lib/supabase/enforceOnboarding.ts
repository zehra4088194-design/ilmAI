import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';
import { needsProfileCompletion } from '@/lib/utils/checkProfileComplete';

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
    .select('role, board, grade_level, onboarding_completed')
    .eq('id', user.id)
    .single();

  if (error || !profile) {
    console.error('[enforceOnboarding] Profile lookup failed:', error);
    return null;
  }

  if (profile.role !== 'student') {
    return null;
  }

  if (needsProfileCompletion(profile)) {
    return NextResponse.redirect(new URL(COMPLETE_PROFILE_PATH, request.url));
  }

  if (profile.onboarding_completed === false) {
    return NextResponse.redirect(new URL(ONBOARDING_PATH, request.url));
  }

  return null;
}
