-- Online Parent-Teacher Meeting (PTM) module.
-- Additive only: new tables, new policies, new triggers. Nothing existing is touched.
-- Follows the same tenant-scoping, RLS-helper, and notification patterns as
-- 20260727100000_school_erp_core.sql (school_is_member / school_has_role /
-- school_can_view_student, public.notifications for in-app alerts).

create table if not exists public.school_ptm_slots (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  campus_id uuid references public.school_campuses(id) on delete set null,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  meeting_mode text not null default 'online' check (meeting_mode in ('online', 'in_person')),
  location text,
  max_participants integer not null default 1 check (max_participants > 0),
  is_open boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.school_ptm_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  campus_id uuid references public.school_campuses(id) on delete set null,
  slot_id uuid references public.school_ptm_slots(id) on delete set null,
  teacher_id uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.profiles(id) on delete set null,
  requested_by uuid not null references public.profiles(id) on delete cascade,
  meeting_mode text not null default 'online' check (meeting_mode in ('online', 'in_person')),
  join_link text,
  location text,
  topic text,
  starts_at timestamptz,
  ends_at timestamptz,
  status text not null default 'requested'
    check (status in ('requested', 'approved', 'scheduled', 'completed', 'cancelled', 'rescheduled', 'missed')),
  teacher_response text,
  cancel_reason text,
  rescheduled_from_id uuid references public.school_ptm_requests(id) on delete set null,
  reminder_sent_at timestamptz,
  responded_by uuid references public.profiles(id) on delete set null,
  responded_at timestamptz,
  completed_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at > starts_at)
);

create table if not exists public.school_ptm_participants (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  request_id uuid not null references public.school_ptm_requests(id) on delete cascade,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  participant_role text not null check (participant_role in ('teacher', 'parent', 'student', 'admin', 'staff')),
  rsvp_status text not null default 'invited' check (rsvp_status in ('invited', 'confirmed', 'declined', 'attended', 'no_show')),
  created_at timestamptz not null default now(),
  unique (request_id, profile_id)
);

create table if not exists public.school_ptm_notes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  request_id uuid not null references public.school_ptm_requests(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  note text not null,
  visibility text not null default 'shared' check (visibility in ('shared', 'internal')),
  created_at timestamptz not null default now()
);

-- Composite tenant keys reject cross-organization foreign-key references,
-- matching the pattern used for every other school_erp child table.
create unique index if not exists school_ptm_slots_id_org_uidx on public.school_ptm_slots (id, organization_id);
create unique index if not exists school_ptm_requests_id_org_uidx on public.school_ptm_requests (id, organization_id);

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'school_ptm_slots_campus_tenant_fk'
  ) then
    alter table public.school_ptm_slots add constraint school_ptm_slots_campus_tenant_fk
      foreign key (campus_id, organization_id) references public.school_campuses (id, organization_id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'school_ptm_requests_campus_tenant_fk'
  ) then
    alter table public.school_ptm_requests add constraint school_ptm_requests_campus_tenant_fk
      foreign key (campus_id, organization_id) references public.school_campuses (id, organization_id);
  end if;
  if not exists (
    select 1 from pg_constraint where conname = 'school_ptm_requests_slot_tenant_fk'
  ) then
    alter table public.school_ptm_requests add constraint school_ptm_requests_slot_tenant_fk
      foreign key (slot_id, organization_id) references public.school_ptm_slots (id, organization_id);
  end if;
end $$;

-- Indexes required for the PTM dashboards and status/date filtering.
create index if not exists school_ptm_slots_org_open_idx
  on public.school_ptm_slots (organization_id, is_open, starts_at);
create index if not exists school_ptm_slots_teacher_idx
  on public.school_ptm_slots (teacher_id, starts_at);

create index if not exists school_ptm_requests_org_status_idx
  on public.school_ptm_requests (organization_id, status);
create index if not exists school_ptm_requests_starts_idx
  on public.school_ptm_requests (starts_at);
