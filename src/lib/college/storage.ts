import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * ASSUMPTION: this module expects three public Storage buckets to already
 * exist in the Supabase project (create them once from the Supabase
 * dashboard or CLI — this migration does not create buckets):
 *   - college-logos      (college logo images)
 *   - college-covers     (college cover images)
 *   - college-resources  (student-facing files: notes, past papers, slides…)
 * If the project already has a shared uploads bucket / convention, just
 * change the three constants below — every caller keeps working unmodified.
 */
export const COLLEGE_LOGO_BUCKET = "college-logos";
export const COLLEGE_COVER_BUCKET = "college-covers";
export const COLLEGE_RESOURCE_BUCKET = "college-resources";

const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB
const MAX_RESOURCE_BYTES = 25 * 1024 * 1024; // 25MB

function assertFileSize(file: File, maxBytes: number, label: string) {
  if (file.size > maxBytes) {
    throw new Error(`${label} must be smaller than ${Math.round(maxBytes / (1024 * 1024))}MB.`);
  }
}

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-100);
}

export async function uploadCollegeImage(
  supabase: SupabaseClient,
  bucket: typeof COLLEGE_LOGO_BUCKET | typeof COLLEGE_COVER_BUCKET,
  collegeId: string,
  file: File
): Promise<string> {
  assertFileSize(file, MAX_IMAGE_BYTES, "Image");
  const path = `${collegeId}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    upsert: true,
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadCollegeResourceFile(
  supabase: SupabaseClient,
  collegeId: string,
  file: File
): Promise<string> {
  assertFileSize(file, MAX_RESOURCE_BYTES, "File");
  const path = `${collegeId}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(COLLEGE_RESOURCE_BUCKET).upload(path, file, {
    upsert: false,
    cacheControl: "3600",
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(COLLEGE_RESOURCE_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Best-effort cleanup — failures are swallowed so a storage hiccup never blocks a DB delete. */
export async function tryDeleteCollegeStorageObject(
  supabase: SupabaseClient,
  bucket: string,
  publicUrl: string
) {
  try {
    const marker = `/object/public/${bucket}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
    await supabase.storage.from(bucket).remove([path]);
  } catch {
    // Non-fatal — an orphaned file is preferable to blocking the user's action.
  }
}
