-- Harden chat read receipts and realtime updates.
-- Safe to run even if the columns/indexes already exist.

alter table public.student_chat_messages
  add column if not exists read_at timestamptz;

create index if not exists student_chat_messages_read_at_idx
  on public.student_chat_messages(request_id, sender_id, read_at);

alter table public.parent_messages
  add column if not exists read_at timestamptz;

create index if not exists parent_messages_read_at_idx
  on public.parent_messages(link_id, sender_id, read_at);

alter table public.student_chat_messages replica identity full;
alter table public.parent_messages replica identity full;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'student_chat_messages'
  ) then
    alter publication supabase_realtime add table public.student_chat_messages;
  end if;

  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'parent_messages'
  ) then
    alter publication supabase_realtime add table public.parent_messages;
  end if;
end $$;
