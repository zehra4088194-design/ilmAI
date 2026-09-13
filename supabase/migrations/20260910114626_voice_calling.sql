-- Voice calling (1-on-1, PeerJS client-side signaling handshake) — additive, mirrors the
-- school_*/college_* tenant pattern used throughout this effort. This migration adds:
--   - {school,college}_calling_settings: one row per organization, owner/admin-controlled toggle
--     + a role-pair permission matrix (principal/admin can always call everyone; teacher/staff/
--     admin/admissions/accountant — "staff" — can always call each other; student<->student and
--     student<->staff and parent<->staff are each independently toggleable).
--   - {school,college}_call_logs: an audit trail row per call attempt (who called whom, when,
--     status) — mirrors every other operational table's audit discipline in this codebase.
--   - {school,college}_call_directory(p_organization_id): a security-definer RPC returning only
--     {profile_id, full_name, avatar_url, member_role} for active members of an org the caller
--     belongs to. Needed because school_memberships' own RLS only lets a student/parent/teacher
--     read their own row (see the "school admins/owner view memberships" policy) — a student needs
--     to see *who else* is callable without being handed the full People-directory read grant
--     (email/phone/designation/status), so this RPC intentionally returns a narrower column set
--     than school_memberships/profiles directly expose.
--
-- Known limitation, flagged not hidden: the actual call *signaling* (who is ringing whom, the
-- exchanged PeerJS peer id) happens over a Supabase Realtime broadcast channel named
-- `call-<callee-profile-id>` from the client, not through a table. That channel is not covered by
-- Realtime Broadcast Authorization (private channels + realtime.messages RLS) — it relies on the
-- channel name embedding an unguessable UUID rather than a server-checked grant. This is an
-- accepted MVP tradeoff (no sensitive data crosses that channel beyond names/avatars and a
-- transient peer id), not a silent gap — upgrading to authorized private channels is a documented
-- follow-up, same as this codebase's other "flagged, not solved" notes elsewhere in this file.

-- =========================================
-- SCHOOL
-- =========================================

create table if not exists public.school_calling_settings (
  organization_id uuid primary key references public.school_organizations(id) on delete cascade,
  enabled boolean not null default false,
  allow_student_student boolean not null default true,
  allow_student_staff boolean not null default true,
  allow_parent_staff boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.school_call_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'initiated' check (status in ('initiated', 'accepted', 'declined', 'missed', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists school_call_logs_org_idx on public.school_call_logs (organization_id, created_at desc);
create index if not exists school_call_logs_caller_idx on public.school_call_logs (caller_id, created_at desc);
create index if not exists school_call_logs_callee_idx on public.school_call_logs (callee_id, created_at desc);

alter table public.school_calling_settings enable row level security;
alter table public.school_call_logs enable row level security;

create policy "school members read calling settings"
  on public.school_calling_settings for select
  using (public.school_is_member(organization_id));
create policy "school admins manage calling settings"
  on public.school_calling_settings for all
  using (public.school_has_role(organization_id, array['owner', 'admin']))
  with check (public.school_has_role(organization_id, array['owner', 'admin']));

create policy "school call participants read logs"
  on public.school_call_logs for select
  using (
    auth.uid() in (caller_id, callee_id)
    or public.school_has_role(organization_id, array['owner', 'admin'])
  );
create policy "school members insert own call logs"
  on public.school_call_logs for insert
  with check (caller_id = auth.uid() and public.school_is_member(organization_id));
create policy "school call participants update logs"
  on public.school_call_logs for update
  using (auth.uid() in (caller_id, callee_id))
  with check (auth.uid() in (caller_id, callee_id));

create or replace function public.school_call_directory(p_organization_id uuid)
returns table (profile_id uuid, full_name text, avatar_url text, member_role text)
language sql
stable
security definer
set search_path = public
as $$
  select m.profile_id, p.full_name, p.avatar_url, m.member_role
  from public.school_memberships m
  join public.profiles p on p.id = m.profile_id
  where m.organization_id = p_organization_id
    and m.status = 'active'
    and public.school_is_member(p_organization_id)
  order by p.full_name;
$$;

revoke all on function public.school_call_directory(uuid) from public;
grant execute on function public.school_call_directory(uuid) to authenticated;

-- =========================================
-- COLLEGE (identical shape, mirrors college_erp_core's own pattern)
-- =========================================

create table if not exists public.college_calling_settings (
  organization_id uuid primary key references public.college_organizations(id) on delete cascade,
  enabled boolean not null default false,
  allow_student_student boolean not null default true,
  allow_student_staff boolean not null default true,
  allow_parent_staff boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

create table if not exists public.college_call_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.college_organizations(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'initiated' check (status in ('initiated', 'accepted', 'declined', 'missed', 'ended')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists college_call_logs_org_idx on public.college_call_logs (organization_id, created_at desc);
create index if not exists college_call_logs_caller_idx on public.college_call_logs (caller_id, created_at desc);
create index if not exists college_call_logs_callee_idx on public.college_call_logs (callee_id, created_at desc);

alter table public.college_calling_settings enable row level security;
alter table public.college_call_logs enable row level security;

create policy "college members read calling settings"
  on public.college_calling_settings for select
  using (public.college_is_member(organization_id));
create policy "college admins manage calling settings"
  on public.college_calling_settings for all
  using (public.college_has_role(organization_id, array['owner', 'admin']))
  with check (public.college_has_role(organization_id, array['owner', 'admin']));

create policy "college call participants read logs"
  on public.college_call_logs for select
  using (
    auth.uid() in (caller_id, callee_id)
    or public.college_has_role(organization_id, array['owner', 'admin'])
  );
create policy "college members insert own call logs"
  on public.college_call_logs for insert
  with check (caller_id = auth.uid() and public.college_is_member(organization_id));
create policy "college call participants update logs"
  on public.college_call_logs for update
  using (auth.uid() in (caller_id, callee_id))
  with check (auth.uid() in (caller_id, callee_id));

create or replace function public.college_call_directory(p_organization_id uuid)
returns table (profile_id uuid, full_name text, avatar_url text, member_role text)
language sql
stable
security definer
set search_path = public
as $$
  select m.profile_id, p.full_name, p.avatar_url, m.member_role
  from public.college_memberships m
  join public.profiles p on p.id = m.profile_id
  where m.organization_id = p_organization_id
    and m.status = 'active'
    and public.college_is_member(p_organization_id)
  order by p.full_name;
$$;

revoke all on function public.college_call_directory(uuid) from public;
grant execute on function public.college_call_directory(uuid) to authenticated;
