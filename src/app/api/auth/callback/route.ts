import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';
import { BOARDS } from '@/lib/constants';
import { needsProfileCompletion } from '@/lib/utils/checkProfileComplete';

type BoardType = Database['public']['Enums']['board_type'];
type EducationLevel = 'school' | 'college' | 'university';

function resolveBoard(value: unknown): BoardType | null {
  return typeof value === 'string' && BOARDS.some((board) => board.value === value) ? (value as BoardType) : null;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirect') || '/dashboard';

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const userMetadata = data.user.user_metadata;
      const providers = data.user.app_metadata?.providers;
      const isGoogleAuth =
        data.user.app_metadata?.provider === 'google' ||
        (Array.isArray(providers) && providers.includes('google'));
      const metadataRole =
        userMetadata?.role === 'parent' || userMetadata?.role === 'teacher' || userMetadata?.role === 'admin' || userMetadata?.role === 'student'
          ? userMetadata.role
          : null;
      const metadataBoard = resolveBoard(userMetadata?.board);

      // Ensure a profile row exists (for OAuth sign-ups that skip our register form)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, role, board, grade_level, education_level, university_program, university_semester, onboarding_completed, is_profile_complete')
        .eq('id', data.user.id)
        .maybeSingle();
      const resolvedRole = metadataRole ?? existingProfile?.role ?? 'student';
      let profileForRedirect: {
        role: Database['public']['Enums']['user_role'];
        board: Database['public']['Enums']['board_type'] | null;
        grade_level: Database['public']['Enums']['grade_level'] | null;
        education_level: 'school' | 'college' | 'university';
        university_program: string | null;
        university_semester: string | null;
        onboarding_completed: boolean;
      };

      if (!existingProfile) {
        await supabase.from('profiles').insert({
          id: data.user.id, email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || data.user.email!.split('@')[0],
          avatar_url: data.user.user_metadata?.avatar_url || null,
          board: metadataBoard,
          education_level: 'school',
          role: resolvedRole,
          onboarding_completed: resolvedRole !== 'student',
          subscription_tier: 'FREE', xp: 0, level: 1, streak: 0, total_study_time: 0,
          is_email_verified: !!data.user.email_confirmed_at, is_profile_complete: false, onboarding_step: 0,
        });
        profileForRedirect = {
          role: resolvedRole,
          board: metadataBoard,
          grade_level: null,
          education_level: 'school',
          university_program: null,
          university_semester: null,
          onboarding_completed: resolvedRole !== 'student',
        };
      } else {
        const updates: Database['public']['Tables']['profiles']['Update'] = {};

        if (existingProfile.role !== resolvedRole) {
          updates.role = resolvedRole;
        }

        if (metadataBoard && !existingProfile.board) {
          updates.board = metadataBoard;
        }

        if (resolvedRole !== 'student' && existingProfile.onboarding_completed === false) {
          updates.onboarding_completed = true;
        }

        if (Object.keys(updates).length > 0) {
          await supabase.from('profiles').update(updates).eq('id', data.user.id);
        }

        profileForRedirect = {
          role: resolvedRole,
          board: updates.board ?? existingProfile.board,
          grade_level: existingProfile.grade_level,
          education_level: (existingProfile.education_level as EducationLevel | null) ?? 'school',
          university_program: existingProfile.university_program,
          university_semester: existingProfile.university_semester,
          onboarding_completed: updates.onboarding_completed ?? existingProfile.onboarding_completed,
        };
      }

      const destination =
        isGoogleAuth && needsProfileCompletion(profileForRedirect)
          ? '/onboarding/complete-profile'
          : resolvedRole === 'student' && !profileForRedirect.onboarding_completed
          ? '/onboarding/class'
          : redirectTo;

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
