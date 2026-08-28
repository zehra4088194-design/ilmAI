'use server';

import { revalidatePath } from 'next/cache';
import { nanoid } from 'nanoid';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import type { Database } from '@/lib/supabase/database.types';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import {
  OUTPUT_STYLES,
  UNIVERSITY_STREAMS,
  type PreferredOutputStyle,
  type UniversityStream,
} from '@/lib/constants/university';
import { createInstitutionalJoinRequestFromSignup } from '@/lib/school-erp/join-request-signup';

type BoardType = Database['public']['Enums']['board_type'];
type GradeLevel = Database['public']['Enums']['grade_level'];
type ScienceGroup = 'biology' | 'computer';
const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/i;

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function completeUsername(username: string): Promise<ActionResult> {
  const normalizedUsername = username.trim().toLowerCase();
  if (!USERNAME_REGEX.test(normalizedUsername)) {
    return { success: false, error: 'Username must be 3-30 characters and use only letters, numbers, dots, or underscores.' };
  }
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'You must be signed in to continue.' };
  const { data: usernameOwner } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', normalizedUsername)
    .neq('id', user.id)
    .maybeSingle();
  if (usernameOwner) return { success: false, error: 'This username is already taken.' };
  const { error } = await supabase.from('profiles').update({ username: normalizedUsername }).eq('id', user.id);
  if (error) return { success: false, error: 'The username could not be saved. Please try again.' };
  revalidatePath('/', 'layout');
  return { success: true };
}

function isValidBoard(value: unknown): value is BoardType {
  return typeof value === 'string' && BOARDS.some((board) => board.value === value);
}

function isValidGradeLevel(value: unknown): value is GradeLevel {
  return typeof value === 'string' && GRADE_LEVELS.some((grade) => grade.value === value);
}

function isValidScienceGroup(value: unknown): value is ScienceGroup {
  return value === 'biology' || value === 'computer';
}

async function findScienceSubjectIds(board: BoardType, gradeLevel: GradeLevel, scienceGroup: ScienceGroup) {
  const db = createServiceClient() as any;
  const { data } = await db
    .from('subjects')
    .select('id, name, slug, stream, is_optional')
    .eq('is_active', true)
    .contains('boards', [board])
    .contains('grade_levels', [gradeLevel]);

  return (data || [])
    .filter((subject: any) => {
      if (!subject.is_optional) return false;
      const identity = `${subject.name} ${subject.slug} ${subject.stream || ''}`.toLowerCase();
      return scienceGroup === 'biology'
        ? identity.includes('biology') || identity.includes('pre-medical')
        : identity.includes('computer');
    })
    .map((subject: any) => subject.id);
}

function isValidOutputStyle(value: unknown): value is PreferredOutputStyle {
  return typeof value === 'string' && OUTPUT_STYLES.some((style) => style.value === value);
}

function isValidUniversityStream(value: unknown): value is UniversityStream {
  return typeof value === 'string' && UNIVERSITY_STREAMS.some((stream) => stream.value === value);
}

