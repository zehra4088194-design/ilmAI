-- Phase 3a/3b: lets other students answer a posted doubt, not just the AI-operated "teacher"
-- profile. Extends the existing doubts/doubt_replies tables rather than adding parallel ones —
-- doubt_replies.teacher_id already just means "who wrote this reply" (it's used for the AI teacher
-- profile today), so a peer student's reply is stored the same way with is_peer_reply = true.
--
-- Also fixes a pre-existing bug found while touching this RLS: the current INSERT policy requires
-- auth.uid() = teacher_id AND the ACTING user's own profile.role to be teacher/admin. The AI-reply
-- insert in src/app/api/doubts/route.ts runs as the asking STUDENT's request-scoped client (not
-- the AI profile, not service role), inserting teacher_id = <ai profile id> — that insert can never
-- have satisfied this policy, so the AI auto-reply has been silently failing under RLS (swallowed
-- by that route's try/catch). Fixed at the app layer (that insert now uses the service-role client,
-- like every other system-authored insert in this codebase) rather than by weakening this policy.

alter table public.doubt_replies add column if not exists is_peer_reply boolean not null default false;
alter table public.doubt_replies add column if not exists xp_awarded boolean not null default false;
alter table public.doubt_replies add column if not exists flagged boolean not null default false;
alter table public.doubt_replies add column if not exists flagged_reason text;

alter table public.doubts add column if not exists peer_reply_count integer not null default 0;
alter table public.doubts add column if not exists moderation_last_checked_count integer not null default 0;
alter table public.doubts add column if not exists moderation_warning_count integer not null default 0;
alter table public.doubts add column if not exists moderation_blocked_until timestamptz;

-- A student may post a peer reply to any doubt that isn't their own and isn't currently
-- moderation-blocked. Teacher/admin replies keep working exactly as before (that branch is
-- untouched) — service-role inserts (the AI reply, after the app-layer fix above) bypass RLS
-- entirely as usual.
drop policy if exists "Teachers can reply to doubts" on public.doubt_replies;
create policy "Teachers and peer students can reply to doubts"
  on public.doubt_replies for insert
  with check (
    auth.uid() = teacher_id
    and (
      exists (
        select 1 from public.profiles
        where profiles.id = auth.uid() and profiles.role = any (array['teacher'::user_role, 'admin'::user_role])
      )
      or (
        is_peer_reply
        and exists (
          select 1 from public.doubts d
          where d.id = doubt_replies.doubt_id
            and d.student_id <> auth.uid()
            and (d.moderation_blocked_until is null or d.moderation_blocked_until < now())
        )
      )
    )
  );
