import { createClient } from '@/lib/supabase/server';

// Read-only helpers for Class Library. Uses the regular (RLS-scoped) client —
// class_library_* tables grant SELECT to everyone.

export async function getClassLibraryClasses() {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from('class_library_classes')
    .select('id, slug, name, sort_order, is_active')
    .eq('is_active', true)
    .order('sort_order')
    .order('name');
  return data || [];
}

export async function getClassLibraryClassBySlug(slug: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from('class_library_classes')
    .select('id, slug, name, sort_order, is_active')
    .eq('slug', slug)
    .maybeSingle();
  return data || null;
}

export async function getClassLibrarySubjects(classId: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from('class_library_subjects')
    .select('id, class_id, name, icon_key, is_active')
    .eq('class_id', classId)
    .eq('is_active', true)
    .order('sort_order')
    .order('name');
  return data || [];
}

export async function getClassLibrarySubjectById(subjectId: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from('class_library_subjects')
    .select('id, class_id, name, icon_key, is_active')
    .eq('id', subjectId)
    .maybeSingle();
  return data || null;
}

export async function getClassLibrarySubjectResources(subjectId: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from('class_library_subject_resources')
    .select('id, subject_id, resource_type, title, url, sort_order')
    .eq('subject_id', subjectId)
    .order('sort_order')
    .order('created_at');
  return data || [];
}

export async function getClassLibraryQuestions(subjectId: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from('class_library_questions')
    .select('id, subject_id, text, options, correct_answer, explanation, difficulty, marks')
    .eq('subject_id', subjectId)
    .order('created_at');
  return data || [];
}

// Admin-page tree fetch: every class with its subjects, small catalog-sized dataset.
export async function getClassLibraryAdminTree() {
  const supabase = (await createClient()) as any;
  const { data: classes } = await supabase
    .from('class_library_classes')
    .select('id, slug, name, is_active, sort_order')
    .order('sort_order')
    .order('name');
  const { data: subjects } = await supabase
    .from('class_library_subjects')
    .select('id, class_id, name, is_active, sort_order')
    .order('sort_order')
    .order('name');

  return (classes || []).map((klass: any) => ({
    ...klass,
    subjects: (subjects || []).filter((subject: any) => subject.class_id === klass.id),
  }));
}
