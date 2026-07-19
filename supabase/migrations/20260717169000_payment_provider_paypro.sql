-- Make subscription records provider-agnostic and ready for Paddle + PayPro.
-- Safe when older projects still have stripe_* columns, and safe when the
-- provider_* columns already exist.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscriptions'
      and column_name = 'stripe_customer_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscriptions'
      and column_name = 'provider_customer_id'
  ) then
    alter table public.subscriptions rename column stripe_customer_id to provider_customer_id;
  end if;

  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscriptions'
      and column_name = 'stripe_subscription_id'
  ) and not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'subscriptions'
      and column_name = 'provider_subscription_id'
  ) then
    alter table public.subscriptions rename column stripe_subscription_id to provider_subscription_id;
  end if;
end $$;

alter table public.subscriptions
  add column if not exists provider text not null default 'paddle',
  add column if not exists provider_customer_id text,
  add column if not exists provider_subscription_id text;

create unique index if not exists idx_subscriptions_provider_subscription_id
  on public.subscriptions(provider_subscription_id)
  where provider_subscription_id is not null;

comment on column public.subscriptions.provider is
  'Payment gateway that owns this subscription: paddle or paypro.';
comment on column public.subscriptions.provider_customer_id is
  'Customer id in the payment provider system.';
comment on column public.subscriptions.provider_subscription_id is
  'Subscription, transaction, or invoice id in the payment provider system.';
