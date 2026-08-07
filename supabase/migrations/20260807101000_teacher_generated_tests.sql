-- Teacher Test Studio persistence: stores each generated paper (config + a
-- full snapshot of the chosen questions) so teachers can reopen, reprint, or
-- regenerate their past papers. Additive only — no existing table changes.

create table if not exists public.teacher_generated_tests (
  id uuid primary key default gen_random_uuid(),
  created_by uuid not null references public.profiles(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  grade_level text,
  title text not null default 'Chapter Assessment',
  institution_name text,
  theme text not null default 'classic' check (theme in ('classic', 'modern', 'minimal')),
  difficulty text check (difficulty in ('EASY', 'MEDIUM', 'HARD', 'EXPERT', 'MIXED')),
  mcq_count integer not null default 0 check (mcq_count >= 0),
  short_count integer not null default 0 check (short_count >= 0),
  long_count integer not null default 0 check (long_count >= 0),
  total_marks integer not null default 0,
  duration_minutes integer not null default 45,
  include_answer_key boolean not null default true,
  plan_tier text not null default 'FREE' check (plan_tier in ('FREE', 'PRO', 'ELITE')),
  custom_header text,
  custom_watermark_text text,
  custom_watermark_image_url text,
  hide_platform_branding boolean not null default false,
  school_class text,
  paper_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists teacher_generated_tests_teacher_idx
  on public.teacher_generated_tests (created_by, created_at desc);

create index if not exists teacher_generated_tests_chapter_idx
  on public.teacher_generated_tests (subject_id, chapter_id);

create table if not exists public.teacher_generated_test_items (
  id uuid primary key default gen_random_uuid(),
  test_id uuid not null references public.teacher_generated_tests(id) on delete cascade,
  question_id uuid references public.questions(id) on delete set null,
  section text not null check (section in ('MCQ', 'SHORT', 'LONG')),
  position integer not null default 0,
  marks integer not null default 1,
  question_snapshot jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists teacher_generated_test_items_test_idx
  on public.teacher_generated_test_items (test_id, section, position);

alter table public.teacher_generated_tests enable row level security;
alter table public.teacher_generated_test_items enable row level security;

drop policy if exists "teachers manage their own generated tests" on public.teacher_generated_tests;
create policy "teachers manage their own generated tests"
  on public.teacher_generated_tests for all
  using (
    auth.uid() = created_by
    or exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  )
  with check (auth.uid() = created_by);

drop policy if exists "teachers manage their own generated test items" on public.teacher_generated_test_items;
create policy "teachers manage their own generated test items"
  on public.teacher_generated_test_items for all
  using (
    exists (
      select 1 from public.teacher_generated_tests t
      where t.id = test_id
        and (t.created_by = auth.uid() or exists (
          select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
        ))
    )
  )
  with check (
    exists (
      select 1 from public.teacher_generated_tests t
      where t.id = test_id and t.created_by = auth.uid()
    )
  );
