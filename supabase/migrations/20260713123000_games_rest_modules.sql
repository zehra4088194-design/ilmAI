-- Games + Rest/Music modules.
-- Games are Pro/Elite, live-room capable, with a 45 minute/day app-enforced cap.
-- Rest playlists are admin-managed YouTube playlists, Pro/Elite by default.

create table if not exists public.games (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  description text not null default '',
  thumbnail_url text,
  category text not null default 'Mind',
  play_url text,
  is_embedded boolean not null default true,
  game_type text not null default 'live_ludo',
  difficulty text check (difficulty in ('easy', 'medium', 'hard')),
  featured boolean not null default false,
  is_active boolean not null default true,
  min_tier text not null default 'PRO' check (min_tier in ('PRO', 'ELITE')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.game_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  room_code text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  last_heartbeat_at timestamptz not null default now(),
  duration_seconds integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists game_sessions_user_started_idx
  on public.game_sessions (user_id, started_at desc);

create index if not exists game_sessions_room_idx
  on public.game_sessions (room_code);

create table if not exists public.game_room_events (
  id uuid primary key default gen_random_uuid(),
  room_code text not null,
  game_id uuid references public.games(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists game_room_events_room_created_idx
  on public.game_room_events (room_code, created_at desc);

create table if not exists public.music_playlists (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  cover_image_url text,
  is_pro boolean not null default true,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.playlist_songs (
  id uuid primary key default gen_random_uuid(),
  playlist_id uuid not null references public.music_playlists(id) on delete cascade,
  title text not null,
  artist text,
  youtube_url text not null,
  youtube_video_id text not null,
  thumbnail_url text,
  order_index integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists playlist_songs_playlist_order_idx
  on public.playlist_songs (playlist_id, order_index asc, created_at desc);

alter table public.games enable row level security;
alter table public.game_sessions enable row level security;
alter table public.game_room_events enable row level security;
alter table public.music_playlists enable row level security;
alter table public.playlist_songs enable row level security;

drop policy if exists "Games readable by authenticated users" on public.games;
create policy "Games readable by authenticated users"
  on public.games for select
  to authenticated
  using (is_active = true);

drop policy if exists "Game sessions owner select" on public.game_sessions;
create policy "Game sessions owner select"
  on public.game_sessions for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Game sessions owner insert" on public.game_sessions;
create policy "Game sessions owner insert"
  on public.game_sessions for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Game sessions owner update" on public.game_sessions;
create policy "Game sessions owner update"
  on public.game_sessions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "Game room events readable" on public.game_room_events;
create policy "Game room events readable"
  on public.game_room_events for select
  to authenticated
  using (true);

drop policy if exists "Game room events insert own" on public.game_room_events;
create policy "Game room events insert own"
  on public.game_room_events for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "Music playlists readable" on public.music_playlists;
create policy "Music playlists readable"
  on public.music_playlists for select
  to authenticated
  using (true);

drop policy if exists "Playlist songs readable" on public.playlist_songs;
create policy "Playlist songs readable"
  on public.playlist_songs for select
  to authenticated
  using (is_active = true);

insert into public.games (slug, title, description, thumbnail_url, category, game_type, difficulty, featured, min_tier)
values
  ('live-ludo', 'Live Ludo Room', 'Join friends in a study-safe live Ludo room. 45 minutes/day max gaming time.', null, 'Board', 'live_ludo', 'easy', true, 'PRO'),
  ('memory-match', 'Memory Match', 'A quick focus reset game for matching symbols and warming up memory.', null, 'Memory', 'memory_match', 'easy', false, 'PRO'),
  ('logic-dice', 'Logic Dice', 'Roll, reason, and solve quick logic prompts with friends.', null, 'Logic', 'logic_dice', 'medium', false, 'PRO')
on conflict (slug) do nothing;

insert into public.music_playlists (name, slug, description, cover_image_url, order_index)
values
  ('Relax', 'relax', 'Soft relaxing tracks for short study breaks.', null, 1),
  ('Focus', 'focus', 'Low-distraction focus sounds for deep work.', null, 2),
  ('Sleep', 'sleep', 'Calm sounds for wind-down and recovery.', null, 3)
on conflict (slug) do nothing;
