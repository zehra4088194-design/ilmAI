-- Student-to-student chat safety moderation.
-- Every 10 combined messages, the app can classify the recent conversation.
-- First off-topic classification warns both students; the next one blocks
-- that pair's chat for 2 days.

alter table public.student_chat_requests
  add column if not exists moderation_warning_count integer not null default 0,
  add column if not exists moderation_last_checked_message_count integer not null default 0,
  add column if not exists moderation_blocked_until timestamptz,
  add column if not exists moderation_last_reason text;

create index if not exists student_chat_requests_moderation_blocked_until_idx
  on public.student_chat_requests (moderation_blocked_until);
