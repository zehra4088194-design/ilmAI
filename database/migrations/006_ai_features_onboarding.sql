-- ============================================
-- MIGRATION 006: AI Onboarding State + Paper Checker
-- Adds: (1) personalized onboarding fields on profiles, (2) optional-subject
-- metadata on subjects (board-stream aware), (3) paper_checks history table
-- for Feature 2 (AI Subjective Paper Checker).
-- NOTE: there is a pre-existing filename collision — two different files
-- are both named "005_*.sql" (005_previous_marks.sql, 005_parent_attachments.sql).
-- This migration is deliberately numbered 006 so it doesn't add a third
-- collision; please resolve the 005 duplicate separately before `db push`.
-- ============================================

-- 1. Personalized onboarding fields on profiles.
-- is_profile_complete (existing) already gates board+grade at signup.
-- ai_onboarding_complete is a SEPARATE, later gate: it controls whether the
-- one-time AI-personalization modal (target marks, optional subjects,
-- previous roll number) has been completed. Kept distinct so we never
-- change the meaning of the existing is_profile_complete flag used
-- elsewhere in the app (register flow, dashboards, etc).
alter table public.profiles add column if not exists ai_onboarding_complete boolean not null default false;
alter table public.profiles add column if not exists target_marks_percentage numeric(5,2);
alter table public.profiles add column if not exists total_marks_percentage numeric(5,2); -- most recent overall % (student-entered, optional)
alter table public.profiles add column if not exists previous_roll_number text; -- only meaningful for GRADE_10/11/12 and above
alter table public.profiles add column if not exists optional_subject_ids uuid[] not null default '{}'; -- FKs into subjects, validated app-side (array can't easily FK in Postgres)

comment on column public.profiles.ai_onboarding_complete is 'Gates the one-time AI-personalization modal (marks/optional subjects/roll no), separate from is_profile_complete (board/grade at signup)';
comment on column public.profiles.optional_subject_ids is 'Student-chosen optional subjects (e.g. Biology vs Computer Science), validated against subjects.is_optional app-side';

-- 2. Optional-subject / stream metadata on subjects, so the onboarding UI can
-- group "pick your optional subjects" by board stream (pre-medical,
-- pre-engineering, computer-science, arts, commerce, etc).
alter table public.subjects add column if not exists is_optional boolean not null default false;
alter table public.subjects add column if not exists stream text; -- e.g. 'pre-medical' | 'pre-engineering' | 'computer-science' | 'arts' | 'commerce', null for compulsory subjects
create index if not exists idx_subjects_is_optional on public.subjects(is_optional);

-- Best-effort tagging of commonly-optional subjects where they already
-- exist (safe no-op if a slug isn't present yet). Admin can adjust/add more
-- via the admin panel or a follow-up UPDATE — this just seeds sane defaults
-- so the onboarding UI isn't empty on day one.
update public.subjects set is_optional = true, stream = 'pre-medical' where slug = 'biology';
update public.subjects set is_optional = true, stream = 'computer-science' where slug = 'computer-science';

-- 3. Paper Checker (BISE Board Exam Simulator) — grading history.
create table if not exists public.paper_checks (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  input_type text not null default 'text', -- 'text' | 'image'
  question_text text, -- optional, if the student also provided the question
  answer_text text, -- the student's typed answer, or OCR/vision-read text from the photo
  image_url text, -- storage path if a photo was uploaded (bucket: paper-checker-scans)
  marks_obtained numeric(5,2) not null,
  marks_total numeric(5,2) not null,
  missing_elements jsonb not null default '[]', -- e.g. ["Heading missing", "Diagram skip ki hai"]
  feedback text not null, -- Roman Urdu/English constructive feedback
  provider text not null default 'gemini',
  created_at timestamptz not null default now()
);
create index if not exists idx_paper_checks_student on public.paper_checks(student_id);
create index if not exists idx_paper_checks_subject on public.paper_checks(subject_id);

alter table public.paper_checks enable row level security;

create policy "Students manage their own paper checks"
  on public.paper_checks for all
  using (auth.uid() = student_id)
  with check (auth.uid() = student_id);

create policy "Linked parents can view paper checks"
  on public.paper_checks for select
  using (
    exists (
      select 1 from public.parent_student_links l
      where l.student_id = paper_checks.student_id
      and l.parent_id = auth.uid() and l.status = 'approved'
    )
  );

-- ============================================
-- MANUAL STEP (optional): if you want photo uploads for Feature 2 to be
-- stored (not just graded in-memory), create a private Storage bucket
-- named `paper-checker-scans` and add matching storage.objects policies,
-- mirroring the pattern documented in 005_parent_attachments.sql.
-- The API route works without this — image_url is left null if you skip it.
-- ============================================