create index if not exists school_ptm_requests_teacher_idx
  on public.school_ptm_requests (teacher_id, starts_at);
create index if not exists school_ptm_requests_student_idx
  on public.school_ptm_requests (student_id, starts_at);
create index if not exists school_ptm_requests_parent_idx
  on public.school_ptm_requests (parent_id, starts_at);
create index if not exists school_ptm_requests_slot_idx
  on public.school_ptm_requests (slot_id);
create index if not exists school_ptm_requests_reminder_idx
  on public.school_ptm_requests (status, starts_at, reminder_sent_at);

create index if not exists school_ptm_participants_request_idx
  on public.school_ptm_participants (request_id);
create index if not exists school_ptm_participants_profile_idx
  on public.school_ptm_participants (profile_id);

create index if not exists school_ptm_notes_request_idx
  on public.school_ptm_notes (request_id, created_at desc);

alter table public.school_ptm_slots enable row level security;
alter table public.school_ptm_requests enable row level security;
alter table public.school_ptm_participants enable row level security;
alter table public.school_ptm_notes enable row level security;

drop policy if exists "ptm slots visible to school members" on public.school_ptm_slots;
create policy "ptm slots visible to school members"
  on public.school_ptm_slots for select
  using (public.school_is_member(organization_id));

drop policy if exists "teachers and admins manage ptm slots" on public.school_ptm_slots;
create policy "teachers and admins manage ptm slots"
  on public.school_ptm_slots for all
  using (teacher_id = auth.uid() or public.school_has_role(organization_id, array['owner', 'admin']))
  with check (teacher_id = auth.uid() or public.school_has_role(organization_id, array['owner', 'admin']));

drop policy if exists "ptm requests visible by relationship" on public.school_ptm_requests;
create policy "ptm requests visible by relationship"
  on public.school_ptm_requests for select
  using (
    teacher_id = auth.uid()
    or parent_id = auth.uid()
    or requested_by = auth.uid()
    or student_id = auth.uid()
    or public.school_can_view_student(organization_id, student_id)
    or public.school_has_role(organization_id, array['owner', 'admin'])
  );

drop policy if exists "members request ptm meetings" on public.school_ptm_requests;
create policy "members request ptm meetings"
  on public.school_ptm_requests for insert
  with check (
    requested_by = auth.uid()
    and created_by = auth.uid()
    and (
      public.school_has_role(organization_id, array['owner', 'admin'])
      or teacher_id = auth.uid()
      or exists (
        select 1 from public.school_guardians g
        where g.organization_id = school_ptm_requests.organization_id
          and g.student_id = school_ptm_requests.student_id
          and g.guardian_id = auth.uid()
      )
    )
  );

drop policy if exists "teachers and admins manage ptm requests" on public.school_ptm_requests;
create policy "teachers and admins manage ptm requests"
  on public.school_ptm_requests for update
  using (teacher_id = auth.uid() or public.school_has_role(organization_id, array['owner', 'admin']))
  with check (teacher_id = auth.uid() or public.school_has_role(organization_id, array['owner', 'admin']));

drop policy if exists "requesters cancel own ptm requests" on public.school_ptm_requests;
create policy "requesters cancel own ptm requests"
  on public.school_ptm_requests for update
  using (requested_by = auth.uid() or parent_id = auth.uid())
  with check (status = 'cancelled');

drop policy if exists "ptm participants visible by request relationship" on public.school_ptm_participants;
create policy "ptm participants visible by request relationship"
  on public.school_ptm_participants for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.school_ptm_requests r
      where r.id = school_ptm_participants.request_id
        and (
          r.teacher_id = auth.uid() or r.parent_id = auth.uid() or r.requested_by = auth.uid()
          or public.school_can_view_student(r.organization_id, r.student_id)
          or public.school_has_role(r.organization_id, array['owner', 'admin'])
        )
    )
  );

