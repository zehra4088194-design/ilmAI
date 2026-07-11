const YOUTUBE_HOST_RE = /(^|\.)(youtube\.com|youtu\.be)$/i;
const DRIVE_HOST_RE = /(^|\.)drive\.google\.com$/i;

/**
 * Validates that a URL looks like a playable YouTube or embeddable Google
 * Drive link. This is a lightweight sanity check, not proof the video exists.
 */
export function isValidLectureVideoUrl(value: string): boolean {
  if (!value) return false;
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    return false;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return false;
  const host = url.hostname.replace(/^www\./, "");
  return YOUTUBE_HOST_RE.test(host) || DRIVE_HOST_RE.test(host);
}

export const LECTURE_VIDEO_URL_HINT =
  "Paste a YouTube (youtube.com / youtu.be) or Google Drive (drive.google.com) link.";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
  return SLUG_RE.test(slug) && slug.length >= 2 && slug.length <= 80;
}

export function isValidEmail(value: string): boolean {
  // Intentionally permissive — the real check is whether a `profiles` row
  // with this email exists (see assignCollegeAdmin in actions/super-admin.ts).
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}
