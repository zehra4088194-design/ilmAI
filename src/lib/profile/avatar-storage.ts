import type { SupabaseClient } from '@supabase/supabase-js';

// User-uploaded profile picture — shown across the app (chat, doubts board, leaderboard, parent
// dashboard, etc. via profiles.avatar_url). Mirrors src/lib/school-erp/storage.ts's pattern:
// public bucket, writes scoped to the caller's own folder, RLS enforced in
// supabase/migrations/20260829110000_user_avatar_upload_storage.sql.
export const USER_AVATAR_BUCKET = 'user-avatars';

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

function safeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-100);
}

export async function uploadUserAvatar(supabase: SupabaseClient, userId: string, file: File): Promise<string> {
  if (file.size > MAX_AVATAR_BYTES) {
    throw new Error('Profile picture must be smaller than 4MB.');
  }
  const path = `${userId}/${Date.now()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage.from(USER_AVATAR_BUCKET).upload(path, file, {
    upsert: true,
    cacheControl: '3600',
  });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from(USER_AVATAR_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Best-effort cleanup of the previous avatar file — failures never block the new upload. */
export async function tryDeletePreviousAvatar(supabase: SupabaseClient, publicUrl: string | null | undefined) {
  if (!publicUrl) return;
  try {
    const marker = `/object/public/${USER_AVATAR_BUCKET}/`;
    const idx = publicUrl.indexOf(marker);
    if (idx === -1) return;
    const path = decodeURIComponent(publicUrl.slice(idx + marker.length));
    await supabase.storage.from(USER_AVATAR_BUCKET).remove([path]);
  } catch {
    // Non-fatal — an orphaned file is preferable to blocking the user's action.
  }
}
