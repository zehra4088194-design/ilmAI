-- ============================================
-- Voice Calling: Ensure call_logs tables exist
-- Run this in Supabase SQL Editor
-- ============================================
-- This migration ensures all required tables
-- and functions exist for voice calling feature.
-- Safe to run multiple times (idempotent).

-- ============================================
-- SCHOOL
-- ============================================

-- Settings table (org-level toggles)
create table if not exists public.school_calling_settings (
  organization_id uuid primary key references public.school_organizations(id) on delete cascade,
  enabled boolean not null default false,
  allow_student_student boolean not null default true,
  allow_student_staff boolean not null default true,
  allow_parent_staff boolean not null default true,
  updated_by uuid references public.profiles(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- Call logs table (audit trail)
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

-- Indexes for performance
create index if not exists school_call_logs_org_idx on public.school_call_logs (organization_id, created_at desc);
create index if not exists school_call_logs_caller_idx on public.school_call_logs (caller_id, created_at desc);
create index if not exists school_call_logs_callee_idx on public.school_call_logs (callee_id, created_at desc);

-- RLS policies
alter table public.school_calling_settings enable row level security;
alter table public.school_call_logs enable row level security;

create policy if not exists "school members read calling settings"
  on public.school_calling_settings for select
  using (public.school_is_member(organization_id));

create policy if not exists "school admins manage calling settings"
  on public.school_calling_settings for all
  using (public.school_has_role(organization_id, array['owner', 'admin']))
  with check (public.school_has_role(organization_id, array['owner', 'admin']));

create policy if not exists "school call participants read logs"
  on public.school_call_logs for select
  using (
    auth.uid() in (caller_id, callee_id)
    or public.school_has_role(organization_id, array['owner', 'admin'])
  );

create policy if not exists "school members insert own call logs"
  on public.school_call_logs for insert
  with check (caller_id = auth.uid() and public.school_is_member(organization_id));

create policy if not exists "school call participants update logs"
  on public.school_call_logs for update
  using (auth.uid() in (caller_id, callee_id))
  with check (auth.uid() in (caller_id, callee_id));

-- Directory RPC (narrow view for students/parents)
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

-- ============================================
-- COLLEGE (mirror)
-- ============================================

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

create policy if not exists "college members read calling settings"
  on public.college_calling_settings for select
  using (public.college_is_member(organization_id));

create policy if not exists "college admins manage calling settings"
  on public.college_calling_settings for all
  using (public.college_has_role(organization_id, array['owner', 'admin']))
  with check (public.college_has_role(organization_id, array['owner', 'admin']));

create policy if not exists "college call participants read logs"
  on public.college_call_logs for select
  using (
    auth.uid() in (caller_id, callee_id)
    or public.college_has_role(organization_id, array['owner', 'admin'])
  );

create policy if not exists "college members insert own call logs"
  on public.college_call_logs for insert
  with check (caller_id = auth.uid() and public.college_is_member(organization_id));

create policy if not exists "college call participants update logs"
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
