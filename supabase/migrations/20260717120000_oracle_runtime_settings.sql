-- Conservative platform-wide provider budgets for the Oracle free-tier launch.
-- These are admission-control defaults and remain editable from Admin Settings.

update public.platform_settings
set
  value = jsonb_set(
    value,
    '{providerDailyBudgets}',
    '{
      "groqFast":400,
      "groqLarge":40,
      "gemini":200,
      "ocrSpace":500,
      "openRouter":45,
      "grok":100,
      "claude":0,
      "gpt":0
    }'::jsonb,
    true
  ),
  updated_at = now()
where key = 'subscription_plans';
