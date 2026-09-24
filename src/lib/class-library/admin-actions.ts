'use server';

// Admin CMS actions for /admin/class-library. Same pattern as every other
// /admin/* action: requireAdminUser() gates access, createAdminClient()
// (service role) does the write.
import { revalidatePath } from 'next/cache';
import slugify from 'slugify';
import { requireAdminUser } from '@/lib/admin/auth';
import { createAdminClient } from '@/lib/supabase/server';
import type { ClassLibraryActionState } from './types';

export async function createClassLibraryClass(
  _state: ClassLibraryActionState,
  formData: FormData
): Promise<ClassLibraryActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };

  const name = String(formData.get('name') || '').trim();
  if (name.length < 1) return { success: false, message: 'Class name is required.' };
  const slug = slugify(name, { lower: true, strict: true }).slice(0, 80);

  const db = (await createAdminClient()) as any;
  const { error } = await db.from('class_library_classes').insert({ name, slug, created_by: admin.id });
  if (error) return { success: false, message: error.message };

  revalidatePath('/admin/class-library');
  return { success: true, message: `${name} created.` };
}

export async function createClassLibrarySubject(
  _state: ClassLibraryActionState,
  formData: FormData
): Promise<ClassLibraryActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };

  const classId = String(formData.get('class_id') || '').trim();
  const name = String(formData.get('name') || '').trim();
  if (!classId || name.length < 2) return { success: false, message: 'Subject name is required.' };

  const db = (await createAdminClient()) as any;
  const { error } = await db.from('class_library_subjects').insert({ class_id: classId, name });
  if (error) return { success: false, message: error.message };

  revalidatePath('/admin/class-library', 'layout');
  return { success: true, message: `${name} added.` };
}

export async function deleteClassLibrarySubject(
  _state: ClassLibraryActionState,
  formData: FormData
): Promise<ClassLibraryActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };
  const subjectId = String(formData.get('subject_id') || '').trim();
  if (!subjectId) return { success: false, message: 'Subject is required.' };

  const db = (await createAdminClient()) as any;
  const { error } = await db.from('class_library_subjects').delete().eq('id', subjectId);
  if (error) return { success: false, message: error.message };

  revalidatePath('/admin/class-library', 'layout');
  return { success: true, message: 'Subject removed.' };
}

export async function createClassLibraryResource(
  _state: ClassLibraryActionState,
  formData: FormData
): Promise<ClassLibraryActionState> {
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
    .from('class_library_subject_resources')
    .insert({ subject_id: subjectId, resource_type: resourceType, title, url, created_by: admin.id });
  if (error) return { success: false, message: error.message };

  revalidatePath('/admin/class-library', 'layout');
  return { success: true, message: `${title} added.` };
}

export async function deleteClassLibraryResource(
  _state: ClassLibraryActionState,
  formData: FormData
): Promise<ClassLibraryActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };
  const resourceId = String(formData.get('resource_id') || '').trim();
  if (!resourceId) return { success: false, message: 'Resource is required.' };

  const db = (await createAdminClient()) as any;
  const { error } = await db.from('class_library_subject_resources').delete().eq('id', resourceId);
  if (error) return { success: false, message: error.message };

  revalidatePath('/admin/class-library', 'layout');
  return { success: true, message: 'Resource removed.' };
}

export async function createClassLibraryQuestion(
  _state: ClassLibraryActionState,
  formData: FormData
): Promise<ClassLibraryActionState> {
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
  const { error } = await db.from('class_library_questions').insert({
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

  revalidatePath('/admin/class-library', 'layout');
  return {
    success: true,
    message:
      'Question added. For bulk import, insert rows directly into class_library_questions via Supabase (same shape: text, options jsonb, correct_answer, explanation, difficulty, marks).',
  };
}

export async function deleteClassLibraryQuestion(
  _state: ClassLibraryActionState,
  formData: FormData
): Promise<ClassLibraryActionState> {
  const admin = await requireAdminUser();
  if (!admin) return { success: false, message: 'Admin access required.' };
  const questionId = String(formData.get('question_id') || '').trim();
  if (!questionId) return { success: false, message: 'Question is required.' };

  const db = (await createAdminClient()) as any;
  const { error } = await db.from('class_library_questions').delete().eq('id', questionId);
  if (error) return { success: false, message: error.message };

  revalidatePath('/admin/class-library', 'layout');
  return { success: true, message: 'Question removed.' };
}
