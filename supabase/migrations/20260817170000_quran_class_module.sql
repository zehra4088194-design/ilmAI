-- Quran Class module: platform-admin-managed live voice/video groups (a child
-- reads/recites Quran with a teacher every morning). Deliberately NOT under
-- school_erp/college_erp — per the owner's explicit "teacher sirf main admin
-- panel se add karoonga" instruction, teachers here are added directly by the
-- platform admin (not a school principal), so this is standalone, global module
-- data, same tier as university_hub.

create table if not exists public.quran_teachers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade unique,
  bio text,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.quran_groups (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  teacher_id uuid not null references public.quran_teachers(id) on delete cascade,
  -- Local (Pakistan) time of day the session starts, e.g. '06:30'.
  session_time time not null,
  -- ISO weekday numbers, 1=Monday..7=Sunday. Defaults to every day.
  days_of_week int[] not null default '{1,2,3,4,5,6,7}',
  livekit_room_name text not null unique,
  status text not null default 'active' check (status in ('active', 'paused', 'archived')),
  max_students integer not null default 15 check (max_students > 0),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_quran_groups_teacher on public.quran_groups (teacher_id);

create table if not exists public.quran_group_members (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.quran_groups(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'removed')),
  added_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (group_id, student_id)
);
create index if not exists idx_quran_group_members_student on public.quran_group_members (student_id);

-- Simple join/leave attendance log — a nice-to-have parents will actually want
-- (per-day, did my child attend?), cheap to add alongside the core call plumbing.
create table if not exists public.quran_attendance (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.quran_groups(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  session_date date not null default current_date,
  joined_at timestamptz not null default now(),
  left_at timestamptz,
  unique (group_id, student_id, session_date)
);

alter table public.quran_teachers enable row level security;
alter table public.quran_groups enable row level security;
alter table public.quran_group_members enable row level security;
alter table public.quran_attendance enable row level security;

-- Platform-admin check, mirroring school_is_platform_admin()/college_is_platform_admin().
create or replace function public.quran_is_platform_admin()
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  );
$$;

create or replace function public.quran_is_teacher_of(p_teacher_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.quran_teachers
    where id = p_teacher_id and profile_id = auth.uid()
  );
$$;

create or replace function public.quran_is_group_teacher(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.quran_groups g
    join public.quran_teachers t on t.id = g.teacher_id
    where g.id = p_group_id and t.profile_id = auth.uid()
  );
$$;

create or replace function public.quran_is_group_member(p_group_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.quran_group_members
    where group_id = p_group_id and student_id = auth.uid() and status = 'active'
  );
$$;

drop policy if exists quran_teachers_select on public.quran_teachers;
create policy quran_teachers_select on public.quran_teachers for select
  using (public.quran_is_platform_admin() or profile_id = auth.uid());
drop policy if exists quran_teachers_write on public.quran_teachers;
create policy quran_teachers_write on public.quran_teachers for all
  using (public.quran_is_platform_admin()) with check (public.quran_is_platform_admin());

drop policy if exists quran_groups_select on public.quran_groups;
create policy quran_groups_select on public.quran_groups for select
  using (public.quran_is_platform_admin() or public.quran_is_group_teacher(id) or public.quran_is_group_member(id));
drop policy if exists quran_groups_write on public.quran_groups;
create policy quran_groups_write on public.quran_groups for all
  using (public.quran_is_platform_admin()) with check (public.quran_is_platform_admin());

drop policy if exists quran_group_members_select on public.quran_group_members;
create policy quran_group_members_select on public.quran_group_members for select
  using (
    public.quran_is_platform_admin()
    or public.quran_is_group_teacher(group_id)
    or student_id = auth.uid()
  );
drop policy if exists quran_group_members_write on public.quran_group_members;
create policy quran_group_members_write on public.quran_group_members for all
  using (public.quran_is_platform_admin()) with check (public.quran_is_platform_admin());

drop policy if exists quran_attendance_select on public.quran_attendance;
create policy quran_attendance_select on public.quran_attendance for select
  using (
    public.quran_is_platform_admin()
    or public.quran_is_group_teacher(group_id)
    or student_id = auth.uid()
  );
drop policy if exists quran_attendance_insert on public.quran_attendance;
create policy quran_attendance_insert on public.quran_attendance for insert
  with check (student_id = auth.uid() and public.quran_is_group_member(group_id));
drop policy if exists quran_attendance_update on public.quran_attendance;
create policy quran_attendance_update on public.quran_attendance for update
  using (student_id = auth.uid())
  with check (student_id = auth.uid());