export async function completeProfile(board: string, gradeLevel: string, username: string, gender: string, scienceGroup: string): Promise<ActionResult> {
  if (!isValidBoard(board) || !isValidGradeLevel(gradeLevel) || !USERNAME_REGEX.test(username.trim()) || (gender !== 'girl' && gender !== 'boy') || !isValidScienceGroup(scienceGroup)) {
    return { success: false, error: 'Username, board, grade, and science subject are required.' };
  }

  const normalizedUsername = username.trim().toLowerCase();
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'You must be signed in to continue.' };
  }

  const { data: usernameOwner } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', normalizedUsername)
    .neq('id', user.id)
    .maybeSingle();
  if (usernameOwner) return { success: false, error: 'This username is already taken.' };

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    console.error('[completeProfile] Failed to fetch profile:', profileError);
    return { success: false, error: 'Could not load your profile. Please try again.' };
  }

  if (profile.role !== 'student') {
    return { success: false, error: 'Profile completion is only available for student accounts.' };
  }

  const optionalSubjectIds = await findScienceSubjectIds(board, gradeLevel, scienceGroup);
  const { error } = await supabase
    .from('profiles')
    .update({
      board,
      gender,
      username: normalizedUsername,
      grade_level: gradeLevel,
      science_group: scienceGroup,
      optional_subject_ids: optionalSubjectIds,
      education_level: gradeLevel === 'GRADE_11' || gradeLevel === 'GRADE_12' ? 'college' : 'school',
      is_profile_complete: true,
      onboarding_completed: true,
    })
    .eq('id', user.id);

  if (error) {
    console.error('[completeProfile] Update failed:', error);
    return { success: false, error: 'Could not save your profile. Please try again.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

export async function completeUniversityProfile(input: {
  username: string;
  stream: string;
  degree: string;
  program: string;
  semester: string;
  courses: string[];
  examTargetDate?: string | null;
  preferredOutputStyle: PreferredOutputStyle;
  gender: 'girl' | 'boy';
}): Promise<ActionResult> {
  const program = input.program.trim();
  const degree = input.degree.trim();
  const semester = input.semester.trim();
  const courses = input.courses
    .map((course) => course.trim())
    .filter(Boolean)
    .slice(0, 12);
  if (
    !program ||
    !degree ||
    !semester ||
    !isValidUniversityStream(input.stream) ||
    (input.gender !== 'girl' && input.gender !== 'boy') ||
    !USERNAME_REGEX.test(input.username.trim())
  ) {
    return { success: false, error: 'Username, section, degree, and semester are required.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: 'You must be signed in to continue.' };
  }

  const style = isValidOutputStyle(input.preferredOutputStyle) ? input.preferredOutputStyle : 'simple';
  const normalizedUsername = input.username.trim().toLowerCase();
  const { data: usernameOwner } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', normalizedUsername)
    .neq('id', user.id)
    .maybeSingle();
  if (usernameOwner) return { success: false, error: 'This username is already taken.' };
  const { error } = await supabase
    .from('profiles')
    .update({
      username: normalizedUsername,
      gender: input.gender,
      education_level: 'university',
      university_stream: input.stream,
      university_degree: degree,
      university_program: program,
      university_semester: semester,
      university_courses: courses,
      university_exam_target_date: input.examTargetDate || null,
      preferred_output_style: style,
      board: null,
      grade_level: null,
      science_group: null,
      optional_subject_ids: [],
      is_profile_complete: true,
      onboarding_completed: true,
    })
    .eq('id', user.id);

  if (error) {
    console.error('[completeUniversityProfile] Update failed:', error);
    return { success: false, error: 'Could not save your university profile. Please try again.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

// Google sign-in never carries a role choice the way the email/password RegisterForm wizard does
// — every brand-new Google account defaults to role='student', which is why this "one more step"
// page used to only ever ask student/university details. This is the parent branch of the "I am
// a..." choice now shown first: skips all the education fields entirely and mirrors
// ensureParentInvite() from api/auth/callback/route.ts (same pending parent_student_links row) so
// a Google-signed-up parent gets the same "connect a child" flow an email-signup parent gets.
export async function completeParentProfile(username: string): Promise<ActionResult> {
  const normalizedUsername = username.trim().toLowerCase();
  if (!USERNAME_REGEX.test(normalizedUsername)) {
    return { success: false, error: 'Username must be 3-30 characters and use only letters, numbers, dots, or underscores.' };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'You must be signed in to continue.' };

  const { data: usernameOwner } = await supabase
    .from('profiles')
    .select('id')
    .eq('username', normalizedUsername)
    .neq('id', user.id)
    .maybeSingle();
  if (usernameOwner) return { success: false, error: 'This username is already taken.' };

  const { error } = await supabase
    .from('profiles')
    .update({
      role: 'parent',
      username: normalizedUsername,
      is_profile_complete: true,
      onboarding_completed: true,
    })
    .eq('id', user.id);
  if (error) {
    console.error('[completeParentProfile] Update failed:', error);
    return { success: false, error: 'Could not save your profile. Please try again.' };
  }

  try {
    const admin = (await createAdminClient()) as any;
    const { data: existingInvite } = await admin
      .from('parent_student_links')
      .select('id')
      .eq('parent_id', user.id)
      .eq('status', 'pending')
      .is('student_id', null)
      .gt('invite_expires_at', new Date().toISOString())
      .maybeSingle();
    if (!existingInvite) {
      await admin.from('parent_student_links').insert({
        id: crypto.randomUUID(),
        parent_id: user.id,
        student_id: null,
        status: 'pending',
        invite_code: `SV-${nanoid(6).toUpperCase()}`,
        invite_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  } catch (inviteError) {
    // Non-fatal — the parent account itself saved fine; they can still generate a connect code
    // later from /parent. Matches how ensureParentInvite() in the callback route also swallows this.
    console.error('[completeParentProfile] Parent invite auto-create failed:', inviteError);
  }

  revalidatePath('/', 'layout');
  return { success: true };
}

// The other branch of "I am a..." — someone whose school/college already exists in ilm AI and
// they just need to join it as a teacher. Reuses the exact same school_join_requests flow the
// email/password institutional signup wizard uses (createInstitutionalJoinRequestFromSignup),
// just triggered directly from an already-authenticated Google session instead of from signUp()
// metadata. A brand-new school (with its owner/principal) is still created by a platform admin via
// /admin/schools — that path doesn't change; this is only for staff joining an existing one.
export async function requestSchoolJoin(institutionId: string, fullName: string): Promise<ActionResult> {
  if (!institutionId.trim()) return { success: false, error: 'Search for and select your school first.' };

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();
  if (authError || !user) return { success: false, error: 'You must be signed in to continue.' };

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'teacher', is_profile_complete: true, onboarding_completed: true })
    .eq('id', user.id);
  if (error) {
    console.error('[requestSchoolJoin] Profile update failed:', error);
    return { success: false, error: 'Could not save your profile. Please try again.' };
  }

  try {
    const admin = (await createAdminClient()) as any;
    await createInstitutionalJoinRequestFromSignup(
      admin,
      user.id,
      institutionId,
      'teacher',
      fullName.trim() || user.email?.split('@')[0] || 'A new user'
    );
  } catch (joinError) {
    console.error('[requestSchoolJoin] Join request failed:', joinError);
    return { success: false, error: 'Could not send the join request. Please try again.' };
  }

  revalidatePath('/', 'layout');
  return { success: true };
}
