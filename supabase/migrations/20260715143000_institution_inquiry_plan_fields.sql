alter table public.institution_plan_inquiries
  add column if not exists plan_tier text not null default 'PRO',
  add column if not exists billing_cycle text not null default 'monthly';

alter table public.institution_plan_inquiries
  drop constraint if exists institution_plan_inquiries_plan_tier_check;

alter table public.institution_plan_inquiries
  add constraint institution_plan_inquiries_plan_tier_check
  check (plan_tier in ('PRO', 'ELITE'));

alter table public.institution_plan_inquiries
  drop constraint if exists institution_plan_inquiries_billing_cycle_check;

alter table public.institution_plan_inquiries
  add constraint institution_plan_inquiries_billing_cycle_check
  check (billing_cycle in ('monthly', 'annual'));
