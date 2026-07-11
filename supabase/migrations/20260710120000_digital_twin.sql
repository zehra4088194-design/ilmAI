create table if not exists public.student_digital_twin (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null unique references public.profiles(id) on delete cascade,
  learning_style text check (learning_style in ('visual','auditory','reading','kinesthetic') or learning_style is null),
  strengths jsonb not null default '{}',
  weaknesses jsonb not null default '{}',
  avg_solve_speed_seconds numeric,
  attention_span_minutes numeric,
  preferred_study_time text check (preferred_study_time in ('morning','afternoon','evening','night') or preferred_study_time is null),
  confidence_level numeric not null default 50 check (confidence_level between 0 and 100),
  predicted_exam_score numeric,
  last_recomputed_at timestamptz,
  signal_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_digital_twin_history (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  confidence_level numeric not null check (confidence_level between 0 and 100),
  predicted_exam_score numeric,
  strengths jsonb not null default '{}',
  weaknesses jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.student_digital_twin enable row level security;
alter table public.student_digital_twin_history enable row level security;

drop policy if exists "student reads own twin" on public.student_digital_twin;
create policy "student reads own twin" on public.student_digital_twin
  for select using (auth.uid() = student_id);

drop policy if exists "student reads own twin history" on public.student_digital_twin_history;
create policy "student reads own twin history" on public.student_digital_twin_history
  for select using (auth.uid() = student_id);

create index if not exists idx_student_digital_twin_history_student_created
  on public.student_digital_twin_history(student_id, created_at desc);
