import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { needsProfileCompletion } from '@/lib/utils/checkProfileComplete';
import { nanoid } from 'nanoid';
import { LOCALE_COOKIE_NAME } from '@/lib/i18n/config';
import { getRequestSiteUrl } from '@/lib/utils/siteUrl';
import { createInstitutionalJoinRequestFromSignup } from '@/lib/school-erp/join-request-signup';
import { resolveMembershipRedirect } from '@/lib/auth/resolveMembershipRedirect';
import { decodeSessionIdFromJwt, enforceSessionLimit } from '@/lib/auth/enforceSessionLimit';

type BoardType = Database['public']['Enums']['board_type'];
type GradeLevel = Database['public']['Enums']['grade_level'];
type EducationLevel = 'school' | 'college' | 'university';

function resolveBoard(value: unknown): BoardType | null {
  return typeof value === 'string' && BOARDS.some((board) => board.value === value) ? (value as BoardType) : null;
}

function resolveGradeLevel(value: unknown): GradeLevel | null {
  return typeof value === 'string' && GRADE_LEVELS.some((grade) => grade.value === value)
    ? (value as GradeLevel)
    : null;
}

function resolveRole(value: unknown): Database['public']['Enums']['user_role'] | null {
  return value === 'parent' || value === 'teacher' || value === 'admin' || value === 'student' ? value : null;
}

function resolveEducationLevel(value: unknown): EducationLevel | null {
  return value === 'school' || value === 'college' || value === 'university' ? value : null;
}

function resolveGender(value: unknown): 'girl' | 'boy' | null {
  return value === 'girl' || value === 'boy' ? value : null;
}

function isMissingAcademicInstitutionColumn(error: { code?: string; message?: string } | null) {
  return (
    error?.code === '42703' || error?.code === 'PGRST204' || Boolean(error?.message?.includes('academic_institution_'))
  );
}

