-- School communication: a school-owned student record extension for quick-enrolled students.
-- Keep sensitive identifiers in the school ERP database, scoped by organization + student.
create table if not exists public.school_student_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  b_form_number text,
  father_cnic text,
  matric_total_marks numeric(8,2),
  matric_obtained_marks numeric(8,2),
  matric_year integer,
  date_of_birth date,
  gender text,
  blood_group text,
  student_phone text,
  address text,
  city text,
  guardian_name text,
  guardian_phone text,
  guardian_relationship text,
  emergency_contact_name text,
  emergency_contact_phone text,
  previous_school text,
  nationality text,
  religion text,
  photo_url text,
  extra_details jsonb not null default '{}'::jsonb,
  is_profile_complete boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, student_id)
);
create index if not exists school_student_records_org_idx on public.school_student_records(organization_id);
create index if not exists school_student_records_student_idx on public.school_student_records(student_id);

alter table public.school_student_records enable row level security;

drop policy if exists school_student_records_student_select on public.school_student_records;
create policy school_student_records_student_select on public.school_student_records
for select using (
  student_id = auth.uid()
  or exists (
    select 1 from public.school_memberships m
    where m.organization_id = school_student_records.organization_id
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and m.member_role in ('owner','admin','coordinator','admissions','teacher','staff')
  )
);

drop policy if exists school_student_records_student_write on public.school_student_records;
create policy school_student_records_student_write on public.school_student_records
for all using (
  student_id = auth.uid()
  or exists (
    select 1 from public.school_memberships m
    where m.organization_id = school_student_records.organization_id
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and m.member_role in ('owner','admin','coordinator','admissions')
  )
) with check (
  student_id = auth.uid()
  or exists (
    select 1 from public.school_memberships m
    where m.organization_id = school_student_records.organization_id
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and m.member_role in ('owner','admin','coordinator','admissions')
  )
);

-- Group chat is deliberately separate from direct_conversations because it has many participants.
create table if not exists public.school_communication_groups (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  name text not null,
  group_type text not null default 'custom' check (group_type in ('class','custom')),
  section_id uuid,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists school_communication_groups_class_unique
  on public.school_communication_groups(organization_id, section_id)
  where group_type = 'class' and section_id is not null;
create index if not exists school_communication_groups_org_idx on public.school_communication_groups(organization_id);

create table if not exists public.school_communication_group_members (
  group_id uuid not null references public.school_communication_groups(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);
create index if not exists school_communication_group_members_profile_idx
  on public.school_communication_group_members(profile_id);

create table if not exists public.school_communication_group_messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.school_communication_groups(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(trim(content)) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists school_communication_group_messages_group_idx
  on public.school_communication_group_messages(group_id, created_at);

alter table public.school_communication_groups enable row level security;
alter table public.school_communication_group_members enable row level security;
alter table public.school_communication_group_messages enable row level security;

drop policy if exists school_communication_groups_member_select on public.school_communication_groups;
create policy school_communication_groups_member_select on public.school_communication_groups
for select using (
  exists (
    select 1 from public.school_communication_group_members gm
    where gm.group_id = school_communication_groups.id and gm.profile_id = auth.uid()
  )
);

drop policy if exists school_communication_group_members_member_select on public.school_communication_group_members;
create policy school_communication_group_members_member_select on public.school_communication_group_members
for select using (
  exists (
    select 1 from public.school_communication_group_members own
    where own.group_id = school_communication_group_members.group_id and own.profile_id = auth.uid()
  )
);

drop policy if exists school_communication_group_messages_member_select on public.school_communication_group_messages;
create policy school_communication_group_messages_member_select on public.school_communication_group_messages
for select using (
  exists (
    select 1 from public.school_communication_group_members gm
    where gm.group_id = school_communication_group_messages.group_id and gm.profile_id = auth.uid()
  )
);

drop policy if exists school_communication_group_messages_member_insert on public.school_communication_group_messages;
create policy school_communication_group_messages_member_insert on public.school_communication_group_messages
for insert with check (
  sender_id = auth.uid()
  and exists (
    select 1 from public.school_communication_group_members gm
    where gm.group_id = school_communication_group_messages.group_id and gm.profile_id = auth.uid()
  )
);
