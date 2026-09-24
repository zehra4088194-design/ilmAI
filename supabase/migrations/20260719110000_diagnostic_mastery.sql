-- Short onboarding diagnostic and chapter-level mastery records.

create table if not exists public.diagnostic_attempts (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  question_ids uuid[] not null default '{}',
  answers jsonb not null default '{}'::jsonb,
  score numeric(5,2) not null default 0,
  completed_at timestamptz not null default now()
);

create table if not exists public.chapter_mastery (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  chapter_id uuid not null references public.chapters(id) on delete cascade,
  mastery numeric(5,2) not null default 0 check (mastery between 0 and 100),
  attempts integer not null default 0,
  last_attempt_at timestamptz not null default now(),
  unique (student_id, chapter_id)
);

create index if not exists diagnostic_attempts_student_idx on public.diagnostic_attempts(student_id, completed_at desc);
create index if not exists chapter_mastery_student_idx on public.chapter_mastery(student_id, mastery asc);

alter table public.diagnostic_attempts enable row level security;
alter table public.chapter_mastery enable row level security;

drop policy if exists "Students manage own diagnostic attempts" on public.diagnostic_attempts;
create policy "Students manage own diagnostic attempts" on public.diagnostic_attempts
  for all to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());

drop policy if exists "Students manage own chapter mastery" on public.chapter_mastery;
create policy "Students manage own chapter mastery" on public.chapter_mastery
  for all to authenticated using (student_id = auth.uid()) with check (student_id = auth.uid());
