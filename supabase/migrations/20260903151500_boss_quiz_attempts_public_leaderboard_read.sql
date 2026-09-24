-- boss_quiz_attempts only had "user manages own attempts" (ALL, auth.uid()=user_id), so any
-- leaderboard read through the normal cookie-based client came back filtered to just the viewer's
-- own row. league_memberships already solves this the same way for the weekly league
-- ("public read for leaderboard" — see 20260710120400_leagues.sql); mirroring it here is what
-- makes the new Subject Championship leaderboard (src/app/(dashboard)/competitions/subject/[id])
-- actually show every participant instead of just the viewer.
drop policy if exists "public read for boss leaderboard" on public.boss_quiz_attempts;
create policy "public read for boss leaderboard" on public.boss_quiz_attempts
  for select using (true);
