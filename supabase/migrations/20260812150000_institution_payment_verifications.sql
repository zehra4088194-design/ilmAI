-- Master prompt Part 6.2: manual/local payment checkout for institution plan
-- purchase (JazzCash/Easypaisa/Bank Transfer/Card). One deliberately SHARED
-- table across school and college (same reasoning as institution_directory_messages
-- in the college-parity migration) — `organization_id` is not a real FK since it can
-- point at either school_organizations or college_organizations, so authorization
-- runs through a dispatcher security-definer function instead of referential
-- integrity, mirroring is_institution_principal().

create or replace function public.is_institution_owner_or_admin(p_institution_type text, p_organization_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if p_institution_type = 'school' then
    return public.school_has_role(p_organization_id, array['owner', 'admin']);
  elsif p_institution_type = 'college' then
    return public.college_has_role(p_organization_id, array['owner', 'admin']);
  end if;
  return false;
end;
$$;

create table if not exists public.institution_payment_verifications (
  id uuid primary key default gen_random_uuid(),
  institution_type text not null check (institution_type in ('school', 'college')),
  organization_id uuid not null,
  plan_tier_id uuid references public.institution_plan_tiers(id) on delete set null,
  billing_cycle text not null default 'monthly' check (billing_cycle in ('monthly', 'annual')),
  amount_usd numeric(10,2) not null default 0 check (amount_usd >= 0),
  amount_pkr numeric(12,2) not null default 0 check (amount_pkr >= 0),
  method text not null check (method in ('jazzcash', 'easypaisa', 'bank_transfer', 'card')),
  contact_email text not null,
  notes text,
  status text not null default 'pending_review' check (status in ('pending_review', 'verified', 'rejected')),
  submitted_by uuid references public.profiles(id) on delete set null,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  review_notes text,
  created_at timestamptz not null default now()
);

create index if not exists institution_payment_verifications_org_idx
  on public.institution_payment_verifications (institution_type, organization_id);
create index if not exists institution_payment_verifications_status_idx
  on public.institution_payment_verifications (status);

comment on table public.institution_payment_verifications is
  'Master prompt Part 6.2 — pending JazzCash/Easypaisa/Bank/Card institution-plan payment claims awaiting manual admin verification. Verifying one activates the matching school_organization_plan_settings / college_organization_plan_settings row via the app-layer review action, not a DB trigger, since it must also call the existing syncOrganization{School,College}Grants() cascade.';

alter table public.institution_payment_verifications enable row level security;

drop policy if exists institution_payment_verifications_insert on public.institution_payment_verifications;
create policy institution_payment_verifications_insert on public.institution_payment_verifications
  for insert
  with check (public.is_institution_owner_or_admin(institution_type, organization_id));

drop policy if exists institution_payment_verifications_select on public.institution_payment_verifications;
create policy institution_payment_verifications_select on public.institution_payment_verifications
  for select
  using (
    public.is_institution_owner_or_admin(institution_type, organization_id)
    or public.school_is_platform_admin()
  );

-- Review (verify/reject) is intentionally left to the service-role admin action
-- (requireAdminUser() gate) rather than a user-facing RLS update policy — the
-- same pattern every other /admin write path in this codebase already uses.
