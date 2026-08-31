-- Sellers: a restricted role that can create/manage only its OWN House Ad banners (image,
-- target URL, placement, schedule) and see stats for only those banners — never anyone else's,
-- and no other admin capability (no placement toggles, no user management, nothing else).
-- Managed as an email allowlist the admin panel controls directly (mirrors the ADMIN_EMAILS env
-- var pattern, but DB-driven so it doesn't need a redeploy to add/remove a seller).

create table if not exists public.ad_seller_emails (
  email text primary key,
  added_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.ad_seller_emails enable row level security;

-- No client-side access at all — checked and managed exclusively through service-role API
-- routes (requireSellerUser() and the admin seller-management routes), same as ad_clicks.
drop policy if exists "service role manages seller emails" on public.ad_seller_emails;
create policy "service role manages seller emails"
  on public.ad_seller_emails for all
  using ((select auth.role()) = 'service_role')
  with check ((select auth.role()) = 'service_role');
