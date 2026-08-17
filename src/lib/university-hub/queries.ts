import { createClient } from '@/lib/supabase/server';

// Read-only helpers for University Hub. Uses the regular (RLS-scoped) client, not
// the admin one — university_* tables grant SELECT to everyone, so any signed-in
// user can read through these without a service-role client.

export async function getUniversityPrograms() {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from('university_degree_programs')
    .select('id, slug, name, stream, total_years, is_active')
    .eq('is_active', true)
    .order('sort_order')
    .order('name');
  return data || [];
}

export async function getUniversityProgramBySlug(slug: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from('university_degree_programs')
    .select('id, slug, name, stream, total_years, is_active')
    .eq('slug', slug)
    .maybeSingle();
  return data || null;
}

export async function getUniversityProgramYears(programId: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from('university_program_years')
    .select('id, program_id, year_number, label, sort_order')
    .eq('program_id', programId)
    .order('sort_order')
    .order('year_number');
  return data || [];
}

export async function getUniversitySubjects(programYearId: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from('university_subjects')
    .select('id, program_year_id, name, icon_key, is_active')
    .eq('program_year_id', programYearId)
    .eq('is_active', true)
    .order('sort_order')
    .order('name');
  return data || [];
}

export async function getUniversitySubjectById(subjectId: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from('university_subjects')
    .select('id, program_year_id, name, icon_key, is_active')
    .eq('id', subjectId)
    .maybeSingle();
  return data || null;
}

export async function getUniversitySubjectResources(subjectId: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from('university_subject_resources')
    .select('id, subject_id, resource_type, title, url, sort_order')
    .eq('subject_id', subjectId)
    .order('sort_order')
    .order('created_at');
  return data || [];
}

export async function getUniversityQuestions(subjectId: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from('university_questions')
    .select('id, subject_id, text, options, correct_answer, explanation, difficulty, marks')
    .eq('subject_id', subjectId)
    .order('created_at');
  return data || [];
}

// Admin-page tree fetch: every program with its years and subjects, one round
// trip per level (small dataset — programs/years/subjects are catalog-sized, not
// per-user data) rather than N+1 per program.
export async function getUniversityAdminTree() {
  const supabase = (await createClient()) as any;
  const { data: programs } = await supabase
    .from('university_degree_programs')
    .select('id, slug, name, stream, total_years, is_active, sort_order')
    .order('sort_order')
    .order('name');
  const { data: years } = await supabase
    .from('university_program_years')
    .select('id, program_id, year_number, label, sort_order')
    .order('sort_order');
  const { data: subjects } = await supabase
    .from('university_subjects')
    .select('id, program_year_id, name, is_active, sort_order')
    .order('sort_order')
    .order('name');

  return (programs || []).map((program: any) => ({
    ...program,
    years: (years || [])
      .filter((year: any) => year.program_id === program.id)
      .map((year: any) => ({
        ...year,
        subjects: (subjects || []).filter((subject: any) => subject.program_year_id === year.id),
      })),
  }));
}
