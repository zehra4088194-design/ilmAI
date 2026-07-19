alter table public.profiles
  add column if not exists preferred_language text not null default 'en';

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'profiles_preferred_language_check'
  ) then
    alter table public.profiles
      add constraint profiles_preferred_language_check
      check (preferred_language in ('en', 'roman-ur'));
  end if;
end $$;

update public.profiles as profile
set preferred_language = case
  when auth_user.raw_user_meta_data ->> 'preferred_language' = 'roman-ur' then 'roman-ur'
  else 'en'
end
from auth.users as auth_user
where auth_user.id = profile.id;

comment on column public.profiles.preferred_language is
  'Initial server-rendered interface language. English and LTR Roman Urdu are supported.';
