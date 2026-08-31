-- Admin-managed category list (subjects like Chemistry/Biology/Computer Science, plus general
-- ones like Stationery, Physical Products) — replaces the old free-text `category` column. A
-- banner can carry up to 3 of these, used to prefer subject-matched banners on subject pages
-- (see selectActiveBanners' fallback logic in lib/ads/queries.ts) while still falling back to any
-- active banner for the placement when too few category matches exist.

create table if not exists public.ad_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.ad_categories enable row level security;

drop policy if exists "authenticated users read ad categories" on public.ad_categories;
create policy "authenticated users read ad categories"
  on public.ad_categories for select
  to authenticated
  using (true);

drop policy if exists "admins write ad categories" on public.ad_categories;
create policy "admins write ad categories"
  on public.ad_categories for insert
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
drop policy if exists "admins delete ad categories" on public.ad_categories;
create policy "admins delete ad categories"
  on public.ad_categories for delete
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

alter table public.ad_banners add column if not exists categories text[] not null default '{}';
alter table public.ad_banners drop constraint if exists ad_banners_categories_max3;
alter table public.ad_banners add constraint ad_banners_categories_max3 check (cardinality(categories) <= 3);

-- GIN index — selectActiveBanners filters "categories && ARRAY[context]" (array overlap).
create index if not exists ad_banners_categories_idx on public.ad_banners using gin (categories);

-- Old free-text label column stays (harmless, no longer written by the UI) — dropping it isn't
-- worth a data-loss risk for a column nothing reads anymore.
