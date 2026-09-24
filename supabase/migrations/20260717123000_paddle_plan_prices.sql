-- Fixed launch prices. Pakistan sees PKR and may use manual wallets; every
-- other country uses the Paddle USD prices.

update public.platform_settings
set
  value = jsonb_set(
    jsonb_set(
      jsonb_set(
        value,
        '{subscriptionPlans,FREE,price}',
        '{"USD":{"monthly":0,"annual":0},"PKR":{"monthly":0,"annual":0}}'::jsonb,
        true
      ),
      '{subscriptionPlans,PRO,price}',
      '{"USD":{"monthly":2.99,"annual":28.70},"PKR":{"monthly":849,"annual":8150}}'::jsonb,
      true
    ),
    '{subscriptionPlans,ELITE,price}',
    '{"USD":{"monthly":4.99,"annual":47.90},"PKR":{"monthly":1399,"annual":13430}}'::jsonb,
    true
  ),
  updated_at = now()
where key = 'subscription_plans';
