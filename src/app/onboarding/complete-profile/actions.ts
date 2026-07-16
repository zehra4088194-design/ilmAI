'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/lib/supabase/database.types';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import {
  OUTPUT_STYLES,
  UNIVERSITY_STREAMS,
  type PreferredOutputStyle,
  type UniversityStream,
} from '@/lib/constants/university';

type BoardType = Database['public']['Enums']['board_type'];
type GradeLevel = Database['public']['Enums']['grade_level'];
const USERNAME_REGEX = /^[a-z0-9._]{3,30}$/i;

export interface ActionResult {
  success: boolean;
  error?: string;
}

export async function completeUsername(username: string): Promise<ActionResult> {
  const normalizedUsername = username.trim().toLowerCase();
  if (!USERNAME_REGEX.test(normalizedUsername)) {
    return { success: false, error: 'Username 3-30 chars aur sirf letters, numbers, dot, underscore ho.' };
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
  if (usernameOwner) return { success: false, error: 'Ye username already taken hai.' };
  const { error } = await supabase.from('profiles').update({ username: normalizedUsername }).eq('id', user.id);
  if (error) return { success: false, error: 'Username save nahi ho saka. Dobara try karein.' };
  revalidatePath('/', 'layout');
  return { success: true };
}

function isValidBoard(value: unknown): value is BoardType {
  return typeof value === 'string' && BOARDS.some((board) => board.value === value);
}

function isValidGradeLevel(value: unknown): value is GradeLevel {
  return typeof value === 'string' && GRADE_LEVELS.some((grade) => grade.value === value);
}

function isValidOutputStyle(value: unknown): value is PreferredOutputStyle {
  return typeof value === 'string' && OUTPUT_STYLES.some((style) => style.value === value);
}

function isValidUniversityStream(value: unknown): value is UniversityStream {
  return typeof value === 'string' && UNIVERSITY_STREAMS.some((stream) => stream.value === value);
}

export async function completeProfile(board: string, gradeLevel: string, username: string, gender: string): Promise<ActionResult> {
  if (!isValidBoard(board) || !isValidGradeLevel(gradeLevel) || !USERNAME_REGEX.test(username.trim()) || (gender !== 'girl' && gender !== 'boy')) {
    return { success: false, error: 'Username, board aur grade dono zaroori hain.' };
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
  if (usernameOwner) return { success: false, error: 'Ye username already taken hai.' };

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

  const { error } = await supabase
    .from('profiles')
    .update({
      board,
      gender,
      username: normalizedUsername,
      grade_level: gradeLevel,
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
    return { success: false, error: 'Username, section, degree aur semester zaroori hain.' };
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
  if (usernameOwner) return { success: false, error: 'Ye username already taken hai.' };
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
