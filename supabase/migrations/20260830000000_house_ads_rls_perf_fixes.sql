-- Follow-up to 20260829130001_house_ads_system.sql, applied live via
-- mcp__supabase__apply_migration; this file mirrors that change for the repo (same convention as
-- 20260823130000_school_logos_public_read_policy.sql). Fixes three things Supabase's own
-- performance advisor flagged right after the original migration ran:
--
-- 1. ad_clicks/ad_impressions_daily's service-role policies called auth.role() unwrapped, so
--    Postgres re-evaluates it per row instead of once (see security-rls-performance.md).
-- 2. ad_banners had two permissive SELECT policies for `authenticated` (the broad read policy,
--    and the admin "for all" policy) — Postgres has to OR them together on every read. The admin
--    policy only actually needs to cover writes; SELECT is already granted to every authenticated
--    user by the other policy.
-- 3. ad_banners.created_by and ad_clicks.user_id are foreign keys with no covering index.

drop policy if exists "admins manage banners" on public.ad_banners;
create policy "admins write banners"
  on public.ad_banners for insert
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "admins update banners"
  on public.ad_banners for update
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "admins delete banners"
  on public.ad_banners for delete
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));

drop policy if exists "service role manages ad clicks" on public.ad_clicks;
create policy "service role manages ad clicks"
  on public.ad_clicks for all
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

drop policy if exists "service role manages ad impressions" on public.ad_impressions_daily;
create policy "service role manages ad impressions"
  on public.ad_impressions_daily for all
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');

create index if not exists ad_banners_created_by_idx on public.ad_banners (created_by);
create index if not exists ad_clicks_user_id_idx on public.ad_clicks (user_id);
