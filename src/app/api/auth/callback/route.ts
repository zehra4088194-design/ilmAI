import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';
import { BOARDS } from '@/lib/constants';
import { needsProfileCompletion } from '@/lib/utils/checkProfileComplete';
import { nanoid } from 'nanoid';

type BoardType = Database['public']['Enums']['board_type'];
type EducationLevel = 'school' | 'college' | 'university';

function resolveBoard(value: unknown): BoardType | null {
  return typeof value === 'string' && BOARDS.some((board) => board.value === value) ? (value as BoardType) : null;
}

function resolveRole(value: unknown): Database['public']['Enums']['user_role'] | null {
  return value === 'parent' || value === 'teacher' || value === 'admin' || value === 'student'
    ? value
    : null;
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
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const redirectTo = searchParams.get('redirect') || '/dashboard';
  const redirectRole = resolveRole(searchParams.get('role'));

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      const userMetadata = data.user.user_metadata;
      const providers = data.user.app_metadata?.providers;
      const isGoogleAuth =
        data.user.app_metadata?.provider === 'google' ||
        (Array.isArray(providers) && providers.includes('google'));
      const metadataRole = resolveRole(userMetadata?.role) ?? redirectRole;
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

      if (resolvedRole === 'parent') {
        await ensureParentInvite(data.user.id);
      }

      const destination =
        isGoogleAuth && needsProfileCompletion(profileForRedirect)
          ? '/onboarding/complete-profile'
          : resolvedRole === 'student' && !profileForRedirect.onboarding_completed
          ? '/onboarding/class'
          : resolvedRole === 'parent'
          ? '/parent'
          : redirectTo;

      return NextResponse.redirect(`${origin}${destination}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth_failed`);
}
