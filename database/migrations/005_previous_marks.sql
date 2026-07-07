-- ============================================
-- MIGRATION 005: Optional previous-class marks at signup (per subject),
-- used to seed weak-subject focus notifications. Reuses the existing
-- `notifications` table (see 001_initial_schema.sql) — no new
-- notifications table needed, the schema (user_id, type, title, message,
-- icon_url, link, is_read, created_at) already covers what we need.
-- ============================================

-- 1. Previous class marks — optional, per subject, entered once at signup.
create table if not exists public.previous_marks (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  marks_obtained numeric(6,2) not null,
  marks_total numeric(6,2) not null default 100,
  created_at timestamptz not null default now(),
  unique (student_id, subject_id)
);
create index idx_previous_marks_student on public.previous_marks(student_id);

alter table public.previous_marks enable row level security;

create policy "Students manage their own previous marks"
  on public.previous_marks for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

create policy "Linked parents can view previous marks"
  on public.previous_marks for select
  using (
    exists (
      select 1 from public.parent_student_links l
      where l.student_id = previous_marks.student_id
      and l.parent_id = auth.uid() and l.status = 'approved'
    )
  );

-- 2. Notifications was missing an INSERT policy (only select/update existed
-- in 001_rls_policies.sql). Without this, any user-context client insert —
-- including the existing /api/parent/generate-invite route AND the new
-- weak-subject notification logic below — would silently fail under RLS.
create policy "Users can insert own notifications"
  on public.notifications for insert
  with check (auth.uid() = user_id);
