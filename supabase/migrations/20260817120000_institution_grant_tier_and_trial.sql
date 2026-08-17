-- Adds admin-selectable grant tier (PRO/ELITE) and trial-length control to the
-- school and college institution plan-settings tables. Previously the grant
-- functions (school-erp/subscription-cascade.ts, college-erp/subscription-cascade.ts)
-- hardcoded tier='PRO' and a period_end far in the future (2099) regardless of
-- billing_status, so a 'trial' status never actually granted anything and there
-- was no way to give an institution Elite access or a real, expiring trial window.
-- See docs/SCHOOL_COLLEGE_SEPARATION_TODO.md for the follow-up write-up.

alter table public.school_organization_plan_settings
  add column if not exists grant_tier text not null default 'PRO' check (grant_tier in ('PRO', 'ELITE')),
  add column if not exists trial_days integer check (trial_days is null or trial_days > 0),
  add column if not exists trial_ends_at timestamptz;

alter table public.college_organization_plan_settings
  add column if not exists grant_tier text not null default 'PRO' check (grant_tier in ('PRO', 'ELITE')),
  add column if not exists trial_days integer check (trial_days is null or trial_days > 0),
  add column if not exists trial_ends_at timestamptz;
