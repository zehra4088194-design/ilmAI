-- Replace legacy web-call directory output with the saved phone number.
-- Person-to-person browser calling is retired in the app; directory actions use tel: links.

drop function if exists public.school_call_directory(uuid);

create function public.school_call_directory(p_organization_id uuid)
returns table (
  profile_id uuid,
  full_name text,
  avatar_url text,
  member_role text,
  phone text
)
language sql
stable
security definer
set search_path = public
as $$
  select m.profile_id, p.full_name, p.avatar_url, m.member_role, p.phone
  from public.school_memberships m
  join public.profiles p on p.id = m.profile_id
  where m.organization_id = p_organization_id
    and m.status = 'active'
    and public.school_is_member(p_organization_id)
  order by p.full_name;
$$;

revoke all on function public.school_call_directory(uuid) from public;
grant execute on function public.school_call_directory(uuid) to authenticated;

drop function if exists public.college_call_directory(uuid);

create function public.college_call_directory(p_organization_id uuid)
returns table (
  profile_id uuid,
  full_name text,
  avatar_url text,
  member_role text,
  phone text
)
language sql
stable
security definer
set search_path = public
as $$
  select m.profile_id, p.full_name, p.avatar_url, m.member_role, p.phone
  from public.college_memberships m
  join public.profiles p on p.id = m.profile_id
  where m.organization_id = p_organization_id
    and m.status = 'active'
    and public.college_is_member(p_organization_id)
  order by p.full_name;
$$;

revoke all on function public.college_call_directory(uuid) from public;
grant execute on function public.college_call_directory(uuid) to authenticated;
