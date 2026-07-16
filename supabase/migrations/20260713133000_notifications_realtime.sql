-- Notifications realtime + safety policies.
-- Storage bucket is not needed for notifications; they are database rows.
-- This enables the bell to update instantly for messages, requests, reminders,
-- routine alerts, weak-subject alerts, and other notification inserts.

do $$
begin
  if to_regclass('public.notifications') is null then
    raise notice 'public.notifications table does not exist; skipping notification realtime setup.';
    return;
  end if;

  alter table public.notifications replica identity full;

  create index if not exists notifications_user_unread_created_idx
    on public.notifications (user_id, is_read, created_at desc);

  alter table public.notifications enable row level security;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'notifications_select_own'
  ) then
    create policy notifications_select_own
      on public.notifications
      for select
      using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'notifications_insert_own'
  ) then
    create policy notifications_insert_own
      on public.notifications
      for insert
      with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'notifications'
      and policyname = 'notifications_update_own'
  ) then
    create policy notifications_update_own
      on public.notifications
      for update
      using (auth.uid() = user_id)
      with check (auth.uid() = user_id);
  end if;

  if exists (
    select 1
    from pg_publication
    where pubname = 'supabase_realtime'
  ) and not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end $$;
