"use server";

import { revalidatePath } from "next/cache";
import slugify from "slugify";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { isSuperAdminEmail } from "@/lib/college/access";
import { isValidEmail, isValidSlug } from "@/lib/college/validators";
import { COLLEGE_COVER_BUCKET, COLLEGE_LOGO_BUCKET, uploadCollegeImage } from "@/lib/college/storage";
import type { ActionResult } from "@/lib/college/types";

/**
 * Every mutation below uses the service-role client (bypasses RLS), gated by
 * this ADMIN_EMAILS check — the same pattern src/app/(admin)/layout.tsx and
 * src/lib/supabase/middleware.ts already use for the rest of /admin. This
 * matches how subjects/chapters/etc. are administered today (see
 * database/rls/001_rls_policies.sql: "admin write (handled via service role)").
 */
async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isSuperAdminEmail(user.email)) {
    return { admin: null, user: null, ok: false as const };
  }
  const admin = await createAdminClient();
  return { admin: admin as any, user, ok: true as const };
}

export async function createCollege(formData: FormData): Promise<ActionResult<{ id: string; slug: string }>> {
  const { admin, user, ok } = await requireSuperAdmin();
  if (!ok || !admin || !user) return { success: false, error: "Not authorized." };

  const name = String(formData.get("name") ?? "").trim();
  let slug = String(formData.get("slug") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const logoFile = formData.get("logo") as File | null;

  if (!name) return { success: false, error: "Name is required." };
  if (!slug) slug = slugify(name, { lower: true, strict: true });
  if (!isValidSlug(slug)) {
    return { success: false, error: "Slug can only contain lowercase letters, numbers and hyphens." };
  }

  const { data: inserted, error: insertError } = await admin
    .from("colleges")
    .insert({ name, slug, city: city || null, description: description || null, created_by: user.id })
    .select("id, slug")
    .single();

  if (insertError) {
    if (insertError.code === "23505") return { success: false, error: "That slug is already taken." };
    return { success: false, error: "Could not create the college. Please try again." };
  }

  if (logoFile && logoFile.size > 0) {
    try {
      const logoUrl = await uploadCollegeImage(admin, COLLEGE_LOGO_BUCKET, inserted.id, logoFile);
      await admin.from("colleges").update({ logo_url: logoUrl }).eq("id", inserted.id);
    } catch {
      // Non-fatal: the college was created; a logo can be added from the edit page.
    }
  }

  revalidatePath("/admin/colleges");
  return { success: true, data: inserted };
}

export async function updateCollege(collegeId: string, formData: FormData): Promise<ActionResult> {
  const { admin, ok } = await requireSuperAdmin();
  if (!ok || !admin) return { success: false, error: "Not authorized." };

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim();
  const city = String(formData.get("city") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const logoFile = formData.get("logo") as File | null;
  const coverFile = formData.get("cover") as File | null;

  if (!name) return { success: false, error: "Name is required." };
  if (!isValidSlug(slug)) {
    return { success: false, error: "Slug can only contain lowercase letters, numbers and hyphens." };
  }

  const update: Record<string, unknown> = { name, slug, city: city || null, description: description || null };

  try {
    if (logoFile && logoFile.size > 0) {
      update.logo_url = await uploadCollegeImage(admin, COLLEGE_LOGO_BUCKET, collegeId, logoFile);
    }
    if (coverFile && coverFile.size > 0) {
      update.cover_url = await uploadCollegeImage(admin, COLLEGE_COVER_BUCKET, collegeId, coverFile);
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Upload failed." };
  }

  const { error } = await admin.from("colleges").update(update).eq("id", collegeId);
  if (error) {
    if (error.code === "23505") return { success: false, error: "That slug is already taken." };
    return { success: false, error: "Could not save changes. Please try again." };
  }

  revalidatePath("/admin/colleges");
  revalidatePath(`/admin/colleges/${collegeId}`);
  revalidatePath("/colleges");
  return { success: true };
}

export async function toggleCollegeActive(collegeId: string, isActive: boolean): Promise<ActionResult> {
  const { admin, ok } = await requireSuperAdmin();
  if (!ok || !admin) return { success: false, error: "Not authorized." };

  const { error } = await admin.from("colleges").update({ is_active: isActive }).eq("id", collegeId);
  if (error) return { success: false, error: "Could not update the college. Please try again." };

  revalidatePath("/admin/colleges");
  revalidatePath(`/admin/colleges/${collegeId}`);
  revalidatePath("/colleges");
  return { success: true };
}

/**
 * "Assign/reassign" replaces any existing admin for this college (the
 * spec's schema only enforces one-college-per-admin via a unique
 * `profile_id`, not one-admin-per-college — this function enforces the
 * latter at the application layer, see MODULE_SUMMARY.md).
 */
export async function assignCollegeAdmin(collegeId: string, email: string): Promise<ActionResult> {
  const { admin, user, ok } = await requireSuperAdmin();
  if (!ok || !admin || !user) return { success: false, error: "Not authorized." };

  const trimmedEmail = email.trim();
  if (!isValidEmail(trimmedEmail)) return { success: false, error: "Enter a valid email address." };

  // profiles SELECT is already public in this project (see
  // database/rls/001_rls_policies.sql: "Profiles are viewable by everyone"),
  // so this lookup works fine on the regular client too — using `admin`
  // here just keeps this action self-contained to one client.
  const { data: profile } = await admin.from("profiles").select("id").eq("email", trimmedEmail).maybeSingle();

  if (!profile) {
    return { success: false, error: "No account found with that email." };
  }

  await admin.from("college_admins").delete().eq("college_id", collegeId);

  const { error } = await admin.from("college_admins").insert({
    college_id: collegeId,
    profile_id: profile.id,
    assigned_by: user.id,
  });

  if (error) {
    if (error.code === "23505") return { success: false, error: "That person already manages a different college." };
    return { success: false, error: "Could not assign this admin. Please try again." };
  }

  revalidatePath(`/admin/colleges/${collegeId}`);
  revalidatePath("/admin/colleges");
  return { success: true };
}

export async function removeCollegeAdmin(collegeId: string): Promise<ActionResult> {
  const { admin, ok } = await requireSuperAdmin();
  if (!ok || !admin) return { success: false, error: "Not authorized." };

  const { error } = await admin.from("college_admins").delete().eq("college_id", collegeId);
  if (error) return { success: false, error: "Could not remove the admin. Please try again." };

  revalidatePath(`/admin/colleges/${collegeId}`);
  revalidatePath("/admin/colleges");
  return { success: true };
}
