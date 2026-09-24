-- Scanning is charged exclusively through the shared weighted AI credit
-- windows. Remove legacy monthly OCR entitlements from persisted plan JSON.

update public.platform_settings
set value = value
  #- '{subscriptionPlans,FREE,limits,ocrPrintedMonthly}'
  #- '{subscriptionPlans,PRO,limits,ocrPrintedMonthly}'
  #- '{subscriptionPlans,ELITE,limits,ocrPrintedMonthly}'
  #- '{subscriptionPlans,FREE,audienceLimits,school,ocrHandwrittenMonthly}'
  #- '{subscriptionPlans,FREE,audienceLimits,college,ocrHandwrittenMonthly}'
  #- '{subscriptionPlans,FREE,audienceLimits,university,ocrHandwrittenMonthly}'
  #- '{subscriptionPlans,PRO,audienceLimits,school,ocrHandwrittenMonthly}'
  #- '{subscriptionPlans,PRO,audienceLimits,college,ocrHandwrittenMonthly}'
  #- '{subscriptionPlans,PRO,audienceLimits,university,ocrHandwrittenMonthly}'
  #- '{subscriptionPlans,ELITE,audienceLimits,school,ocrHandwrittenMonthly}'
  #- '{subscriptionPlans,ELITE,audienceLimits,college,ocrHandwrittenMonthly}'
  #- '{subscriptionPlans,ELITE,audienceLimits,university,ocrHandwrittenMonthly}',
  updated_at = now()
where key = 'subscription_plans';

do $$
declare
  plan_tier text;
  current_features jsonb;
  cleaned_features jsonb;
begin
  foreach plan_tier in array array['FREE', 'PRO', 'ELITE']
  loop
    select case
      when jsonb_typeof(value #> array['subscriptionPlans', plan_tier, 'features']) = 'array'
        then value #> array['subscriptionPlans', plan_tier, 'features']
      else '[]'::jsonb
    end
    into current_features
    from public.platform_settings
    where key = 'subscription_plans';

    if current_features is null then
      continue;
    end if;

    select coalesce(
      jsonb_agg(
        case
          when lower(feature #>> '{}') like '%handwritten%file tests%'
            then to_jsonb(
              coalesce(
                'School: ' || substring(feature #>> '{}' from '([0-9]+ file tests/month.*)$'),
                feature #>> '{}'
              )
            )
          else feature
        end
        order by ordinal
      ),
      '[]'::jsonb
    )
    into cleaned_features
    from jsonb_array_elements(current_features) with ordinality as entries(feature, ordinal)
    where lower(feature #>> '{}') not like '%ocr%'
      and lower(feature #>> '{}') not like '%printed%scan%'
      and (
        lower(feature #>> '{}') not like '%handwritten%scan%'
        or lower(feature #>> '{}') like '%file tests%'
      );

    update public.platform_settings
    set value = jsonb_set(
      value,
      array['subscriptionPlans', plan_tier, 'features'],
      cleaned_features || jsonb_build_array(
        'Printed scan: 1 shared AI credit',
        'Handwritten scan: 3 shared AI credits'
      ),
      true
    ),
    updated_at = now()
    where key = 'subscription_plans';
  end loop;
end
$$;
