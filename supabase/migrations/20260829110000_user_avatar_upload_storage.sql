-- Self-service profile picture upload. `profiles.avatar_url` already exists and is populated by
-- Google/Facebook OAuth signup (see src/app/api/auth/callback/route.ts), but there was no way for
-- a user — students in particular — to set/replace it themselves. Mirrors school-logos' bucket +
-- RLS pattern (public read, writes scoped to the caller's own folder) — see
-- 20260812094500_school_college_logo_branding.sql — except the "owner" here is just the
-- authenticated user themselves (folder name = auth.uid()), not an org-role check.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('user-avatars', 'user-avatars', true, 4194304, array['image/png','image/jpeg','image/webp','image/gif'])
on conflict (id) do update
set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "users upload own avatar" on storage.objects;
create policy "users upload own avatar"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users replace own avatar" on storage.objects;
create policy "users replace own avatar"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "users delete own avatar" on storage.objects;
create policy "users delete own avatar"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "public read user avatars" on storage.objects;
create policy "public read user avatars"
  on storage.objects for select
  to public
  using (bucket_id = 'user-avatars');
