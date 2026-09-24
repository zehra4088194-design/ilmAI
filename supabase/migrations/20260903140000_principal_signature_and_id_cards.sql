-- Student ID Card generator needs a principal name + signature image on the ID card, in addition
-- to the school/college's existing logo_url. Same pattern as
-- 20260812094500_school_college_logo_branding.sql: school_organizations/college_organizations have
-- no direct owner/admin UPDATE policy, so this adds columns + a security-definer RPC, and reuses
-- the existing public school-logos/college-logos buckets (already open to any image path under the
-- org's own folder for owner/admin) rather than creating new buckets just for a signature image.

alter table public.school_organizations add column if not exists principal_name text;
alter table public.school_organizations add column if not exists principal_signature_url text;
alter table public.college_organizations add column if not exists principal_name text;
alter table public.college_organizations add column if not exists principal_signature_url text;

create or replace function public.school_update_principal_signature(
  p_organization_id uuid,
  p_principal_name text,
  p_signature_url text
)
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
  set principal_name = nullif(trim(p_principal_name), ''),
      principal_signature_url = nullif(trim(p_signature_url), ''),
      updated_at = now()
  where id = p_organization_id
  returning * into updated_organization;
  return updated_organization;
end;
$$;

revoke all on function public.school_update_principal_signature(uuid, text, text) from public;
grant execute on function public.school_update_principal_signature(uuid, text, text) to authenticated;

create or replace function public.college_update_principal_signature(
  p_organization_id uuid,
  p_principal_name text,
  p_signature_url text
)
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
  set principal_name = nullif(trim(p_principal_name), ''),
      principal_signature_url = nullif(trim(p_signature_url), ''),
      updated_at = now()
  where id = p_organization_id
  returning * into updated_organization;
  return updated_organization;
end;
$$;

revoke all on function public.college_update_principal_signature(uuid, text, text) from public;
grant execute on function public.college_update_principal_signature(uuid, text, text) to authenticated;
