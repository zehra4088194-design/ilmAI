import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CollegeJoinRequestWithStudent,
  CollegeLecture,
  CollegeResource,
  CollegeResourceMetadata,
  CollegeWithAdmin,
  CollegeWithCounts,
  PublicCollege,
  StudentCollegeState,
} from './types';

// Only these columns are ever selected for public/anonymous-facing queries —
// this is how the spec's "public column subset" is actually enforced (see
// the RLS comment in the migration for why this isn't done via RLS).
const PUBLIC_COLUMNS = 'id, name, slug, city, logo_url, cover_url, description, is_active';

export async function getActiveColleges(supabase: SupabaseClient, search?: string): Promise<PublicCollege[]> {
  const db = supabase as any;
  let query = db.from('colleges').select(PUBLIC_COLUMNS).eq('is_active', true).order('name');

  if (search && search.trim()) {
    const term = search.trim().replace(/[%_]/g, '');
    query = query.or(`name.ilike.%${term}%,city.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return (data as PublicCollege[] | null) ?? [];
}

export async function getCollegeBySlug(supabase: SupabaseClient, slug: string): Promise<PublicCollege | null> {
  const db = supabase as any;
  const { data } = await db
    .from('colleges')
    .select(PUBLIC_COLUMNS)
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle();
  return (data as PublicCollege | null) ?? null;
}

export async function getCollegeCounts(supabase: SupabaseClient, collegeId: string) {
  const db = supabase as any;
  const [{ count: lectureCount }, { count: resourceCount }] = await Promise.all([
    db.from('college_lectures').select('id', { count: 'exact', head: true }).eq('college_id', collegeId),
    db.from('college_resources').select('id', { count: 'exact', head: true }).eq('college_id', collegeId),
  ]);
  return { lectures: lectureCount ?? 0, resources: resourceCount ?? 0 };
}

export async function getCollegeWithCounts(supabase: SupabaseClient, slug: string): Promise<CollegeWithCounts | null> {
  const college = await getCollegeBySlug(supabase, slug);
  if (!college) return null;
  const counts = await getCollegeCounts(supabase, college.id);
  return { ...college, lecture_count: counts.lectures, resource_count: counts.resources };
}

/**
 * Determines the current student's College Portal state:
 *  - profiles.college_id is set -> "approved"
 *  - a pending join request exists -> "pending"
 *  - neither -> "none"
 */
export async function getStudentCollegeState(supabase: SupabaseClient, userId: string): Promise<StudentCollegeState> {
  const db = supabase as any;
  const { data: profile } = await db.from('profiles').select('college_id').eq('id', userId).maybeSingle();

  if (profile?.college_id) {
    const { data: college } = await db
      .from('colleges')
      .select('id, name, slug')
      .eq('id', profile.college_id)
      .maybeSingle();
    if (college) {
      return { state: 'approved', collegeId: college.id, collegeName: college.name, collegeSlug: college.slug };
    }
  }

  const { data: pending } = await db
    .from('college_join_requests')
    .select('id, college_id, colleges ( name )')
    .eq('student_id', userId)
    .eq('status', 'pending')
    .maybeSingle();

  if (pending) {
    const collegeRel = pending.colleges as unknown as { name: string } | { name: string }[] | null;
    const collegeName = Array.isArray(collegeRel) ? collegeRel[0]?.name : collegeRel?.name;
    return {
      state: 'pending',
      collegeId: pending.college_id as string,
      collegeName: collegeName ?? '',
      requestId: pending.id as string,
    };
  }

  return { state: 'none' };
}

export async function getPendingJoinRequests(
  supabase: SupabaseClient,
  collegeId: string
): Promise<CollegeJoinRequestWithStudent[]> {
  const db = supabase as any;
  // `student:profiles!college_join_requests_student_id_fkey` disambiguates
  // the embed — college_join_requests has two FKs into profiles
  // (student_id and resolved_by), so PostgREST needs the constraint name.
  const { data, error } = await db
    .from('college_join_requests')
    .select(
      'id, student_id, college_id, status, requested_at, resolved_at, resolved_by, student:profiles!college_join_requests_student_id_fkey ( id, full_name, email, avatar_url )'
    )
    .eq('college_id', collegeId)
    .eq('status', 'pending')
    .order('requested_at', { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CollegeJoinRequestWithStudent[];
}

export async function getApprovedStudents(supabase: SupabaseClient, collegeId: string) {
  const db = supabase as any;
  const { data, error } = await db
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('college_id', collegeId)
    .order('full_name');
  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getCollegeLectures(supabase: SupabaseClient, collegeId: string): Promise<CollegeLecture[]> {
  const db = supabase as any;
  const { data, error } = await db
    .from('college_lectures')
    .select('*')
    .eq('college_id', collegeId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as CollegeLecture[] | null) ?? [];
}

export async function getCollegeResources(supabase: SupabaseClient, collegeId: string): Promise<CollegeResource[]> {
  const db = supabase as any;
  const { data, error } = await db
    .from('college_resources')
    .select('*')
    .eq('college_id', collegeId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as CollegeResource[] | null) ?? [];
}

export async function getCollegeResourceMetadata(
  supabase: SupabaseClient,
  collegeId: string
): Promise<CollegeResourceMetadata[]> {
  const db = supabase as any;
  const { data, error } = await db
    .from('college_resources')
    .select(
      'id, college_id, title, resource_type, stream, degree_name, course_name, semester, chapter_title, file_url, light_file_url, dark_file_url, created_at'
    )
    .eq('college_id', collegeId)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data as CollegeResourceMetadata[] | null) ?? [];
}

export async function getAllCollegesForSuperAdmin(supabase: SupabaseClient): Promise<CollegeWithAdmin[]> {
  const db = supabase as any;
  // `profiles!college_admins_profile_id_fkey` disambiguates — college_admins
  // has two FKs into profiles (profile_id and assigned_by).
  const { data, error } = await db
    .from('colleges')
    .select('*, college_admins ( profile_id, profiles!college_admins_profile_id_fkey ( id, full_name, email ) )')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  return (data ?? []).map((row: Record<string, unknown>) => {
    const adminLinkRaw = row.college_admins as unknown;
    const adminLink = Array.isArray(adminLinkRaw) ? adminLinkRaw[0] : adminLinkRaw;
    const adminProfileRaw = (adminLink as { profiles?: unknown } | undefined)?.profiles;
    const adminProfile = Array.isArray(adminProfileRaw) ? adminProfileRaw[0] : adminProfileRaw;
    const { college_admins: _drop, ...college } = row;
    return { ...(college as unknown as CollegeWithAdmin), admin: (adminProfile as CollegeWithAdmin['admin']) ?? null };
  });
}

export async function getCollegeById(supabase: SupabaseClient, id: string) {
  const db = supabase as any;
  const { data } = await db.from('colleges').select('*').eq('id', id).maybeSingle();
  return data;
}
