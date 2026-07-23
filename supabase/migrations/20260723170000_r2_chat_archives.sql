-- Recent chat rows remain in realtime tables for 48 hours. Older messages
-- are compressed into private R2 objects; this table is only their index.
create table if not exists public.chat_archives (
  id uuid primary key default gen_random_uuid(),
  archive_type text not null check (archive_type in ('student', 'parent')),
  conversation_id text not null,
  object_key text not null unique,
  message_count integer not null check (message_count > 0),
  first_message_at timestamptz not null,
  last_message_at timestamptz not null,
  compressed_size_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists chat_archives_conversation_idx
  on public.chat_archives (archive_type, conversation_id, first_message_at);

alter table public.chat_archives enable row level security;

-- No browser policy is intentional. Archive objects and this index are read
-- by authenticated API routes through the service role after participant
-- access has been verified.
revoke all on public.chat_archives from anon, authenticated;
