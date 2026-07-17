alter table public.profiles
  add column if not exists academic_institution_name text,
  add column if not exists academic_institution_type text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_academic_institution_type_check'
  ) then
    alter table public.profiles
      add constraint profiles_academic_institution_type_check
      check (
        academic_institution_type is null
        or academic_institution_type in ('school', 'college', 'university')
      );
  end if;
end $$;

create index if not exists profiles_academic_institution_idx
  on public.profiles (academic_institution_type, lower(academic_institution_name))
  where academic_institution_name is not null;

update public.profiles as profile
set
  academic_institution_name = nullif(trim(auth_user.raw_user_meta_data ->> 'academic_institution_name'), ''),
  academic_institution_type = case
    when auth_user.raw_user_meta_data ->> 'academic_institution_type' in ('school', 'college', 'university')
      then auth_user.raw_user_meta_data ->> 'academic_institution_type'
    else profile.academic_institution_type
  end
from auth.users as auth_user
where auth_user.id = profile.id
  and profile.academic_institution_name is null
  and nullif(trim(auth_user.raw_user_meta_data ->> 'academic_institution_name'), '') is not null;

comment on column public.profiles.academic_institution_name is
  'The school, college, or university supplied by the student during signup. This is separate from plan sponsorship.';
