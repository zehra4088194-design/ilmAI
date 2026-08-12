-- White-labeling support (CLAUDE_CODE_MASTER_PROMPT.md point 7 / Part 4.3): public logo buckets +
-- a dedicated owner/admin-gated RPC to persist logo_url, since school_organizations/college_organizations
-- have no direct owner/admin UPDATE policy (writes go through security-definer RPCs, same pattern as
-- school_update_organization_profile).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('school-logos', 'school-logos', true, 4194304, array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update
set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('college-logos', 'college-logos', true, 4194304, array['image/png','image/jpeg','image/webp','image/svg+xml'])
on conflict (id) do update
set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "school admins upload logo" on storage.objects;
create policy "school admins upload logo"
  on storage.objects for insert
  with check (
    bucket_id = 'school-logos'
    and public.school_has_role(((storage.foldername(name))[1])::uuid, array['owner','admin'])
  );

drop policy if exists "school admins replace logo" on storage.objects;
create policy "school admins replace logo"
  on storage.objects for update
  using (
    bucket_id = 'school-logos'
    and public.school_has_role(((storage.foldername(name))[1])::uuid, array['owner','admin'])
  );

drop policy if exists "college admins upload logo" on storage.objects;
create policy "college admins upload logo"
  on storage.objects for insert
  with check (
    bucket_id = 'college-logos'
    and public.college_has_role(((storage.foldername(name))[1])::uuid, array['owner','admin'])
  );

drop policy if exists "college admins replace logo" on storage.objects;
create policy "college admins replace logo"
  on storage.objects for update
  using (
    bucket_id = 'college-logos'
    and public.college_has_role(((storage.foldername(name))[1])::uuid, array['owner','admin'])
  );

create or replace function public.school_update_organization_logo(p_organization_id uuid, p_logo_url text)
returns public.school_organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_organization public.school_organizations;
begin
  if not public.school_has_role(p_organization_id, array['owner','admin']) then
    raise exception 'School owner or admin access required';
  end if;
  update public.school_organizations
  set logo_url = nullif(trim(p_logo_url), ''), updated_at = now()
  where id = p_organization_id
  returning * into updated_organization;
  return updated_organization;
end;
$$;

revoke all on function public.school_update_organization_logo(uuid, text) from public;
grant execute on function public.school_update_organization_logo(uuid, text) to authenticated;

create or replace function public.college_update_organization_logo(p_organization_id uuid, p_logo_url text)
returns public.college_organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_organization public.college_organizations;
begin
  if not public.college_has_role(p_organization_id, array['owner','admin']) then
    raise exception 'College owner or admin access required';
  end if;
  update public.college_organizations
  set logo_url = nullif(trim(p_logo_url), ''), updated_at = now()
  where id = p_organization_id
  returning * into updated_organization;
  return updated_organization;
end;
$$;

revoke all on function public.college_update_organization_logo(uuid, text) from public;
grant execute on function public.college_update_organization_logo(uuid, text) to authenticated;