async function ensureParentInvite(parentId: string) {
  try {
    const admin = await createAdminClient();
    const { data: existing } = await (admin.from('parent_student_links') as any)
      .select('id')
      .eq('parent_id', parentId)
      .eq('status', 'pending')
      .is('student_id', null)
      .gt('invite_expires_at', new Date().toISOString())
      .maybeSingle();
    if (existing) return;

    await (admin.from('parent_student_links') as any).insert({
      id: crypto.randomUUID(),
      parent_id: parentId,
      student_id: null,
      status: 'pending',
      invite_code: `SV-${nanoid(6).toUpperCase()}`,
      invite_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });
  } catch (error) {
    console.error('[auth/callback] Parent invite auto-create failed:', error);
  }
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const { searchParams } = requestUrl;
  const origin = getRequestSiteUrl(request);
  const code = searchParams.get('code');
  const requestedRedirect = searchParams.get('redirect') || '/dashboard';
  const redirectTo =
    requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//') ? requestedRedirect : '/dashboard';
  const isParentLinkRedirect = redirectTo.startsWith('/parent-link');
  const redirectRole = resolveRole(searchParams.get('role'));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const currentSessionId = data.session?.access_token ? decodeSessionIdFromJwt(data.session.access_token) : null;
      await enforceSessionLimit(data.user.id, currentSessionId);

      const userMetadata = data.user.user_metadata;
      const providers = data.user.app_metadata?.providers;
      const isGoogleAuth =
        data.user.app_metadata?.provider === 'google' || (Array.isArray(providers) && providers.includes('google'));

      // Fetched early so metadataRole (below) can tell "brand-new OAuth sign-up" apart from
      // "existing account signing in again" — see that computation for why this ordering matters.
      const { data: existingProfile } = await (supabase
        .from('profiles')
        .select(
          'id, role, username, gender, board, grade_level, education_level, university_program, university_semester, onboarding_completed, is_profile_complete, preferred_language'
        )
        .eq('id', data.user.id)
        .maybeSingle() as any);

      // `redirectRole` is just a URL query hint (?role=teacher on the OAuth redirect link) — real
      // signup metadata (userMetadata.role) always wins when present. For an EXISTING profile,
      // that URL hint must NOT be trusted at all: an admin-invited school owner/teacher signing in
      // via Google (their profile already has role='teacher', set at invite time, with no
      // userMetadata.role since Google never provides one) was having that hint silently reset
      // their role back to 'student' on every single login — a real bug, found by testing an actual
      // invited-then-Google-login account. Only a genuinely new profile falls back to the hint.
      const metadataRole = resolveRole(userMetadata?.role) ?? (existingProfile ? null : redirectRole);
      const metadataBoard = resolveBoard(userMetadata?.board);
      const metadataGradeLevel = resolveGradeLevel(userMetadata?.grade_level);
      const metadataEducationLevel = resolveEducationLevel(userMetadata?.education_level);
      const metadataGender = resolveGender(userMetadata?.gender);
      const metadataAcademicInstitutionName =
        typeof userMetadata?.academic_institution_name === 'string'
          ? userMetadata.academic_institution_name.trim() || null
          : null;
      const metadataAcademicInstitutionType =
        resolveEducationLevel(userMetadata?.academic_institution_type) ?? metadataEducationLevel;
      const metadataUsername =
        typeof userMetadata?.username === 'string' ? userMetadata.username.trim().toLowerCase() : null;
      const metadataPreferredLanguage =
        userMetadata?.preferred_language === 'roman-ur' || userMetadata?.preferred_language === 'en'
          ? userMetadata.preferred_language
          : null;
      const signupInstitutionId =
        typeof userMetadata?.signup_institution_id === 'string' ? userMetadata.signup_institution_id : null;
      const signupRoleRequested =
        userMetadata?.signup_role_requested === 'teacher' || userMetadata?.signup_role_requested === 'student'
          ? userMetadata.signup_role_requested
          : null;

      const resolvedRole = metadataRole ?? existingProfile?.role ?? 'student';
      const metadataOnboardingCompleted =
        resolvedRole !== 'student' ||
        (metadataEducationLevel !== 'university' && Boolean(metadataGender && metadataBoard && metadataGradeLevel));
      let profileForRedirect: {
        role: Database['public']['Enums']['user_role'];
        username: string | null;
        gender: 'girl' | 'boy' | null;
        board: Database['public']['Enums']['board_type'] | null;
        grade_level: Database['public']['Enums']['grade_level'] | null;
        education_level: 'school' | 'college' | 'university';
        university_program: string | null;
        university_semester: string | null;
        onboarding_completed: boolean;
      };

      if (!existingProfile) {
        const insertPayload: Database['public']['Tables']['profiles']['Insert'] = {
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
          username: metadataUsername,
          gender: metadataGender,
          gender_changed_at: metadataGender ? new Date().toISOString() : null,
          avatar_url: data.user.user_metadata?.avatar_url || null,
          board: metadataBoard,
          grade_level: metadataGradeLevel,
          education_level: metadataEducationLevel || 'school',
          academic_institution_name: metadataAcademicInstitutionName,
          academic_institution_type: metadataAcademicInstitutionType,
          role: resolvedRole,
          onboarding_completed: metadataOnboardingCompleted,
          subscription_tier: 'FREE',
          xp: 0,
          level: 1,
          streak: 0,
          total_study_time: 0,
          is_email_verified: !!data.user.email_confirmed_at,
          is_profile_complete: metadataOnboardingCompleted,
          onboarding_step: 0,
        };
        (insertPayload as any).preferred_language = metadataPreferredLanguage || 'en';
        let { error: insertError } = await supabase.from('profiles').insert(insertPayload);
        if (isMissingAcademicInstitutionColumn(insertError)) {
          delete insertPayload.academic_institution_name;
          delete insertPayload.academic_institution_type;
          const fallback = await supabase.from('profiles').insert(insertPayload);
          insertError = fallback.error;
        }
        if (insertError) {
          console.error('[auth/callback] Profile creation failed:', insertError);
          return NextResponse.redirect(`${origin}/login?error=profile_setup_failed`);
        }
        profileForRedirect = {
          role: resolvedRole,
          username: metadataUsername,
          gender: metadataGender,
          board: metadataBoard,
          grade_level: metadataGradeLevel,
          education_level: metadataEducationLevel || 'school',
          university_program: null,
          university_semester: null,
          onboarding_completed: metadataOnboardingCompleted,
        };
      } else {
        const updates: Database['public']['Tables']['profiles']['Update'] = {};

        if (metadataPreferredLanguage) (updates as any).preferred_language = metadataPreferredLanguage;

        if (existingProfile.role !== resolvedRole) {
          updates.role = resolvedRole;
        }

        if (metadataBoard && !existingProfile.board) {
          updates.board = metadataBoard;
        }

        if (metadataEducationLevel && existingProfile.education_level !== metadataEducationLevel) {
          updates.education_level = metadataEducationLevel;
        }

        if (metadataGradeLevel && !existingProfile.grade_level) {
          updates.grade_level = metadataGradeLevel;
        }

        if (metadataUsername) {
          updates.username = metadataUsername;
        }

        if (metadataGender && !existingProfile.gender) {
          updates.gender = metadataGender;
          updates.gender_changed_at = new Date().toISOString();
        }

        if (metadataOnboardingCompleted && existingProfile.onboarding_completed === false) {
          updates.onboarding_completed = true;
          updates.is_profile_complete = true;
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from('profiles').update(updates).eq('id', data.user.id);
        }

        if (metadataAcademicInstitutionName) {
          const { error: institutionError } = await supabase
            .from('profiles')
            .update({
              academic_institution_name: metadataAcademicInstitutionName,
              academic_institution_type: metadataAcademicInstitutionType,
            })
            .eq('id', data.user.id);
          if (institutionError && !isMissingAcademicInstitutionColumn(institutionError)) {
            console.error('[auth/callback] Academic institution update failed:', institutionError);
          }
        }

        profileForRedirect = {
          role: resolvedRole,
          username: updates.username ?? existingProfile.username,
          gender: (updates.gender as 'girl' | 'boy' | undefined) ?? (existingProfile.gender as 'girl' | 'boy' | null),
          board: updates.board ?? existingProfile.board,
          grade_level: updates.grade_level ?? existingProfile.grade_level,
          education_level:
            (updates.education_level as EducationLevel | undefined) ??
            (existingProfile.education_level as EducationLevel | null) ??
            'school',
          university_program: existingProfile.university_program,
          university_semester: existingProfile.university_semester,
          onboarding_completed: updates.onboarding_completed ?? existingProfile.onboarding_completed,
        };
      }

      if (resolvedRole === 'parent') {
        await ensureParentInvite(data.user.id);
      }

      if (signupInstitutionId && signupRoleRequested) {
        // Uses the service-role client, not `supabase` — notifying the
        // org's owner/admin means reading OTHER users' school_memberships
        // rows, which this not-yet-a-member user can't do under RLS.
        const admin = (await createAdminClient()) as any;
        await createInstitutionalJoinRequestFromSignup(
          admin,
          data.user.id,
          signupInstitutionId,
          signupRoleRequested,
          data.user.user_metadata?.full_name || data.user.email?.split('@')[0] || 'A new user'
        );
      }

      // A school/college member (principal, teacher, staff, ...) signing in via Google/magic-link
      // must land on their institution portal — and skip the generic student onboarding entirely
      // (gender/board/grade/username-selection is a K-12-consumer-app concept an institution member
      // never needs). This used to only override the FINAL "nothing else applies" fallback, so a
      // member whose profile had no gender/board/grade set (the normal state for anyone who arrived
      // via an admin invite rather than the student signup wizard) got stuck on
      // /onboarding/complete-profile forever, since that branch ran before this check ever did.
      // Checked first (right after the parent-link deep-link case) so it wins over every onboarding
      // branch below, matching resolveMembershipRedirect's own stated priority order.
      const membershipRedirect = isParentLinkRedirect
        ? null
        : await resolveMembershipRedirect(supabase, data.user.id, redirectTo);

      const normalDestination = isParentLinkRedirect
        ? redirectTo
        : membershipRedirect?.institutionType
          ? membershipRedirect.destination
          : !profileForRedirect.username && !needsProfileCompletion(profileForRedirect)
            ? `/onboarding/username?next=${encodeURIComponent(resolvedRole === 'parent' ? '/parent' : redirectTo)}`
            : (isGoogleAuth || metadataEducationLevel === 'university') && needsProfileCompletion(profileForRedirect)
              ? '/onboarding/complete-profile'
              : resolvedRole === 'student' && !profileForRedirect.onboarding_completed
                ? '/onboarding/class'
                : resolvedRole === 'parent'
                  ? '/parent'
                  : redirectTo;

      // The "Enable 2-step verification after signup" checkbox on RegisterForm can't enroll MFA
      // directly — that needs an authenticated session, which doesn't exist during the wizard
      // whenever email confirmation is required. The checkbox instead stamps enable_2fa=true into
      // signUp's user_metadata, which survives to here once the confirmation link is clicked and a
      // real session exists. Only honored for a brand-new profile (a returning user's signup
      // metadata is irrelevant to their login) and never overrides the parent-link deep link or an
      // institution member's portal landing.
      const wantsMfaFromSignup = !existingProfile && userMetadata?.enable_2fa === true;
      const destination =
        wantsMfaFromSignup && !isParentLinkRedirect && !membershipRedirect?.institutionType
          ? `/settings?tab=security&mfa=start&next=${encodeURIComponent(normalDestination)}`
          : normalDestination;

      const response = NextResponse.redirect(`${origin}${destination}`);
      response.cookies.set(
        LOCALE_COOKIE_NAME,
        metadataPreferredLanguage || existingProfile?.preferred_language || 'en',
        { path: '/', maxAge: 365 * 24 * 60 * 60, sameSite: 'lax' }
      );
      return response;
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
