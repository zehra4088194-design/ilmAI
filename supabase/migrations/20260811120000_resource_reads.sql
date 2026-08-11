-- ============================================
-- MIGRATION: resource_reads
-- Tracks when a student marks a library/past-paper/college-resource file as
-- "done reading" (manual button in ProtectedResourceReader). Powers the
-- dashboard "Continue Learning" / "Up next" cards and the post-read
-- "want to test yourself on this?" notification.
-- ============================================

create table if not exists public.resource_reads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  resource_kind text not null check (resource_kind in ('library','past-paper','college-resource')),
  resource_id uuid not null,
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid references public.chapters(id) on delete set null,
  completed boolean not null default false,
  completed_at timestamptz,
  notified_test_prompt boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, resource_kind, resource_id)
);

alter table public.resource_reads enable row level security;

create policy "users manage own resource reads" on public.resource_reads
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists resource_reads_user_updated_idx on public.resource_reads (user_id, updated_at desc);
