alter table public.profiles add column if not exists college_id uuid;
alter table public.profiles add column if not exists college_department_id uuid;

create table if not exists public.colleges (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  city text,
  slug text unique,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_college_id_fkey') then
    alter table public.profiles
      add constraint profiles_college_id_fkey foreign key (college_id) references public.colleges(id) on delete set null;
  end if;
end $$;

create table if not exists public.college_admins (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(college_id, user_id)
);

create table if not exists public.college_join_requests (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(college_id, student_id)
);

create table if not exists public.college_lectures (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  title text not null,
  video_url text,
  resource_url text,
  semester text,
  created_at timestamptz not null default now()
);

create table if not exists public.college_resources (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  title text not null,
  resource_url text not null,
  file_type text default 'other',
  semester text,
  created_at timestamptz not null default now()
);

create table if not exists public.college_departments (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_college_department_id_fkey') then
    alter table public.profiles
      add constraint profiles_college_department_id_fkey foreign key (college_department_id) references public.college_departments(id) on delete set null;
  end if;
end $$;

create table if not exists public.college_faculty (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  department_id uuid references public.college_departments(id),
  full_name text not null,
  designation text,
  email text,
  photo_url text,
  created_at timestamptz not null default now()
);

alter table public.college_lectures add column if not exists department_id uuid references public.college_departments(id);
alter table public.college_resources add column if not exists department_id uuid references public.college_departments(id);

create table if not exists public.college_notices (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  department_id uuid references public.college_departments(id),
  title text not null,
  body text,
  posted_by uuid references public.profiles(id),
  pinned boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.college_discussions (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  department_id uuid references public.college_departments(id),
  student_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  created_at timestamptz not null default now()
);

create table if not exists public.college_discussion_replies (
  id uuid primary key default uuid_generate_v4(),
  discussion_id uuid not null references public.college_discussions(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.college_placements (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  company_name text not null,
  role text,
  description text,
  application_deadline date,
  external_url text,
  posted_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.college_events (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  department_id uuid references public.college_departments(id),
  title text not null,
  description text,
  event_date timestamptz not null,
  location text,
  created_at timestamptz not null default now()
);

create table if not exists public.college_timetable_entries (
  id uuid primary key default uuid_generate_v4(),
  college_id uuid not null references public.colleges(id) on delete cascade,
  department_id uuid not null references public.college_departments(id) on delete cascade,
  semester text,
  day_of_week integer not null check (day_of_week between 0 and 6),
  start_time time not null,
  end_time time not null,
  course_name text not null,
  faculty_id uuid references public.college_faculty(id),
  room text,
  created_at timestamptz not null default now()
);

alter table public.colleges enable row level security;
alter table public.college_admins enable row level security;
alter table public.college_join_requests enable row level security;
alter table public.college_lectures enable row level security;
alter table public.college_resources enable row level security;
alter table public.college_departments enable row level security;
alter table public.college_faculty enable row level security;
alter table public.college_notices enable row level security;
alter table public.college_discussions enable row level security;
alter table public.college_discussion_replies enable row level security;
alter table public.college_placements enable row level security;
alter table public.college_events enable row level security;
alter table public.college_timetable_entries enable row level security;

create or replace function public.is_college_admin(p_college_id uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.college_admins a
    where a.college_id = p_college_id and a.user_id = auth.uid()
  ) or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'
  )
$$;

create or replace function public.is_college_member(p_college_id uuid)
returns boolean language sql stable security definer as $$
  select public.is_college_admin(p_college_id) or exists (
    select 1 from public.profiles p where p.id = auth.uid() and p.college_id = p_college_id
  )
$$;

drop policy if exists "members read colleges" on public.colleges;
create policy "members read colleges" on public.colleges for select using (public.is_college_member(id));

drop policy if exists "admins manage colleges" on public.colleges;
create policy "admins manage colleges" on public.colleges for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')) with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "college admins visible" on public.college_admins;
create policy "college admins visible" on public.college_admins for select using (public.is_college_member(college_id));

drop policy if exists "super admin manages college admins" on public.college_admins;
create policy "super admin manages college admins" on public.college_admins
  for all using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin'));

drop policy if exists "students manage own college requests" on public.college_join_requests;
create policy "students manage own college requests" on public.college_join_requests for all using (auth.uid() = student_id or public.is_college_admin(college_id)) with check (auth.uid() = student_id or public.is_college_admin(college_id));

drop policy if exists "members read college lectures" on public.college_lectures;
create policy "members read college lectures" on public.college_lectures for select using (public.is_college_member(college_id));
drop policy if exists "admins manage college lectures" on public.college_lectures;
create policy "admins manage college lectures" on public.college_lectures for all using (public.is_college_admin(college_id)) with check (public.is_college_admin(college_id));

drop policy if exists "members read college resources" on public.college_resources;
create policy "members read college resources" on public.college_resources for select using (public.is_college_member(college_id));
drop policy if exists "admins manage college resources" on public.college_resources;
create policy "admins manage college resources" on public.college_resources for all using (public.is_college_admin(college_id)) with check (public.is_college_admin(college_id));

drop policy if exists "members read college departments" on public.college_departments;
create policy "members read college departments" on public.college_departments for select using (public.is_college_member(college_id));
drop policy if exists "admins manage college departments" on public.college_departments;
create policy "admins manage college departments" on public.college_departments for all using (public.is_college_admin(college_id)) with check (public.is_college_admin(college_id));

drop policy if exists "members read college faculty" on public.college_faculty;
create policy "members read college faculty" on public.college_faculty for select using (public.is_college_member(college_id));
drop policy if exists "admins manage college faculty" on public.college_faculty;
create policy "admins manage college faculty" on public.college_faculty for all using (public.is_college_admin(college_id)) with check (public.is_college_admin(college_id));

drop policy if exists "members read college notices" on public.college_notices;
create policy "members read college notices" on public.college_notices for select using (public.is_college_member(college_id));
drop policy if exists "admins manage college notices" on public.college_notices;
create policy "admins manage college notices" on public.college_notices for all using (public.is_college_admin(college_id)) with check (public.is_college_admin(college_id));

drop policy if exists "members manage college discussions" on public.college_discussions;
create policy "members manage college discussions" on public.college_discussions for all using (public.is_college_member(college_id) and (auth.uid() = student_id or public.is_college_admin(college_id))) with check (public.is_college_member(college_id) and (auth.uid() = student_id or public.is_college_admin(college_id)));

drop policy if exists "members read discussion replies" on public.college_discussion_replies;
create policy "members read discussion replies" on public.college_discussion_replies for select using (exists (select 1 from public.college_discussions d where d.id = discussion_id and public.is_college_member(d.college_id)));
drop policy if exists "members create discussion replies" on public.college_discussion_replies;
create policy "members create discussion replies" on public.college_discussion_replies for insert with check (auth.uid() = author_id and exists (select 1 from public.college_discussions d where d.id = discussion_id and public.is_college_member(d.college_id)));

drop policy if exists "members read college placements" on public.college_placements;
create policy "members read college placements" on public.college_placements for select using (public.is_college_member(college_id));
drop policy if exists "admins manage college placements" on public.college_placements;
create policy "admins manage college placements" on public.college_placements for all using (public.is_college_admin(college_id)) with check (public.is_college_admin(college_id));

drop policy if exists "members read college events" on public.college_events;
create policy "members read college events" on public.college_events for select using (public.is_college_member(college_id));
drop policy if exists "admins manage college events" on public.college_events;
create policy "admins manage college events" on public.college_events for all using (public.is_college_admin(college_id)) with check (public.is_college_admin(college_id));

drop policy if exists "members read college timetable" on public.college_timetable_entries;
create policy "members read college timetable" on public.college_timetable_entries for select using (public.is_college_member(college_id));
drop policy if exists "admins manage college timetable" on public.college_timetable_entries;
create policy "admins manage college timetable" on public.college_timetable_entries for all using (public.is_college_admin(college_id)) with check (public.is_college_admin(college_id));
