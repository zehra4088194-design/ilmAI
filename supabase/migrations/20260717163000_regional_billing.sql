-- Pakistan uses fixed PKR pricing and manual wallet checkout. Every other
-- country uses Paddle USD. Generic quote columns support both currencies while
-- preserving historical PKR inquiry data.

alter table public.institution_plan_inquiries
  add column if not exists quote_currency text not null default 'PKR',
  add column if not exists discounted_price numeric(12, 2);

update public.institution_plan_inquiries
set
  quote_currency = 'PKR',
  discounted_price = discounted_price_pkr::numeric
where discounted_price is null;

alter table public.institution_plan_inquiries
  alter column discounted_price set not null,
  alter column discounted_price_pkr drop not null;

alter table public.institution_plan_inquiries
  drop constraint if exists institution_plan_inquiries_quote_currency_check;

alter table public.institution_plan_inquiries
  add constraint institution_plan_inquiries_quote_currency_check
  check (quote_currency in ('USD', 'PKR'));

comment on column public.institution_plan_inquiries.discounted_price is
  'Institutional quote in quote_currency after the configured discount.';

update public.platform_settings
set
  value = (
    jsonb_set(
      jsonb_set(
        jsonb_set(
          jsonb_set(
            jsonb_set(
              jsonb_set(value, '{subscriptionPlans,FREE,price,USD}', '{"monthly":0,"annual":0}'::jsonb, true),
              '{subscriptionPlans,FREE,price,PKR}',
              '{"monthly":0,"annual":0}'::jsonb,
              true
            ),
            '{subscriptionPlans,PRO,price,USD}',
            '{"monthly":2.99,"annual":28.70}'::jsonb,
            true
          ),
          '{subscriptionPlans,PRO,price,PKR}',
          '{"monthly":849,"annual":8150}'::jsonb,
          true
        ),
        '{subscriptionPlans,ELITE,price,USD}',
        '{"monthly":4.99,"annual":47.90}'::jsonb,
        true
      ),
      '{subscriptionPlans,ELITE,price,PKR}',
      '{"monthly":1399,"annual":13430}'::jsonb,
      true
    )
    #- '{subscriptionPlans,FREE,price,INR}'
    #- '{subscriptionPlans,PRO,price,INR}'
    #- '{subscriptionPlans,ELITE,price,INR}'
  ),
  updated_at = now()
where key = 'subscription_plans';
