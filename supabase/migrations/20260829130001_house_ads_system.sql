-- House Ads: replaces Google AdSense with self-served banners promoting
-- ilmai.store, plus click/conversion tracking against that separate
-- Next.js/Supabase app via a server-to-server API (no shared DB connection —
-- ilmai.store calls POST /api/ads/conversion with a bearer secret).
--
-- Three tables:
--   ad_banners           — the promotional creatives an admin manages.
--   ad_clicks            — one row per click-through, holding the unguessable
--                          click_id handed to ilmai.store as ?ref=, later
--                          updated by the conversion callback.
--   ad_impressions_daily — a per-day counter per banner (NOT one row per
--                          view) so impression volume never becomes a
--                          write-amplification problem.

create table if not exists public.ad_banners (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  image_url text not null,
  target_url text not null,
  -- Slot names inferred from where AdSenseBanner/AdSenseScript actually
  -- rendered: the shared "between hero and content grid" spot on
  -- /library, /past-papers (incl. subject/chapter subpages), and
  -- /blog/[slug] (content_inline), and the FREE-teacher watch-an-ad gate in
  -- the Teacher Test Studio (teacher_test_gate).
  placement text not null check (placement in ('content_inline', 'teacher_test_gate')),
  -- null = shown to everyone (incl. logged-out visitors on the public
  -- library/past-papers/blog pages); otherwise restricts to one role.
  target_audience text check (target_audience is null or target_audience in ('student', 'parent', 'teacher', 'principal', 'admin')),
  weight integer not null default 1 check (weight > 0),
  is_active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (starts_at is null or ends_at is null or starts_at < ends_at)
);

create index if not exists ad_banners_placement_active_idx on public.ad_banners (placement, is_active);

create table if not exists public.ad_clicks (
  id uuid primary key default gen_random_uuid(),
  click_id text not null unique,
  banner_id uuid not null references public.ad_banners(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  clicked_at timestamptz not null default now(),
  converted boolean not null default false,
  order_value numeric(10, 2),
  converted_at timestamptz,
  -- ilmai.store's own order id, kept for cross-referencing during support/reconciliation.
  order_id text
);

create index if not exists ad_clicks_banner_id_idx on public.ad_clicks (banner_id);
create index if not exists ad_clicks_clicked_at_idx on public.ad_clicks (clicked_at);
-- Speeds up the admin dashboard's per-banner conversion/order-value rollup.
create index if not exists ad_clicks_banner_converted_idx on public.ad_clicks (banner_id) where converted = true;

create table if not exists public.ad_impressions_daily (
  banner_id uuid not null references public.ad_banners(id) on delete cascade,
  date date not null default current_date,
  impression_count bigint not null default 0,
  primary key (banner_id, date)
);

-- RLS
alter table public.ad_banners enable row level security;
alter table public.ad_clicks enable row level security;
alter table public.ad_impressions_daily enable row level security;

drop policy if exists "authenticated users read active banners" on public.ad_banners;
create policy "authenticated users read active banners"
  on public.ad_banners for select
  to authenticated
  using (true);

drop policy if exists "admins manage banners" on public.ad_banners;
create policy "admins manage banners"
  on public.ad_banners for all
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

-- Clicks and impressions are only ever written by the /api/ads/* routes
-- using the service-role key (click_id generation, weighted selection, and
-- the conversion callback all need server-side control) — never directly by
-- a client, logged in or not.
drop policy if exists "service role manages ad clicks" on public.ad_clicks;
create policy "service role manages ad clicks"
  on public.ad_clicks for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

drop policy if exists "service role manages ad impressions" on public.ad_impressions_daily;
create policy "service role manages ad impressions"
  on public.ad_impressions_daily for all
  using (auth.role() = 'service_role')
  with check (auth.role() = 'service_role');

-- Impression counter bump, called once per banner render from the
-- impression API route. Kept as its own function (rather than an inline
-- upsert in the route) so the increment stays atomic under concurrent hits.
create or replace function public.increment_ad_impression(p_banner_id uuid)
returns void
language sql
security invoker
set search_path = ''
as $$
  insert into public.ad_impressions_daily (banner_id, date, impression_count)
  values (p_banner_id, current_date, 1)
  on conflict (banner_id, date)
  do update set impression_count = public.ad_impressions_daily.impression_count + 1;
$$;

revoke execute on function public.increment_ad_impression(uuid) from public, anon, authenticated;
grant execute on function public.increment_ad_impression(uuid) to service_role;
