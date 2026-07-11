"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient, createClient } from "@/lib/supabase/server";
import { getCollegeAdminAssignment } from "@/lib/college/access";
import { COLLEGE_COVER_BUCKET, COLLEGE_LOGO_BUCKET, uploadCollegeImage } from "@/lib/college/storage";
import type { ActionResult } from "@/lib/college/types";

/** name/description/logo/cover only — slug and is_active stay super-admin-only, per spec. */
export async function updateCollegeSettings(formData: FormData): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to sign in first." };

  const assignment = await getCollegeAdminAssignment(supabase, user.id);
  if (!assignment) return { success: false, error: "You do not manage a college." };

  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const logoFile = formData.get("logo") as File | null;
  const coverFile = formData.get("cover") as File | null;

  if (!name) return { success: false, error: "Name is required." };

  const update: Record<string, unknown> = { name, description: description || null };

  try {
    if (logoFile && logoFile.size > 0) {
      update.logo_url = await uploadCollegeImage(supabase, COLLEGE_LOGO_BUCKET, assignment.college_id, logoFile);
    }
    if (coverFile && coverFile.size > 0) {
      update.cover_url = await uploadCollegeImage(supabase, COLLEGE_COVER_BUCKET, assignment.college_id, coverFile);
    }
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Upload failed." };
  }

  // college_admins members do not have an authenticated UPDATE policy on
  // `colleges` (see the migration) — writes for this table are service-role
  // only, matching the rest of the app's admin-managed content tables.
  const admin = await createAdminClient();
  const db = admin as any;
  const { error } = await db.from("colleges").update(update).eq("id", assignment.college_id);
  if (error) return { success: false, error: "Could not save changes. Please try again." };

  revalidatePath("/college-admin/settings");
  revalidatePath("/college-admin");
  revalidatePath("/colleges");
  return { success: true };
}
