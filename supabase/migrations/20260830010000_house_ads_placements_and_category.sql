-- Expands House Ads: a `category` label on each banner, a per-placement on/off switch the admin
-- panel can flip without a redeploy, and new placement values for the pages just wired up
-- (dashboard, quiz results, flashcards, PDF reader, per-file test-taking).

alter table public.ad_banners add column if not exists category text;

alter table public.ad_banners drop constraint if exists ad_banners_placement_check;
alter table public.ad_banners add constraint ad_banners_placement_check
  check (placement in (
    'content_inline', 'teacher_test_gate', 'dashboard_top', 'quiz_results', 'flashcards_top',
    'pdf_viewer', 'test_taking'
  ));

create table if not exists public.ad_placement_settings (
  placement text primary key,
  is_enabled boolean not null default true,
  updated_at timestamptz not null default now()
);

alter table public.ad_placement_settings enable row level security;

drop policy if exists "authenticated users read placement settings" on public.ad_placement_settings;
create policy "authenticated users read placement settings"
  on public.ad_placement_settings for select
  to authenticated
  using (true);

drop policy if exists "admins write placement settings" on public.ad_placement_settings;
create policy "admins write placement settings"
  on public.ad_placement_settings for insert
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
drop policy if exists "admins update placement settings" on public.ad_placement_settings;
create policy "admins update placement settings"
  on public.ad_placement_settings for update
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
