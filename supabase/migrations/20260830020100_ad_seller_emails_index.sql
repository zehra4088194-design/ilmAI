-- Follow-up to 20260830020000_house_ads_sellers.sql — Supabase's advisor flagged the added_by
-- foreign key on ad_seller_emails as unindexed.
create index if not exists ad_seller_emails_added_by_idx on public.ad_seller_emails (added_by);
