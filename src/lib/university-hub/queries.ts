import { createClient } from '@/lib/supabase/server';
import { getR2SignedUrl, parseR2Uri } from '@/lib/storage/r2';

// Read-only helpers for University Hub. Uses the regular (RLS-scoped) client, not
// the admin one — university_* tables grant SELECT to everyone, so any signed-in
// user can read through these without a service-role client.

// A resource's stored `url` is either a plain external link (Drive, YouTube,
// a direct PDF URL — opened as-is, unchanged) or an `r2://<bucket>/<key>` URI
// pointing at a file an admin uploaded to object storage (the University Hub
// bucket, ilmai-uni-bucket, included — see r2.ts). Browsers can't fetch an
// r2:// URI directly, so it's swapped here for a short-lived signed HTTPS URL
// before the page ever renders a link — same idea as f71f4bd's "never link
// raw r2:// URIs to users" fix elsewhere in the app.
export async function resolveUniversityResourceUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  const parsed = parseR2Uri(url);
  if (!parsed) return url;
  try {
    return await getR2SignedUrl(parsed.key, undefined, parsed.bucket);
  } catch {
    return null;
  }
}

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

// Subjects for a program-year now come through the university_program_year_subjects
// link table (a subject is a shared pool entry — see types.ts) instead of a scalar
// program_year_id column. `!inner` drops any link row whose subject was deactivated;
// { foreignTable } lets the sort keep subject.name as the tiebreaker exactly like the
// old direct query did.
export async function getUniversitySubjects(programYearId: string) {
  const supabase = (await createClient()) as any;
  const { data } = await supabase
    .from('university_program_year_subjects')
    .select('sort_order, subject:university_subjects!inner(id, name, icon_key, is_active)')
    .eq('program_year_id', programYearId)
    .eq('subject.is_active', true)
    .order('sort_order')
    .order('name', { foreignTable: 'university_subjects' });
  return (data || []).map((row: any) => row.subject);
}

// `programYearId`, when given, also verifies the subject is actually linked to that
// year (via the pool link table) — replaces the old `subject.program_year_id !==
// yearId` check every university-hub page used to do inline.
export async function getUniversitySubjectById(subjectId: string, programYearId?: string) {
  const supabase = (await createClient()) as any;
  const { data: subject } = await supabase
    .from('university_subjects')
    .select('id, name, icon_key, is_active')
    .eq('id', subjectId)
    .maybeSingle();
  if (!subject) return null;
  if (programYearId) {
    const { data: link } = await supabase
      .from('university_program_year_subjects')
      .select('id')
      .eq('subject_id', subjectId)
      .eq('program_year_id', programYearId)
      .maybeSingle();
    if (!link) return null;
  }
  return subject;
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

// Coverage stats for the admin overview — mirrors getClassLibraryAdminStats()
// exactly (same shape, same reasoning: two count-only aggregate queries instead
// of N+1 per subject) so a resource-type gap is visible without opening every
// subject page.
export type UniversitySubjectStats = {
  resourceCounts: Partial<Record<import('./types').UniversityResourceType, number>>;
  totalResources: number;
  questionCount: number;
};

export async function getUniversityAdminStats(): Promise<Record<string, UniversitySubjectStats>> {
  const supabase = (await createClient()) as any;
  const [{ data: resources }, { data: questions }] = await Promise.all([
    supabase.from('university_subject_resources').select('subject_id, resource_type'),
    supabase.from('university_questions').select('subject_id'),
  ]);

  const stats: Record<string, UniversitySubjectStats> = {};
  const ensure = (subjectId: string) =>
    (stats[subjectId] ||= { resourceCounts: {}, totalResources: 0, questionCount: 0 });

  for (const row of resources || []) {
    const entry = ensure(row.subject_id);
    entry.resourceCounts[row.resource_type as import('./types').UniversityResourceType] =
      (entry.resourceCounts[row.resource_type as import('./types').UniversityResourceType] || 0) + 1;
    entry.totalResources += 1;
  }
  for (const row of questions || []) {
    ensure(row.subject_id).questionCount += 1;
  }

  return stats;
}

// Admin-page tree fetch: every program with its years and subjects, one round
// trip per level (small dataset — programs/years/subjects are catalog-sized, not
// per-user data) rather than N+1 per program. Subject links now come through the
// pool join table (see getUniversitySubjects above) — the same subject row can
// appear under several years/programs here, which is the point.
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
  const { data: links } = await supabase
    .from('university_program_year_subjects')
    .select('program_year_id, sort_order, subject:university_subjects(id, name, is_active, sort_order)')
    .order('sort_order');
  const activeLinks = (links || []).filter((link: any) => link.subject && link.subject.is_active !== false);

  return (programs || []).map((program: any) => ({
    ...program,
    years: (years || [])
      .filter((year: any) => year.program_id === program.id)
      .map((year: any) => ({
        ...year,
        subjects: activeLinks.filter((link: any) => link.program_year_id === year.id).map((link: any) => link.subject),
      })),
  }));
}
