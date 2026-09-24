-- Backfill migration: documents tables that already exist on the live database
-- (kids_activity_log, kids_stories, kids_gk_facts, kids_islamic_lessons,
-- kids_quiz_questions, quran_daily_practice) but were never checked into a
-- migration file — they power the standalone /kids app (src/app/kids/*) and its
-- Quran daily-practice self-report. Written idempotently (IF NOT EXISTS / guarded
-- policy creation) so it is a no-op on the current production database and only
-- actually creates these tables on a fresh environment (local dev, a new branch,
-- `supabase db reset`) that doesn't have them yet.

create table if not exists public.kids_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id),
  category text not null,
  activity_key text not null,
  xp_earned integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists kids_activity_log_user_date_idx
  on public.kids_activity_log using btree (user_id, created_at);

alter table public.kids_activity_log enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'kids_activity_log' and policyname = 'kids_activity_log_select_own'
  ) then
    create policy kids_activity_log_select_own on public.kids_activity_log
      for select using (user_id = auth.uid());
  end if;
end $$;
-- Note: no INSERT policy — rows are written by the service-role client
-- (src/lib/kids/logActivityServer.ts) via /api/kids/activity and /api/quran/practice,
-- which bypasses RLS by design.

create table if not exists public.kids_gk_facts (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  options jsonb not null default '[]'::jsonb,
  correct_index integer not null default 0,
  fun_fact text,
  emoji text not null default '🌍',
  xp_reward integer not null default 5,
  created_at timestamptz not null default now()
);

alter table public.kids_gk_facts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'kids_gk_facts' and policyname = 'kids_gk_facts_select_all'
  ) then
    create policy kids_gk_facts_select_all on public.kids_gk_facts for select using (true);
  end if;
end $$;

create table if not exists public.kids_islamic_lessons (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'value',
  content text not null,
  emoji text not null default '🕌',
  xp_reward integer not null default 10,
  created_at timestamptz not null default now()
);

alter table public.kids_islamic_lessons enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'kids_islamic_lessons' and policyname = 'kids_islamic_lessons_select_all'
  ) then
    create policy kids_islamic_lessons_select_all on public.kids_islamic_lessons for select using (true);
  end if;
end $$;

create table if not exists public.kids_quiz_questions (
  id uuid primary key default gen_random_uuid(),
  subject text not null default 'gk',
  question text not null,
  options jsonb not null default '[]'::jsonb,
  correct_index integer not null default 0,
  emoji text not null default '❓',
  xp_reward integer not null default 5,
  created_at timestamptz not null default now()
);

alter table public.kids_quiz_questions enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'kids_quiz_questions' and policyname = 'kids_quiz_questions_select_all'
  ) then
    create policy kids_quiz_questions_select_all on public.kids_quiz_questions for select using (true);
  end if;
end $$;

create table if not exists public.kids_stories (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  cover_emoji text not null default '📖',
  pages jsonb not null default '[]'::jsonb,
  xp_reward integer not null default 10,
  created_at timestamptz not null default now()
);

alter table public.kids_stories enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'kids_stories' and policyname = 'kids_stories_select_all'
  ) then
    create policy kids_stories_select_all on public.kids_stories for select using (true);
  end if;
end $$;

create table if not exists public.quran_daily_practice (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id),
  practice_date date not null default current_date,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (student_id, practice_date)
);

alter table public.quran_daily_practice enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'quran_daily_practice' and policyname = 'quran_daily_practice_select_own'
  ) then
    create policy quran_daily_practice_select_own on public.quran_daily_practice
      for select using (student_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'quran_daily_practice' and policyname = 'quran_daily_practice_insert_own'
  ) then
    create policy quran_daily_practice_insert_own on public.quran_daily_practice
      for insert with check (student_id = auth.uid());
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'quran_daily_practice' and policyname = 'quran_daily_practice_update_own'
  ) then
    create policy quran_daily_practice_update_own on public.quran_daily_practice
      for update using (student_id = auth.uid()) with check (student_id = auth.uid());
  end if;
end $$;
