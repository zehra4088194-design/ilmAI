import type { SupabaseClient } from "@supabase/supabase-js";
import type { CollegeAdmin } from "./types";

/**
 * Matches the project's existing super-admin check (see
 * src/lib/supabase/middleware.ts and src/app/(admin)/layout.tsx): an
 * ADMIN_EMAILS env var, not a `profiles.role` value. Kept here as a single
 * source of truth so the College Portal's super-admin pages/actions use the
 * exact same rule as the rest of /admin.
 */
export function isSuperAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const adminEmails = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return adminEmails.includes(email.toLowerCase());
}

export async function getCollegeAdminAssignment(
  supabase: SupabaseClient,
  profileId: string
): Promise<CollegeAdmin | null> {
  const db = supabase as any;
  const { data } = await db
    .from("college_admins")
    .select("id, college_id, profile_id, assigned_by, created_at")
    .eq("profile_id", profileId)
    .maybeSingle();
  return (data as CollegeAdmin | null) ?? null;
}

/**
 * Fetches the college a signed-in college admin manages. Returns null when
 * the profile is not a college admin — callers (college-admin layout/pages)
 * should redirect in that case.
 */
export async function getCollegeAdminContext(supabase: SupabaseClient, userId: string) {
  const assignment = await getCollegeAdminAssignment(supabase, userId);
  if (!assignment) return null;
  const db = supabase as any;
  const { data: college } = await db
    .from("colleges")
    .select("id, name, slug, city, logo_url, cover_url, description, is_active, created_by, created_at")
    .eq("id", assignment.college_id)
    .maybeSingle();
  if (!college) return null;
  return { assignment, college };
}

export async function getApprovedCollegeId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const db = supabase as any;
  const { data } = await db.from("profiles").select("college_id").eq("id", userId).maybeSingle();
  return (data?.college_id as string | null) ?? null;
}
