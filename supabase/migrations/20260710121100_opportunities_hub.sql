create table if not exists public.opportunities (
  id uuid primary key default uuid_generate_v4(),
  title text not null,
  type text not null check (type in ('scholarship','competition','olympiad','hackathon','internship','research','admission','government')),
  organization text,
  description text,
  eligibility text,
  deadline date,
  external_url text,
  target_grade_levels grade_level[],
  target_boards text[],
  is_verified boolean not null default false,
  source text not null default 'admin',
  created_at timestamptz not null default now()
);

create table if not exists public.opportunity_bookmarks (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  opportunity_id uuid not null references public.opportunities(id) on delete cascade,
  reminder_date date,
  created_at timestamptz not null default now(),
  unique(student_id, opportunity_id)
);

alter table public.opportunities enable row level security;
alter table public.opportunity_bookmarks enable row level security;

drop policy if exists "public reads verified opportunities" on public.opportunities;
create policy "public reads verified opportunities" on public.opportunities
  for select using (is_verified = true);

drop policy if exists "admin manages opportunities" on public.opportunities;
create policy "admin manages opportunities" on public.opportunities
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "student manages own bookmarks" on public.opportunity_bookmarks;
create policy "student manages own bookmarks" on public.opportunity_bookmarks
  for all using (auth.uid() = student_id) with check (auth.uid() = student_id);

create index if not exists idx_opportunities_verified_deadline on public.opportunities(is_verified, deadline);
