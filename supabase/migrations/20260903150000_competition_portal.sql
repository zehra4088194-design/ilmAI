-- ============================================
-- COMPETITION PORTAL
-- Deliberately narrow: "Weekly Competitions" already exist as the weekly league
-- (public.league_memberships / current_week_start / increment_xp_and_league — see
-- 20260710120400_leagues.sql) and "Subject Championships" already exist as boss quizzes
-- (public.boss_quizzes / boss_quiz_attempts — see 20260710120500_boss_quizzes_avatars.sql).
-- Neither is duplicated here; the Competition Portal UI reads both directly and adds only what
-- genuinely does not exist yet: Daily Challenge and Class-vs-Class / School-vs-School
-- competitions, all sharing one schema so "upcoming/active/completed" and "history" are uniform.
--
-- Question sourcing reuses the existing chapter question bank
-- (src/lib/tests/chapter-question-bank.ts -> generateChapterQuestionPaper +
-- chapterMcqsToQuizSession) exactly the way boss_quizzes already stores a fixed
-- quiz_session_template — every participant gets the same underlying question pool (fair,
-- comparable scores) and the app randomizes question/option order per attempt client-side.
-- ============================================

do $$
begin
  if not exists (select 1 from pg_type where typname = 'competition_type') then
    create type public.competition_type as enum ('daily', 'class_vs_class', 'school_vs_school');
  end if;
  if not exists (select 1 from pg_type where typname = 'competition_scope') then
    create type public.competition_scope as enum ('global', 'school', 'college');
  end if;
end $$;

create table if not exists public.competitions (
  id uuid primary key default gen_random_uuid(),
  competition_type public.competition_type not null,
  scope public.competition_scope not null default 'global',
  -- Populated only for scope in ('school','college') — the institution these entrants belong to.
  organization_id uuid,
  -- class_vs_class: the two sections being pitted against each other (school_sections.id or
  -- college_sections.id, matching organization_kind = the org's type). Null for daily/school-wide.
  section_a_id uuid,
  section_b_id uuid,
  title text not null,
  description text not null default '',
  subject_id uuid references public.subjects(id) on delete set null,
  chapter_id uuid,
  quiz_session_template jsonb not null,
  question_count integer not null default 10,
  time_limit_seconds integer not null default 600,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  xp_reward integer not null default 60,
  coin_reward integer not null default 25,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists competitions_type_window_idx on public.competitions (competition_type, starts_at desc, ends_at desc);
create index if not exists competitions_org_idx on public.competitions (organization_id) where organization_id is not null;

create table if not exists public.competition_entries (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  quiz_session_id uuid references public.quiz_sessions(id) on delete set null,
  score numeric,
  correct_count integer,
  time_spent integer,
  -- Denormalized on every leaderboard read/write so certificate eligibility and the
  -- "competition_wins" achievement stat never have to recompute standings from scratch.
  rank integer,
  percentile numeric,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  unique (competition_id, user_id)
);

create index if not exists competition_entries_leaderboard_idx
  on public.competition_entries (competition_id, score desc nulls last);
create index if not exists competition_entries_user_idx
  on public.competition_entries (user_id, completed_at desc);

create table if not exists public.competition_certificates (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rank integer not null,
  percentile numeric,
  issued_at timestamptz not null default now(),
  unique (competition_id, user_id)
);

alter table public.competitions enable row level security;
alter table public.competition_entries enable row level security;
alter table public.competition_certificates enable row level security;

drop policy if exists "public read competitions" on public.competitions;
create policy "public read competitions" on public.competitions for select using (true);

drop policy if exists "public read entries for leaderboard" on public.competition_entries;
create policy "public read entries for leaderboard" on public.competition_entries for select using (true);
drop policy if exists "user manages own entry" on public.competition_entries;
create policy "user manages own entry" on public.competition_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

drop policy if exists "user reads own certificates" on public.competition_certificates;
create policy "user reads own certificates" on public.competition_certificates
  for select using (auth.uid() = user_id);

-- One more achievement condition, in the same table checkAndAwardAchievements() already reads —
-- see achievement_expansion.sql for the pattern this follows.
insert into public.achievements (name, description, icon_url, xp_reward, condition_type, condition_value)
values
  ('Podium Finish', 'Place in the top 3 of a competition.', '🥉', 150, 'competition_top3', 1),
  ('Competition Champion', 'Win first place in a competition.', '🥇', 300, 'competition_wins', 1),
  ('Daily Grinder', 'Complete 7 Daily Challenges.', '🔥', 200, 'daily_challenges_completed', 7)
on conflict do nothing;
