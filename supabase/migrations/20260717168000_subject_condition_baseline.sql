alter table public.profiles
  add column if not exists subject_condition_baseline jsonb not null default '{}'::jsonb,
  add column if not exists baseline_completed_at timestamptz;

alter table public.profiles
  drop constraint if exists profiles_subject_condition_baseline_object;

alter table public.profiles
  add constraint profiles_subject_condition_baseline_object
  check (jsonb_typeof(subject_condition_baseline) = 'object');

comment on column public.profiles.subject_condition_baseline is
  'One-time onboarding self-assessment keyed by subject UUID: strong, steady, or needs-work.';

comment on column public.profiles.baseline_completed_at is
  'Timestamp of the most recent subject-condition onboarding baseline.';
