create table if not exists public.university_work_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tool text not null check (tool in ('essay', 'assignment', 'presentation', 'viva', 'research', 'planner')),
  title text not null,
  input_json jsonb not null default '{}',
  result_json jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.university_work_history enable row level security;

drop policy if exists "students manage own university work" on public.university_work_history;
create policy "students manage own university work" on public.university_work_history
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create index if not exists idx_university_work_history_user_tool_created
  on public.university_work_history(user_id, tool, created_at desc);
