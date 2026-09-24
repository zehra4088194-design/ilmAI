create index if not exists profiles_sponsored_institution_idx
  on public.profiles (sponsored_institution_type, lower(sponsored_institution_name));

create index if not exists study_sessions_user_date_idx
  on public.study_sessions (user_id, date desc);

create index if not exists quiz_sessions_user_status_idx
  on public.quiz_sessions (user_id, status);
