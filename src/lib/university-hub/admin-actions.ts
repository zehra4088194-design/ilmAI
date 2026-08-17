'use server';

// Admin CMS actions for /admin/university. Same pattern as every other /admin/*
// action in this codebase: requireAdminUser() gates access, createAdminClient()
// (service role) does the write — RLS on the university_* tables only grants
// SELECT to the authenticated role, so these are the only writers.
import { revalidatePath } from 'next/cache';
import slugify from 'slugify';
import { requireAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import type { UniversityActionState } from './types';

export async function createUniversityProgram(
  _state: UniversityActionState,
  formData: FormData
): Promise<UniversityActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };

  const name = String(formData.get('name') || '').trim();
  const stream = String(formData.get('stream') || '').trim() || null;
  const totalYears = Math.max(1, Math.min(8, Number(formData.get('total_years')) || 4));
  if (name.length < 2) return { success: false, message: 'Program name is required.' };
  const slug = slugify(name, { lower: true, strict: true }).slice(0, 80);

  const db = (await createAdminClient()) as any;
  const { data: program, error } = await db
    .from('university_degree_programs')
    .insert({ name, slug, stream, total_years: totalYears, created_by: admin.id })
    .select('id')
    .single();
  if (error) return { success: false, message: error.message };

  // Auto-create the year rows (e.g. "1st Professional Year" .. "4th Professional
  // Year") so the admin doesn't have to add each one by hand — matches the
  // reference app's "Pharm-D 1st Professional Year" naming exactly.
  const ORDINALS = ['1st', '2nd', '3rd', '4th', '5th', '6th', '7th', '8th'];
  const years = Array.from({ length: totalYears }, (_, index) => ({
    program_id: program.id,
    year_number: index + 1,
    label: `${ORDINALS[index] || `${index + 1}th`} Professional Year`,
    sort_order: index,
  }));
  const { error: yearsError } = await db.from('university_program_years').insert(years);
  if (yearsError) return { success: false, message: yearsError.message };

  revalidatePath('/admin/university');
  return { success: true, message: `${name} created with ${totalYears} year(s).` };
}

export async function createUniversitySubject(
  _state: UniversityActionState,
  formData: FormData
): Promise<UniversityActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };

  const programYearId = String(formData.get('program_year_id') || '').trim();
  const name = String(formData.get('name') || '').trim();
  if (!programYearId || name.length < 2) return { success: false, message: 'Subject name is required.' };

  const db = (await createAdminClient()) as any;
  const { error } = await db.from('university_subjects').insert({ program_year_id: programYearId, name });
  if (error) return { success: false, message: error.message };

  revalidatePath('/admin/university', 'layout');
  return { success: true, message: `${name} added.` };
}

export async function deleteUniversitySubject(
  _state: UniversityActionState,
  formData: FormData
): Promise<UniversityActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };
  const subjectId = String(formData.get('subject_id') || '').trim();
  if (!subjectId) return { success: false, message: 'Subject is required.' };

  const db = (await createAdminClient()) as any;
  const { error } = await db.from('university_subjects').delete().eq('id', subjectId);
  if (error) return { success: false, message: error.message };

  revalidatePath('/admin/university', 'layout');
  return { success: true, message: 'Subject removed.' };
}

export async function createUniversityResource(
  _state: UniversityActionState,
  formData: FormData
): Promise<UniversityActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };

  const subjectId = String(formData.get('subject_id') || '').trim();
  const resourceType = String(formData.get('resource_type') || '').trim();
  const title = String(formData.get('title') || '').trim();
  const url = String(formData.get('url') || '').trim() || null;
  const allowed = ['book', 'past_paper', 'topic_notes', 'video_lecture', 'practical_guide', 'recent_past_paper', 'result'];
  if (!subjectId || !allowed.includes(resourceType) || title.length < 2) {
    return { success: false, message: 'Subject, a valid resource type, and a title are required.' };
  }

  const db = (await createAdminClient()) as any;
  const { error } = await db
    .from('university_subject_resources')
    .insert({ subject_id: subjectId, resource_type: resourceType, title, url, created_by: admin.id });
  if (error) return { success: false, message: error.message };

  revalidatePath('/admin/university', 'layout');
  return { success: true, message: `${title} added.` };
}

export async function deleteUniversityResource(
  _state: UniversityActionState,
  formData: FormData
): Promise<UniversityActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };
  const resourceId = String(formData.get('resource_id') || '').trim();
  if (!resourceId) return { success: false, message: 'Resource is required.' };

  const db = (await createAdminClient()) as any;
  const { error } = await db.from('university_subject_resources').delete().eq('id', resourceId);
  if (error) return { success: false, message: error.message };

  revalidatePath('/admin/university', 'layout');
  return { success: true, message: 'Resource removed.' };
}

export async function createUniversityQuestion(
  _state: UniversityActionState,
  formData: FormData
): Promise<UniversityActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };

  const subjectId = String(formData.get('subject_id') || '').trim();
  const text = String(formData.get('text') || '').trim();
  const optionA = String(formData.get('option_a') || '').trim();
  const optionB = String(formData.get('option_b') || '').trim();
  const optionC = String(formData.get('option_c') || '').trim();
  const optionD = String(formData.get('option_d') || '').trim();
  const correctAnswer = String(formData.get('correct_answer') || '').trim().toLowerCase();
  const explanation = String(formData.get('explanation') || '').trim() || null;
  const difficulty = String(formData.get('difficulty') || 'MEDIUM');

  if (!subjectId || text.length < 3 || !optionA || !optionB || !['a', 'b', 'c', 'd'].includes(correctAnswer)) {
    return { success: false, message: 'Subject, question text, at least options A/B, and the correct option are required.' };
  }
  const options = [
    { id: 'a', text: optionA },
    { id: 'b', text: optionB },
    ...(optionC ? [{ id: 'c', text: optionC }] : []),
    ...(optionD ? [{ id: 'd', text: optionD }] : []),
  ];
  if (!options.some((option) => option.id === correctAnswer)) {
    return { success: false, message: 'The correct option must match one of the options you filled in.' };
  }

  const db = (await createAdminClient()) as any;
  const { error } = await db.from('university_questions').insert({
    subject_id: subjectId,
    text,
    options,
    correct_answer: correctAnswer,
    explanation,
    difficulty: ['EASY', 'MEDIUM', 'HARD'].includes(difficulty) ? difficulty : 'MEDIUM',
    marks: 1,
    created_by: admin.id,
  });
  if (error) return { success: false, message: error.message };

  revalidatePath('/admin/university', 'layout');
  return {
    success: true,
    message:
      'Question added. For bulk import, insert rows directly into university_questions via Supabase (same shape: text, options jsonb, correct_answer, explanation, difficulty, marks).',
  };
}

export async function deleteUniversityQuestion(
  _state: UniversityActionState,
  formData: FormData
): Promise<UniversityActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };
  const questionId = String(formData.get('question_id') || '').trim();
  if (!questionId) return { success: false, message: 'Question is required.' };

  const db = (await createAdminClient()) as any;
  const { error } = await db.from('university_questions').delete().eq('id', questionId);
  if (error) return { success: false, message: error.message };

  revalidatePath('/admin/university', 'layout');
  return { success: true, message: 'Question removed.' };
}
