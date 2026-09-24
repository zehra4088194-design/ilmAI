do $$
begin
  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'profiles'
      and column_name = 'onboarding_completed'
  ) then
    alter table public.profiles
      add column onboarding_completed boolean not null default false;
  end if;
end $$;

update public.profiles
set onboarding_completed = true
where onboarding_completed = false
  and grade_level is not null;
