import { NextResponse } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { EDUCATION_LEVELS } from '@/lib/constants/university';
import { createInstitutionalJoinRequestFromSignup } from '@/lib/school-erp/join-request-signup';

function isMissingAcademicInstitutionColumn(error: { code?: string; message?: string } | null) {
  return (
    error?.code === '42703' || error?.code === 'PGRST204' || Boolean(error?.message?.includes('academic_institution_'))
  );
}

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Authentication is required' }, { status: 401 });

  const metadata = user.user_metadata || {};
  const role = metadata.role === 'parent' ? 'parent' : metadata.role === 'teacher' ? 'teacher' : 'student';
  const signupInstitutionId =
    typeof metadata.signup_institution_id === 'string' ? metadata.signup_institution_id : null;
  const signupRoleRequested =
    metadata.signup_role_requested === 'teacher' || metadata.signup_role_requested === 'student'
      ? metadata.signup_role_requested
      : null;
  const username = typeof metadata.username === 'string' ? metadata.username.trim().toLowerCase() : null;
  const gender = metadata.gender === 'girl' || metadata.gender === 'boy' ? metadata.gender : null;
  const preferredLanguage = metadata.preferred_language === 'roman-ur' ? 'roman-ur' : 'en';
  const educationLevel = EDUCATION_LEVELS.some((level) => level.value === metadata.education_level)
    ? metadata.education_level
    : 'school';
  const gradeLevel = GRADE_LEVELS.some((grade) => grade.value === metadata.grade_level) ? metadata.grade_level : null;
  const board = BOARDS.some((item) => item.value === metadata.board) ? metadata.board : null;
  const academicInstitutionName =
    typeof metadata.academic_institution_name === 'string' ? metadata.academic_institution_name.trim() || null : null;
  const academicInstitutionType = EDUCATION_LEVELS.some((level) => level.value === metadata.academic_institution_type)
    ? metadata.academic_institution_type
    : educationLevel;
  const onboardingCompleted =
    role !== 'student' || (educationLevel !== 'university' && Boolean(gender && gradeLevel && board));
  const dateOfBirth =
    typeof metadata.date_of_birth === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(metadata.date_of_birth)
      ? metadata.date_of_birth
      : null;
  const admin = (await createAdminClient()) as any;
  const { data: existing } = await admin
    .from('profiles')
    .select('id, username, gender, grade_level, board, date_of_birth')
    .eq('id', user.id)
    .maybeSingle();

  if (!existing) {
    const insertPayload: Record<string, unknown> = {
      id: user.id,
      email: user.email || '',
      full_name: metadata.full_name || user.email?.split('@')[0] || 'Student',
      username,
      gender,
      gender_changed_at: gender ? new Date().toISOString() : null,
      date_of_birth: dateOfBirth,
      role,
      education_level: educationLevel,
      grade_level: gradeLevel,
      board,
      academic_institution_name: academicInstitutionName,
      academic_institution_type: academicInstitutionType,
      subscription_tier: 'FREE',
      xp: 0,
      level: 1,
      streak: 0,
      total_study_time: 0,
      is_email_verified: Boolean(user.email_confirmed_at),
      is_profile_complete: onboardingCompleted,
      onboarding_completed: onboardingCompleted,
      onboarding_step: 0,
      preferred_language: preferredLanguage,
    };
    let { error } = await admin.from('profiles').insert(insertPayload);
    if (isMissingAcademicInstitutionColumn(error)) {
      delete insertPayload.academic_institution_name;
      delete insertPayload.academic_institution_type;
      const fallback = await admin.from('profiles').insert(insertPayload);
      error = fallback.error;
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    const updates: Record<string, unknown> = {};
    updates.preferred_language = preferredLanguage;
    if (username && !existing.username) updates.username = username;
    if (gender && !existing.gender) {
      updates.gender = gender;
      updates.gender_changed_at = new Date().toISOString();
    }
    if (gradeLevel && !existing.grade_level) updates.grade_level = gradeLevel;
    if (board && !existing.board) updates.board = board;
    if (dateOfBirth && !existing.date_of_birth) updates.date_of_birth = dateOfBirth;
    updates.education_level = educationLevel;
    if (onboardingCompleted) {
      updates.onboarding_completed = true;
      updates.is_profile_complete = true;
    }
    if (Object.keys(updates).length > 0) {
      const { error } = await admin.from('profiles').update(updates).eq('id', user.id);
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (academicInstitutionName) {
      const { error } = await admin
        .from('profiles')
        .update({
          academic_institution_name: academicInstitutionName,
          academic_institution_type: academicInstitutionType,
        })
        .eq('id', user.id);
      if (error && !isMissingAcademicInstitutionColumn(error)) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }
  }

  if (signupInstitutionId && signupRoleRequested) {
    await createInstitutionalJoinRequestFromSignup(
      admin,
      user.id,
      signupInstitutionId,
      signupRoleRequested,
      metadata.full_name || user.email?.split('@')[0] || 'A new user'
    );
  }

  return NextResponse.json({ success: true });
}
