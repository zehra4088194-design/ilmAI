-- College-side parity gap-fill: mirrors school_pending_student_additions (attendance-scan
-- new-student detection) for the college ERP schema. See
-- supabase/migrations/20260812096000_school_attendance_scan_pending_students.sql for the full
-- rationale (checked college_admissions first — same NOT NULL guardian_name/guardian_phone problem
-- as the school side).

create table if not exists public.college_pending_student_additions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.college_organizations(id) on delete cascade,
  section_id uuid not null references public.college_sections(id) on delete cascade,
  extracted_name text not null,
  extracted_roll_number text,
  status text not null default 'pending_principal_approval'
    check (status in ('pending_principal_approval', 'approved', 'rejected')),
  detected_by uuid not null references public.profiles(id) on delete cascade,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  unique (section_id, extracted_name, extracted_roll_number)
);

alter table public.college_pending_student_additions add constraint college_pending_additions_section_tenant_fk
  foreign key (section_id, organization_id) references public.college_sections (id, organization_id);

create index if not exists college_pending_additions_org_status_idx
  on public.college_pending_student_additions (organization_id, status, created_at desc);

alter table public.college_pending_student_additions enable row level security;

drop policy if exists "pending additions visible to admins and detecting teacher" on public.college_pending_student_additions;
create policy "pending additions visible to admins and detecting teacher"
  on public.college_pending_student_additions for select
  using (
    detected_by = auth.uid()
    or public.college_has_role(organization_id, array['owner','admin','admissions'])
  );

drop policy if exists "teachers report new students from their sections" on public.college_pending_student_additions;
create policy "teachers report new students from their sections"
  on public.college_pending_student_additions for insert
  with check (
    detected_by = auth.uid()
    and public.college_teacher_can_manage_section(organization_id, section_id)
  );

drop policy if exists "admins review pending additions" on public.college_pending_student_additions;
create policy "admins review pending additions"
  on public.college_pending_student_additions for update
  using (public.college_has_role(organization_id, array['owner','admin','admissions']))
  with check (public.college_has_role(organization_id, array['owner','admin','admissions']));

create or replace function public.college_notify_pending_student_addition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  section_label text;
begin
  select s.name || coalesce(' - ' || d.name, '')
    into section_label
    from public.college_sections s
    left join public.college_semesters sem on sem.id = s.semester_id
    left join public.college_academic_departments d on d.id = sem.department_id
   where s.id = new.section_id;

  insert into public.notifications (user_id, type, title, message, link)
  select m.profile_id, 'SYSTEM', 'New student detected',
    'A teacher spotted "' || new.extracted_name || '" in ' || coalesce(section_label, 'a section') ||
    ' during an attendance scan. Review and approve or reject.',
    '/college-admin/requests'
  from public.college_memberships m
  where m.organization_id = new.organization_id
    and m.status = 'active'
    and m.member_role in ('owner', 'admin');
  return new;
end;
$$;

drop trigger if exists trg_college_notify_pending_student_addition on public.college_pending_student_additions;
create trigger trg_college_notify_pending_student_addition
after insert on public.college_pending_student_additions
for each row execute function public.college_notify_pending_student_addition();
