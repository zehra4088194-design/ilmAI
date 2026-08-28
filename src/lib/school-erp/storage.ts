import type { SupabaseClient } from '@supabase/supabase-js';

// Mirrors src/lib/college/storage.ts's uploadCollegeImage — see
// supabase/migrations/20260812094500_school_college_logo_branding.sql for the bucket + RLS.
export const SCHOOL_LOGO_BUCKET = 'school-logos';

const MAX_LOGO_BYTES = 4 * 1024 * 1024;

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
}

export async function uploadSchoolLogo(supabase: SupabaseClient, organizationId: string, file: File): Promise<string> {
  if (file.size > MAX_LOGO_BYTES) {
    throw new Error('Logo must be smaller than 4MB.');
  }
  const path = `${organizationId}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(SCHOOL_LOGO_BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(SCHOOL_LOGO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

// See supabase/migrations/20260823140000_school_admissions_identity_fields.sql for the bucket + RLS.
export const SCHOOL_STUDENT_PHOTO_BUCKET = 'school-student-photos';
const MAX_STUDENT_PHOTO_BYTES = 4 * 1024 * 1024;

export async function uploadStudentPhoto(supabase: SupabaseClient, organizationId: string, file: File): Promise<string> {
  if (file.size > MAX_STUDENT_PHOTO_BYTES) {
    throw new Error('Photo must be smaller than 4MB.');
  }
  const path = `${organizationId}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(SCHOOL_STUDENT_PHOTO_BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(SCHOOL_STUDENT_PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
