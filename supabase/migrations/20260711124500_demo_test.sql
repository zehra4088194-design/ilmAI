alter table public.questions
  add column if not exists is_demo_eligible boolean not null default false;

create index if not exists idx_questions_demo_eligible
  on public.questions(is_demo_eligible)
  where is_demo_eligible = true;

create table if not exists public.demo_attempts (
  id uuid primary key default uuid_generate_v4(),
  session_token text not null,
  subject_id uuid references public.subjects(id),
  question_ids uuid[] not null,
  answers jsonb not null default '{}',
  score numeric,
  correct_count integer,
  total_count integer,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  converted_to_user_id uuid references public.profiles(id),
  ip_hash text
);

create index if not exists idx_demo_attempts_session_token
  on public.demo_attempts(session_token);

create index if not exists idx_demo_attempts_ip_started_at
  on public.demo_attempts(ip_hash, started_at);

alter table public.demo_attempts enable row level security;

drop policy if exists "Service role manages demo attempts" on public.demo_attempts;
create policy "Service role manages demo attempts"
  on public.demo_attempts
  for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');
