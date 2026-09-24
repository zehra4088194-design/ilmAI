create table if not exists public.parent_weekly_reports (
  id uuid primary key default uuid_generate_v4(),
  parent_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  week_start_date date not null,
  summary jsonb not null,
  ai_narrative text,
  suggested_actions jsonb,
  created_at timestamptz not null default now(),
  unique(parent_id, student_id, week_start_date)
);

alter table public.parent_weekly_reports enable row level security;

drop policy if exists "parent reads own reports" on public.parent_weekly_reports;
create policy "parent reads own reports" on public.parent_weekly_reports
  for select using (
    exists (
      select 1 from public.parent_student_links l
      where l.student_id = parent_weekly_reports.student_id
        and l.parent_id = parent_weekly_reports.parent_id
        and l.parent_id = auth.uid()
        and l.status = 'approved'
    )
  );

create index if not exists idx_parent_weekly_reports_parent_student_week
  on public.parent_weekly_reports(parent_id, student_id, week_start_date desc);