drop policy if exists "teachers and admins manage ptm participants" on public.school_ptm_participants;
create policy "teachers and admins manage ptm participants"
  on public.school_ptm_participants for all
  using (
    exists (
      select 1 from public.school_ptm_requests r
      where r.id = school_ptm_participants.request_id
        and (r.teacher_id = auth.uid() or public.school_has_role(r.organization_id, array['owner', 'admin']))
    )
  )
  with check (
    exists (
      select 1 from public.school_ptm_requests r
      where r.id = school_ptm_participants.request_id
        and (r.teacher_id = auth.uid() or public.school_has_role(r.organization_id, array['owner', 'admin']))
    )
  );

drop policy if exists "participants update own rsvp" on public.school_ptm_participants;
create policy "participants update own rsvp"
  on public.school_ptm_participants for update
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());

drop policy if exists "ptm notes visible to relationship" on public.school_ptm_notes;
create policy "ptm notes visible to relationship"
  on public.school_ptm_notes for select
  using (
    (
      visibility = 'shared'
      and exists (
        select 1 from public.school_ptm_requests r
        where r.id = school_ptm_notes.request_id
          and (
            r.teacher_id = auth.uid() or r.parent_id = auth.uid() or r.requested_by = auth.uid()
            or public.school_can_view_student(r.organization_id, r.student_id)
            or public.school_has_role(r.organization_id, array['owner', 'admin'])
          )
      )
    )
    or exists (
      select 1 from public.school_ptm_requests r
      where r.id = school_ptm_notes.request_id
        and (r.teacher_id = auth.uid() or public.school_has_role(r.organization_id, array['owner', 'admin']))
    )
  );

drop policy if exists "teachers and admins add ptm notes" on public.school_ptm_notes;
create policy "teachers and admins add ptm notes"
  on public.school_ptm_notes for insert
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.school_ptm_requests r
      where r.id = school_ptm_notes.request_id
        and (r.teacher_id = auth.uid() or public.school_has_role(r.organization_id, array['owner', 'admin']))
    )
  );

-- In-app alerts reuse the existing notification center; no AI credits involved.
create or replace function public.school_notify_ptm_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  student_name text;
begin
  select p.full_name into student_name from public.profiles p where p.id = new.student_id;

  if tg_op = 'INSERT' then
    insert into public.notifications (user_id, type, title, message, link)
    values (
      new.teacher_id,
      'REMINDER',
      'New PTM request',
      'A parent-teacher meeting was requested for ' || coalesce(student_name, 'a student') || '.',
      '/school-admin/ptm'
    );
    return new;
  end if;

  if tg_op = 'UPDATE' and new.status is distinct from old.status then
    insert into public.notifications (user_id, type, title, message, link)
    select recipient_id, 'REMINDER',
      case new.status
        when 'approved' then 'PTM request approved'
        when 'scheduled' then 'PTM meeting scheduled'
        when 'cancelled' then 'PTM meeting cancelled'
        when 'rescheduled' then 'PTM meeting rescheduled'
        when 'completed' then 'PTM meeting completed'
        when 'missed' then 'PTM meeting marked missed'
        else 'PTM meeting updated'
      end,
      coalesce(student_name, 'Student') || E'\'s parent-teacher meeting is now ' || new.status || '.',
      '/school'
    from (
      select new.parent_id as recipient_id where new.parent_id is not null
      union
      select g.guardian_id
      from public.school_guardians g
      where g.organization_id = new.organization_id
        and g.student_id = new.student_id
        and g.receives_alerts = true
    ) recipients
    where recipient_id is not null and recipient_id is distinct from auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_school_notify_ptm_request on public.school_ptm_requests;
create trigger trg_school_notify_ptm_request
after insert or update of status on public.school_ptm_requests
for each row execute function public.school_notify_ptm_request();

-- Live updates for pending-request and upcoming-meeting dashboard cards.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'school_ptm_requests'
    ) then
      alter publication supabase_realtime add table public.school_ptm_requests;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'school_ptm_slots'
    ) then
      alter publication supabase_realtime add table public.school_ptm_slots;
    end if;
  end if;
end $$;
