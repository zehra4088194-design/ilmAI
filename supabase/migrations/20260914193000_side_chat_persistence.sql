-- Side chat persistence uses the existing conversations table so chat history
-- survives refreshes and remains protected by the existing per-user RLS policies.
alter table public.conversations
  add column if not exists source text not null default 'ai_tutor';

alter table public.conversations
  drop constraint if exists conversations_source_check;

alter table public.conversations
  add constraint conversations_source_check
  check (source in ('ai_tutor', 'side_chat'));

create index if not exists conversations_user_source_updated_idx
  on public.conversations(user_id, source, updated_at desc);
