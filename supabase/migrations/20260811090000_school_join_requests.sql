-- ============================================
-- SCHOOL JOIN REQUESTS
-- Institutional signup counterpart to college_join_requests
-- (supabase/migrations/20260711130000_college_portal.sql), adapted to the
-- School ERP's organization_id / school_has_role() model instead of the
-- college portal's single college_admins table.
--
-- Adds: school_join_requests
-- A student or teacher who picks "Institutional" at signup (or later from
-- the school directory) requests to join an existing school_organizations
-- row. An owner/admin of that organization approves or declines it; on
-- approval a school_memberships row is created automatically. Assigning an
-- approved student to a specific class/section (school_enrollments) stays a
-- manual step for the admin via the existing People > Enroll student flow
-- (src/lib/school-erp/actions.ts:enrollStudent) — we don't have a section
-- or academic year at request time to do that automatically.
-- ============================================

create table if not exists public.school_join_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  role_requested text not null check (role_requested in ('student', 'teacher')),
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  unique (requester_id, organization_id)
);

-- A requester may only have ONE pending/approved request at a time, across all institutions.
create unique index if not exists school_join_requests_one_active_per_requester
  on public.school_join_requests (requester_id)
  where status in ('pending', 'approved');

create index if not exists school_join_requests_org_status_idx
  on public.school_join_requests (organization_id, status);

-- =========================================
-- Trigger: on approval, upsert the requester into school_memberships with
-- the approved role and auto-decline any other pending requests from the
-- same requester. Under normal operation the partial unique index above
-- already prevents a second pending/approved row from existing, so the
-- auto-decline branch is a defensive no-op, matching the equivalent college
-- portal trigger (handle_college_join_request_approval).
-- =========================================
create or replace function public.handle_school_join_request_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    insert into public.school_memberships (organization_id, profile_id, member_role, status)
    values (new.organization_id, new.requester_id, new.role_requested, 'active')
    on conflict (organization_id, profile_id, member_role)
    do update set status = 'active', updated_at = now();

    update public.school_join_requests
    set status = 'declined',
        resolved_at = now(),
        resolved_by = new.resolved_by
    where requester_id = new.requester_id
      and id <> new.id
      and status = 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_school_join_request_approval on public.school_join_requests;
create trigger trg_school_join_request_approval
  after update on public.school_join_requests
  for each row
  execute function public.handle_school_join_request_approval();

-- =========================================
-- RLS
-- =========================================
alter table public.school_join_requests enable row level security;

drop policy if exists "Requesters can create their own join request" on public.school_join_requests;
create policy "Requesters can create their own join request"
  on public.school_join_requests
  for insert
  with check (requester_id = auth.uid());

drop policy if exists "Requesters and org admins can view join requests" on public.school_join_requests;
create policy "Requesters and org admins can view join requests"
  on public.school_join_requests
  for select
  using (
    requester_id = auth.uid()
    or public.school_has_role(organization_id, array['owner', 'admin'])
  );

drop policy if exists "Requesters can cancel their own pending request" on public.school_join_requests;
create policy "Requesters can cancel their own pending request"
  on public.school_join_requests
  for delete
  using (requester_id = auth.uid() and status = 'pending');

drop policy if exists "Org admins can resolve join requests" on public.school_join_requests;
create policy "Org admins can resolve join requests"
  on public.school_join_requests
  for update
  using (public.school_has_role(organization_id, array['owner', 'admin']))
  with check (public.school_has_role(organization_id, array['owner', 'admin']));
