-- Weighted shared AI credits. Every user-facing AI request consumes a
-- feature-specific number of credits; the application enforces the actual
-- weighted windows in src/lib/rate-limit.

update public.platform_settings
set value = jsonb_set(
  jsonb_set(
    jsonb_set(
      value,
      '{subscriptionPlans,FREE,limits,aiCreditsWeekly}',
      '20'::jsonb,
      true
    ),
    '{subscriptionPlans,PRO,limits,aiCreditsWeekly}',
    '0'::jsonb,
    true
  ),
  '{subscriptionPlans,ELITE,limits,aiCreditsWeekly}',
  '0'::jsonb,
  true
), updated_at = now()
where key = 'subscription_plans';

update public.platform_settings
set value = jsonb_set(
  value,
  '{subscriptionPlans,FREE,features}',
  '[
    "20 shared AI credits every week",
    "5 printed OCR scans/month",
    "3 University Hub uses/week",
    "Online notes/books reading with ads",
    "Parent Link/QR setup only",
    "No downloads, summaries, or file tests"
  ]'::jsonb,
  true
), updated_at = now()
where key = 'subscription_plans';
