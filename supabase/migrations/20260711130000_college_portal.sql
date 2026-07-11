-- ============================================
-- COLLEGE PORTAL MODULE
-- Adds: colleges, college_admins, college_join_requests,
--       college_lectures, college_resources
-- Modifies: profiles (adds college_id)
--
-- Conventions matched to the existing ilm AI schema/RLS style:
--   - uuid_generate_v4() for PKs (see database/migrations/001_initial_schema.sql)
--   - RLS style matches database/rls/001_rls_policies.sql:
--       "public read, admin write (handled via service role)" for
--       super-admin-only tables (colleges, college_admins) -> only SELECT
--       policies are defined here; creates/updates/deletes for those two
--       tables are expected to go through supabase.auth.admin / the
--       service-role client (createAdminClient() in src/lib/supabase/server.ts),
--       gated by the app's existing ADMIN_EMAILS check — NOT by RLS.
--     Tables that are genuinely per-user/per-college-admin operations
--     (join requests, lectures, resources) get full auth.uid()-based RLS,
--     matching the "quiz_sessions: strictly own-data" style already used.
-- ============================================

create extension if not exists "uuid-ossp";

-- =========================================
-- 1. colleges
-- =========================================
create table if not exists public.colleges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  slug text not null unique,
  city text,
  logo_url text,
  cover_url text,
  description text,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists colleges_is_active_idx on public.colleges (is_active);
create index if not exists colleges_slug_idx on public.colleges (slug);

