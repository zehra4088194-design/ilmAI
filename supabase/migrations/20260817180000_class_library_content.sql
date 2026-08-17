-- Class Library — platform-wide (not tenant-scoped) content system for Class 1
-- upward, same dynamic/admin-curated pattern as university_hub
-- (20260817150000_university_hub_content.sql): admin adds a class/subject/
-- resource/MCQ here and it shows up immediately for every student, no deploy
-- needed. One level flatter than University Hub (Class is the top level directly
-- — no "program years" nesting, since a class isn't a multi-year program).

create table if not exists public.class_library_classes (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_library_subjects (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.class_library_classes(id) on delete cascade,
  name text not null,
  icon_key text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.class_library_subject_resources (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.class_library_subjects(id) on delete cascade,
  resource_type text not null check (
    resource_type in ('book', 'past_paper', 'topic_notes', 'video_lecture', 'practical_guide', 'recent_past_paper', 'result')
  ),
  title text not null,
  url text,
  sort_order integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.class_library_questions (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid not null references public.class_library_subjects(id) on delete cascade,
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

create index if not exists idx_class_library_subjects_class on public.class_library_subjects (class_id);
create index if not exists idx_class_library_subject_resources_subject on public.class_library_subject_resources (subject_id, resource_type);
create index if not exists idx_class_library_questions_subject on public.class_library_questions (subject_id);

alter table public.class_library_classes enable row level security;
alter table public.class_library_subjects enable row level security;
alter table public.class_library_subject_resources enable row level security;
alter table public.class_library_questions enable row level security;

create policy "Class library classes are viewable by everyone" on public.class_library_classes
  for select using (true);
create policy "Class library subjects are viewable by everyone" on public.class_library_subjects
  for select using (true);
create policy "Class library subject resources are viewable by everyone" on public.class_library_subject_resources
  for select using (true);
create policy "Class library questions are viewable by everyone" on public.class_library_questions
  for select using (true);
