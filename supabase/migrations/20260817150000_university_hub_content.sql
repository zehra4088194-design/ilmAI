-- University Hub content system. Deliberately platform-wide (no organization_id /
-- tenant scoping) — unlike school_erp/college_erp, this is shared study content for
-- every university student on the platform, admin-curated and dynamically extensible
-- (add a program, it shows up; no code deploy needed). Mirrors the read-only content
-- pattern already used by public.questions: RLS allows anyone to SELECT, and all
-- writes go through server actions using the service-role admin client (see
-- requireAdminUser() + createAdminClient() in every other /admin/* action in this
-- codebase) rather than an authenticated-role RLS write policy.
--
-- Long/short subjective questions are NOT stored here — they're generated and graded
-- on demand through the existing /api/ai/practice-questions + /api/ai/grade-answer
-- pipeline (same one AiPracticeHub already uses for school/college subjects), scoped
-- by program + subject name instead of a stored question bank.

create table if not exists public.university_degree_programs (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  stream text,
  total_years integer not null default 4 check (total_years > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.university_program_years (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.university_degree_programs(id) on delete cascade,
  year_number integer not null check (year_number > 0),
  label text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (program_id, year_number)
);

create table if not exists public.university_subjects (
  id uuid primary key default gen_random_uuid(),
  program_year_id uuid not null references public.university_program_years(id) on delete cascade,
  name text not null,
  icon_key text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.university_subject_resources (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.university_subjects(id) on delete cascade,
  resource_type text not null check (
    resource_type in ('book', 'past_paper', 'topic_notes', 'video_lecture', 'practical_guide', 'recent_past_paper', 'result')
  ),
  title text not null,
  url text,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.university_questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.university_subjects(id) on delete cascade,
  text text not null,
  options jsonb not null default '[]'::jsonb,
  correct_answer jsonb not null,
  explanation text,
  difficulty text not null default 'MEDIUM' check (difficulty in ('EASY', 'MEDIUM', 'HARD')),
  marks integer not null default 1,
  is_verified boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_university_program_years_program on public.university_program_years (program_id);
create index if not exists idx_university_subjects_program_year on public.university_subjects (program_year_id);
create index if not exists idx_university_subject_resources_subject on public.university_subject_resources (subject_id, resource_type);
create index if not exists idx_university_questions_subject on public.university_questions (subject_id);

alter table public.university_degree_programs enable row level security;
alter table public.university_program_years enable row level security;
alter table public.university_subjects enable row level security;
alter table public.university_subject_resources enable row level security;
alter table public.university_questions enable row level security;

create policy "University programs are viewable by everyone" on public.university_degree_programs
  for select using (true);
create policy "University program years are viewable by everyone" on public.university_program_years
  for select using (true);
create policy "University subjects are viewable by everyone" on public.university_subjects
  for select using (true);
create policy "University subject resources are viewable by everyone" on public.university_subject_resources
  for select using (true);
create policy "University questions are viewable by everyone" on public.university_questions
  for select using (true);