-- =========================================
-- 2. college_admins
-- One row = one profile manages one college. Reassignment is enforced at the
-- application layer (assignCollegeAdmin() deletes any existing row for the
-- college before inserting the new one) rather than via a DB constraint,
-- since the spec only requires uniqueness on profile_id, not college_id.
-- =========================================
create table if not exists public.college_admins (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  assigned_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists college_admins_college_id_idx on public.college_admins (college_id);

-- =========================================
-- 3. college_join_requests
-- =========================================
create table if not exists public.college_join_requests (
  id uuid primary key default uuid_generate_v4(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  college_id uuid not null references public.colleges(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending', 'approved', 'declined')),
  requested_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id),
  unique (student_id, college_id)
);

-- A student may only have ONE pending/approved request at a time, across all colleges.
create unique index if not exists college_join_requests_one_active_per_student
  on public.college_join_requests (student_id)
  where status in ('pending', 'approved');

create index if not exists college_join_requests_college_status_idx
  on public.college_join_requests (college_id, status);

-- =========================================
-- 4. profiles.college_id
-- =========================================
alter table public.profiles
  add column if not exists college_id uuid references public.colleges(id);

create index if not exists profiles_college_id_idx on public.profiles (college_id);

-- =========================================
-- 5. college_lectures
-- =========================================
create table if not exists public.college_lectures (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  title text not null,
  description text,
  course_name text,
  semester text,
  video_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists college_lectures_college_id_idx on public.college_lectures (college_id);

-- =========================================
-- 6. college_resources
-- =========================================
create table if not exists public.college_resources (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  uploaded_by uuid not null references public.profiles(id),
  title text not null,
  resource_type text not null check (resource_type in ('notes', 'past_paper', 'slides', 'other')),
  course_name text,
  semester text,
  file_url text not null,
  created_at timestamptz not null default now()
);

create index if not exists college_resources_college_id_idx on public.college_resources (college_id);

-- =========================================
-- Trigger: on approval, set profiles.college_id and auto-decline any other
-- pending requests from the same student. Under normal operation the
-- partial unique index above already prevents a second pending/approved
-- row from existing, so the auto-decline branch is a defensive no-op — it
-- only matters if that invariant is ever bypassed (bulk imports, manual
-- edits, a future relaxation of the constraint, etc.).
-- =========================================
create or replace function public.handle_college_join_request_approval()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status = 'approved' and old.status is distinct from 'approved' then
    update public.profiles
    set college_id = new.college_id
    where id = new.student_id;

    update public.college_join_requests
    set status = 'declined',
        resolved_at = now(),
        resolved_by = new.resolved_by
    where student_id = new.student_id
      and id <> new.id
      and status = 'pending';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_college_join_request_approval on public.college_join_requests;
create trigger trg_college_join_request_approval
  after update on public.college_join_requests
  for each row
  execute function public.handle_college_join_request_approval();

-- =========================================
-- RLS
-- =========================================
alter table public.colleges enable row level security;
alter table public.college_admins enable row level security;
alter table public.college_join_requests enable row level security;
alter table public.college_lectures enable row level security;
alter table public.college_resources enable row level security;

-- ---- colleges: public read only. Creates/updates/deletes go through the
-- ---- service-role client (see src/lib/college/actions/super-admin.ts),
-- ---- matching how subjects/chapters/topics are administered today.
create policy "Colleges are viewable by everyone"
  on public.colleges
  for select
  using (true);
-- NOTE: RLS is row-level, not column-level. The spec's "public columns"
-- subset (name, slug, city, logo_url, description, is_active) is enforced
-- by only ever selecting those columns in public-facing queries
-- (see getActiveColleges / getCollegeBySlug in src/lib/college/queries.ts),
-- not by hiding columns at the database layer.

-- ---- college_admins: a college admin can see their own assignment row.
-- ---- (Reads for the super-admin UI happen via the service-role client.)
create policy "College admins can view their own assignment"
  on public.college_admins
  for select
  using (profile_id = auth.uid());

-- ---- college_join_requests: student owns their request; the assigned
-- ---- college admin can see/resolve requests for their college.
create policy "Students can create their own join request"
  on public.college_join_requests
  for insert
  with check (student_id = auth.uid());

create policy "Students can view their own join request"
  on public.college_join_requests
  for select
  using (
    student_id = auth.uid()
    or exists (
      select 1 from public.college_admins ca
      where ca.college_id = college_join_requests.college_id
        and ca.profile_id = auth.uid()
    )
  );

create policy "Students can cancel their own pending request"
  on public.college_join_requests
  for delete
  using (student_id = auth.uid() and status = 'pending');

create policy "College admins can resolve requests for their college"
  on public.college_join_requests
  for update
  using (
    exists (
      select 1 from public.college_admins ca
      where ca.college_id = college_join_requests.college_id
        and ca.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.college_admins ca
      where ca.college_id = college_join_requests.college_id
        and ca.profile_id = auth.uid()
    )
  );

-- ---- college_lectures: approved students of the college + that college's
-- ---- admin can read; only that college's admin can write.
create policy "College lectures are viewable by the college's students and admin"
  on public.college_lectures
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.college_id = college_lectures.college_id
    )
    or exists (
      select 1 from public.college_admins ca
      where ca.college_id = college_lectures.college_id and ca.profile_id = auth.uid()
    )
  );

create policy "College admins manage their own lectures"
  on public.college_lectures
  for all
  using (
    exists (
      select 1 from public.college_admins ca
      where ca.college_id = college_lectures.college_id and ca.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.college_admins ca
      where ca.college_id = college_lectures.college_id and ca.profile_id = auth.uid()
    )
  );

-- ---- college_resources: mirrors college_lectures.
create policy "College resources are viewable by the college's students and admin"
  on public.college_resources
  for select
  using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid() and p.college_id = college_resources.college_id
    )
    or exists (
      select 1 from public.college_admins ca
      where ca.college_id = college_resources.college_id and ca.profile_id = auth.uid()
    )
  );

create policy "College admins manage their own resources"
  on public.college_resources
  for all
  using (
    exists (
      select 1 from public.college_admins ca
      where ca.college_id = college_resources.college_id and ca.profile_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.college_admins ca
      where ca.college_id = college_resources.college_id and ca.profile_id = auth.uid()
    )
  );
