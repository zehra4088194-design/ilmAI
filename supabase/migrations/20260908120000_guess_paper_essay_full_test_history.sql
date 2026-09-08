-- Persist AI-generated guess papers, essays, and full tests for later reuse,
-- mirroring the existing public.presentations history pattern (per-user save
-- on generate, list + reopen via API routes).

create table public.guess_papers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  result_json jsonb not null,
  created_at timestamptz not null default now()
);
create index guess_papers_user_idx on public.guess_papers (user_id, created_at desc);
alter table public.guess_papers enable row level security;
create policy "Users manage their own guess papers" on public.guess_papers
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.essays (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  essay_text text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index essays_user_idx on public.essays (user_id, created_at desc);
alter table public.essays enable row level security;
create policy "Users manage their own essays" on public.essays
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create table public.full_tests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  paper_json jsonb not null,
  created_at timestamptz not null default now()
);
create index full_tests_user_idx on public.full_tests (user_id, created_at desc);
alter table public.full_tests enable row level security;
create policy "Users manage their own full tests" on public.full_tests
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
