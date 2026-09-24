-- Make multiplayer Ludo room events available to subscribed clients.
alter table public.game_room_events replica identity full;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
    and not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = 'game_room_events'
    ) then
    alter publication supabase_realtime add table public.game_room_events;
  end if;
end $$;
