-- Consent-backed daily study emails.
-- Browser cookie stores the preference for UX; Supabase profile columns are the
-- server-side source of truth for Resend/cron delivery.

alter table public.profiles
  add column if not exists study_email_consent boolean not null default false,
  add column if not exists study_email_last_sent_at timestamptz,
  add column if not exists study_email_unsubscribed_at timestamptz;

create index if not exists idx_profiles_study_email_consent
  on public.profiles(study_email_consent, study_email_last_sent_at)
  where study_email_consent = true;
