-- Adds 'parent_principal' as a direct_conversations relationship_type, following the exact
-- extension pattern the Phase 1a migration documented ("adding a new relationship_type later
-- means adding a branch to get_or_create_direct_conversation(), not a new table").
--
-- Until now a parent could only message a teacher (relationship_type = 'parent_teacher'); there
-- was no way to reach the principal directly. A school/college's principal is whichever member
-- has member_role = 'owner' (self-service "Principal" signup was removed on purpose — see
-- RegisterForm's comment — principal accounts are always platform-admin-provisioned with role
-- 'owner').

alter table public.direct_conversations
  drop constraint if exists direct_conversations_relationship_type_check;
alter table public.direct_conversations
  add constraint direct_conversations_relationship_type_check
  check (relationship_type in ('parent_teacher', 'parent_principal', 'principal_principal', 'peer_help'));

create or replace function public.get_or_create_direct_conversation(
  p_context_type text,
  p_organization_id uuid,
  p_relationship_type text,
  p_other_profile_id uuid
)
returns public.direct_conversations
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller uuid := auth.uid();
  v_p1 uuid;
  v_p2 uuid;
  v_row public.direct_conversations;
  v_caller_role text;
  v_other_role text;
begin
  if v_caller is null then
    raise exception 'Authentication required';
  end if;
  if p_other_profile_id is null or p_other_profile_id = v_caller then
    raise exception 'Invalid conversation participant';
  end if;

  if p_relationship_type = 'parent_teacher' then
    if p_context_type not in ('school', 'college') or p_organization_id is null then
      raise exception 'A parent-teacher conversation requires a school or college organization';
    end if;
    if p_context_type = 'school' then
      select member_role into v_caller_role from public.school_memberships
        where organization_id = p_organization_id and profile_id = v_caller and status = 'active';
      select member_role into v_other_role from public.school_memberships
        where organization_id = p_organization_id and profile_id = p_other_profile_id and status = 'active';
    else
      select member_role into v_caller_role from public.college_memberships
        where organization_id = p_organization_id and profile_id = v_caller and status = 'active';
      select member_role into v_other_role from public.college_memberships
        where organization_id = p_organization_id and profile_id = p_other_profile_id and status = 'active';
    end if;
    if v_caller_role is null or v_other_role is null then
      raise exception 'Both participants must be active members of this organization';
    end if;
    if not (
      (v_caller_role = 'parent' and v_other_role = 'teacher')
      or (v_caller_role = 'teacher' and v_other_role = 'parent')
    ) then
      raise exception 'A parent-teacher conversation requires one parent and one teacher';
    end if;
  elsif p_relationship_type = 'parent_principal' then
    if p_context_type not in ('school', 'college') or p_organization_id is null then
      raise exception 'A parent-principal conversation requires a school or college organization';
    end if;
    if p_context_type = 'school' then
      select member_role into v_caller_role from public.school_memberships
        where organization_id = p_organization_id and profile_id = v_caller and status = 'active';
      select member_role into v_other_role from public.school_memberships
        where organization_id = p_organization_id and profile_id = p_other_profile_id and status = 'active';
    else
      select member_role into v_caller_role from public.college_memberships
        where organization_id = p_organization_id and profile_id = v_caller and status = 'active';
      select member_role into v_other_role from public.college_memberships
        where organization_id = p_organization_id and profile_id = p_other_profile_id and status = 'active';
    end if;
    if v_caller_role is null or v_other_role is null then
      raise exception 'Both participants must be active members of this organization';
    end if;
    if not (
      (v_caller_role = 'parent' and v_other_role = 'owner')
      or (v_caller_role = 'owner' and v_other_role = 'parent')
    ) then
      raise exception 'A parent-principal conversation requires one parent and the principal (owner)';
    end if;
  else
    raise exception 'Unsupported relationship type: %', p_relationship_type;
  end if;

  v_p1 := least(v_caller, p_other_profile_id);
  v_p2 := greatest(v_caller, p_other_profile_id);

  insert into public.direct_conversations (context_type, organization_id, relationship_type, participant_one_id, participant_two_id)
  values (p_context_type, p_organization_id, p_relationship_type, v_p1, v_p2)
  on conflict (context_type, organization_id, relationship_type, participant_one_id, participant_two_id)
  do update set context_type = excluded.context_type
  returning * into v_row;

  return v_row;
end;
$$;
