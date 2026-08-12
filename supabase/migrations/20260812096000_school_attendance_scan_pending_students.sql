-- Handwritten attendance register scan pipeline (CLAUDE_CODE_MASTER_PROMPT.md Part 4.2).
-- New-student detection: a name/roll number the OCR pipeline finds that doesn't match any
-- enrolled student in the scanned section. Checked school_admissions first (per the master prompt's
-- explicit "check if an existing admissions/pending table fits before adding a new one" instruction)
-- — it doesn't: guardian_name/guardian_phone are NOT NULL there, which a text-only attendance scan
-- can never supply. This is a deliberately lightweight parallel table, not a fuller "admission".

create table if not exists public.school_pending_student_additions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  section_id uuid not null references public.school_sections(id) on delete cascade,
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

alter table public.school_pending_student_additions add constraint school_pending_additions_section_tenant_fk
  foreign key (section_id, organization_id) references public.school_sections (id, organization_id);

create index if not exists school_pending_additions_org_status_idx
  on public.school_pending_student_additions (organization_id, status, created_at desc);

alter table public.school_pending_student_additions enable row level security;

drop policy if exists "pending additions visible to admins and detecting teacher" on public.school_pending_student_additions;
create policy "pending additions visible to admins and detecting teacher"
  on public.school_pending_student_additions for select
  using (
    detected_by = auth.uid()
    or public.school_has_role(organization_id, array['owner','admin','admissions'])
  );

drop policy if exists "teachers report new students from their sections" on public.school_pending_student_additions;
create policy "teachers report new students from their sections"
  on public.school_pending_student_additions for insert
  with check (
    detected_by = auth.uid()
    and public.school_teacher_can_manage_section(organization_id, section_id)
  );

drop policy if exists "admins review pending additions" on public.school_pending_student_additions;
create policy "admins review pending additions"
  on public.school_pending_student_additions for update
  using (public.school_has_role(organization_id, array['owner','admin','admissions']))
  with check (public.school_has_role(organization_id, array['owner','admin','admissions']));

-- Reuses the app's existing generic notification center — same delivery mechanism as
-- school_notify_attendance / school_notify_fee_invoice, just triggered on a new pending row.
create or replace function public.school_notify_pending_student_addition()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  section_label text;
begin
  select s.name || coalesce(' - ' || c.name, '')
    into section_label
    from public.school_sections s
    left join public.school_classes c on c.id = s.class_id
   where s.id = new.section_id;

  insert into public.notifications (user_id, type, title, message, link)
  select m.profile_id, 'SYSTEM', 'New student detected',
    'A teacher spotted "' || new.extracted_name || '" in ' || coalesce(section_label, 'a section') ||
    ' during an attendance scan. Review and approve or reject.',
    '/school-admin/requests'
  from public.school_memberships m
  where m.organization_id = new.organization_id
    and m.status = 'active'
    and m.member_role in ('owner', 'admin');
  return new;
end;
$$;

drop trigger if exists trg_school_notify_pending_student_addition on public.school_pending_student_additions;
create trigger trg_school_notify_pending_student_addition
after insert on public.school_pending_student_additions
for each row execute function public.school_notify_pending_student_addition();
