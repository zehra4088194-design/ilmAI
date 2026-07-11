do $$
begin
  if not exists (select 1 from pg_type where typname = 'league_tier') then
    create type public.league_tier as enum ('bronze','silver','gold','platinum');
  end if;
end $$;

create table if not exists public.league_memberships (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  tier public.league_tier not null default 'bronze',
  weekly_xp integer not null default 0,
  week_start_date date not null,
  created_at timestamptz not null default now(),
  unique(user_id, week_start_date)
);

alter table public.league_memberships enable row level security;

drop policy if exists "public read for leaderboard" on public.league_memberships;
create policy "public read for leaderboard" on public.league_memberships
  for select using (true);

drop policy if exists "user cannot directly modify" on public.league_memberships;
create policy "user cannot directly modify" on public.league_memberships
  for insert with check (false);

create or replace function public.current_week_start()
returns date
language sql
stable
as $$
  select (current_date - ((extract(isodow from current_date)::integer - 1) * interval '1 day'))::date
$$;

create or replace function public.increment_xp_and_league(p_user_id uuid, p_amount integer)
returns table (xp integer, level integer, weekly_xp integer)
language plpgsql
security definer
as $$
declare
  v_week date := public.current_week_start();
  v_xp integer;
  v_level integer;
  v_weekly integer;
begin
  if p_amount <= 0 then
    select p.xp, p.level into v_xp, v_level from public.profiles p where p.id = p_user_id;
  else
    update public.profiles
    set xp = profiles.xp + p_amount,
        level = floor((profiles.xp + p_amount) / 1000) + 1,
        updated_at = now()
    where id = p_user_id
    returning profiles.xp, profiles.level into v_xp, v_level;

    insert into public.league_memberships (user_id, tier, weekly_xp, week_start_date)
    values (
      p_user_id,
      coalesce((select tier from public.league_memberships where user_id = p_user_id order by week_start_date desc limit 1), 'bronze'::public.league_tier),
      p_amount,
      v_week
    )
    on conflict (user_id, week_start_date)
    do update set weekly_xp = public.league_memberships.weekly_xp + excluded.weekly_xp
    returning public.league_memberships.weekly_xp into v_weekly;
  end if;

  return query select coalesce(v_xp, 0), coalesce(v_level, 1), coalesce(v_weekly, 0);
end;
$$;

create index if not exists idx_league_memberships_tier_week
  on public.league_memberships(tier, week_start_date, weekly_xp desc);
