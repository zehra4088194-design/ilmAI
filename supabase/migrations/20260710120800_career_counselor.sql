create table if not exists public.career_profile_inputs (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null unique references public.profiles(id) on delete cascade,
  interests text[] not null default '{}',
  personality_traits jsonb not null default '{}',
  learning_style_override text,
  budget_range text check (budget_range in ('low','medium','high','flexible')),
  preferred_city text,
  preferred_university text,
  study_abroad_interest boolean not null default false,
  long_term_goal text,
  updated_at timestamptz not null default now()
);

create table if not exists public.career_recommendations (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  generated_at timestamptz not null default now(),
  valid_until timestamptz not null,
  recommended_careers jsonb not null,
  recommended_degrees jsonb not null,
  recommended_universities jsonb not null,
  merit_estimation jsonb,
  scholarships jsonb,
  roadmap jsonb not null
);

alter table public.career_profile_inputs enable row level security;
alter table public.career_recommendations enable row level security;

drop policy if exists "student manages own career inputs" on public.career_profile_inputs;
create policy "student manages own career inputs" on public.career_profile_inputs
  for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

drop policy if exists "student reads own recommendations" on public.career_recommendations;
create policy "student reads own recommendations" on public.career_recommendations
  for select using (auth.uid() = student_id);

create index if not exists idx_career_recommendations_student_valid
  on public.career_recommendations(student_id, valid_until desc);
