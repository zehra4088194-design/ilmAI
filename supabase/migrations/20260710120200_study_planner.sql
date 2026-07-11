create table if not exists public.study_plans (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  exam_date date,
  daily_available_hours numeric not null default 2,
  constraints jsonb not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.study_plan_sessions (
  id uuid primary key default uuid_generate_v4(),
  plan_id uuid not null references public.study_plans(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_date date not null,
  subject_id uuid references public.subjects(id),
  chapter_id uuid references public.chapters(id),
  session_type text not null check (session_type in ('study','revision','mock_test','break')),
  duration_minutes integer not null,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.study_plans enable row level security;
alter table public.study_plan_sessions enable row level security;

drop policy if exists "student manages own plans" on public.study_plans;
create policy "student manages own plans" on public.study_plans
  for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

drop policy if exists "student manages own sessions" on public.study_plan_sessions;
create policy "student manages own sessions" on public.study_plan_sessions
  for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

create index if not exists idx_plan_sessions_date on public.study_plan_sessions(student_id, session_date);
create index if not exists idx_study_plans_student_active on public.study_plans(student_id, is_active);
