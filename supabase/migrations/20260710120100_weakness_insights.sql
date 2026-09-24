create table if not exists public.ai_insight_cache (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  insight_type text not null check (insight_type in ('daily_plan','weekly_plan','monthly_roadmap')),
  content jsonb not null,
  generated_at timestamptz not null default now(),
  valid_until timestamptz not null,
  unique(student_id, insight_type)
);

alter table public.ai_insight_cache enable row level security;

drop policy if exists "student reads own insights" on public.ai_insight_cache;
create policy "student reads own insights" on public.ai_insight_cache
  for select using (auth.uid() = student_id);
