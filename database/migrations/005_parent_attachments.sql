-- ============================================
-- MIGRATION 005: Parent <-> Student File Attachments
-- Lets a parent and their linked student share files with each other
-- (fee receipts, notes, homework photos, report cards, etc.) via
-- Supabase Storage. Mirrors the parent_messages pattern from 003.
-- ============================================

create table if not exists public.parent_attachments (
  id uuid primary key default gen_random_uuid(),
  link_id text not null references public.parent_student_links(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  file_url text not null,       -- storage object path inside the `parent-attachments` bucket, e.g. `<link_id>/<filename>`
  file_name text not null,      -- original filename, for display
  file_type text not null,      -- mime type, e.g. image/jpeg, application/pdf
  file_size_kb integer not null,
  caption text,
  created_at timestamptz not null default now()
);

create index idx_parent_attachments_link on public.parent_attachments(link_id);

alter table public.parent_attachments enable row level security;

create policy "Participants can view their attachments"
  on public.parent_attachments for select
  using (
    exists (
      select 1 from public.parent_student_links l
      where l.id = link_id and l.status = 'approved'
      and (l.parent_id = auth.uid() or l.student_id = auth.uid())
    )
  );

create policy "Participants can upload attachments"
  on public.parent_attachments for insert
  with check (
    sender_id = auth.uid() and exists (
      select 1 from public.parent_student_links l
      where l.id = link_id and l.status = 'approved'
      and (l.parent_id = auth.uid() or l.student_id = auth.uid())
    )
  );

-- ============================================
-- MANUAL STEP REQUIRED — this part cannot be done via SQL migration alone.
-- In the Supabase Dashboard:
--
-- 1. Storage -> New bucket -> name it exactly `parent-attachments` ->
--    leave "Public bucket" UNCHECKED (private). Set a 10MB file size
--    limit and allowed mime types (image/*, application/pdf) if you want
--    enforcement at the bucket level too (the API route already enforces
--    both).
--
-- 2. Storage -> Policies -> add these two policies on `storage.objects`
--    (we upload objects as `<link_id>/<filename>`, so the first path
--    segment — storage.foldername(name))[1] — is the link_id):
--
-- create policy "Parent/student can read own link files"
--   on storage.objects for select
--   using (
--     bucket_id = 'parent-attachments'
--     and exists (
--       select 1 from public.parent_student_links l
--       where l.id = (storage.foldername(name))[1]
--       and l.status = 'approved'
--       and (l.parent_id = auth.uid() or l.student_id = auth.uid())
--     )
--   );
--
-- create policy "Parent/student can upload to own link folder"
--   on storage.objects for insert
--   with check (
--     bucket_id = 'parent-attachments'
--     and exists (
--       select 1 from public.parent_student_links l
--       where l.id = (storage.foldername(name))[1]
--       and l.status = 'approved'
--       and (l.parent_id = auth.uid() or l.student_id = auth.uid())
--     )
--   );
-- ============================================
