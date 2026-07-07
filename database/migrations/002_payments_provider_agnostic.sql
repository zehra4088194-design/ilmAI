-- ============================================
-- MIGRATION: Make `subscriptions` table payment-provider agnostic
-- Run this against your Supabase project (supabase db push or SQL editor).
-- Safe to run even if the table already has data — it renames columns
-- rather than dropping them, so no subscriber data is lost.
-- ============================================

-- Rename Stripe-specific columns to provider-agnostic names
alter table public.subscriptions rename column stripe_customer_id to provider_customer_id;
alter table public.subscriptions rename column stripe_subscription_id to provider_subscription_id;

-- Track which gateway processed the payment (paddle | paypro)
alter table public.subscriptions add column if not exists provider text not null default 'paddle';

comment on column public.subscriptions.provider is 'Payment gateway that owns this subscription: paddle (international) or paypro (pakistan)';
comment on column public.subscriptions.provider_customer_id is 'Customer id in the payment provider''s system';
comment on column public.subscriptions.provider_subscription_id is 'Subscription id in the payment provider''s system';
