create table if not exists public.student_applications (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  institution_type text not null check (institution_type in ('school','college')),
  institution_id uuid not null,
  enrollment_id uuid not null,
  recipient_type text not null check (recipient_type in ('principal','class_incharge')),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  application_type text not null default 'general',
  subject text not null,
  body text not null,
  starts_on date,
  ends_on date,
  status text not null default 'submitted' check (status in ('submitted','seen','approved','rejected','needs_changes')),
  response_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.student_application_templates (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.profiles(id) on delete cascade,
  institution_type text not null check (institution_type in ('school','college')),
  institution_id uuid,
  application_type text not null default 'general',
  title text not null,
  subject text not null,
  body text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists student_applications_student_idx on public.student_applications(student_id, created_at desc);
create index if not exists student_applications_recipient_idx on public.student_applications(recipient_id, status, created_at desc);
create index if not exists student_applications_institution_idx on public.student_applications(institution_type, institution_id, created_at desc);
create index if not exists student_application_templates_student_idx on public.student_application_templates(student_id, created_at desc);

create or replace function public.touch_student_applications_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists student_applications_touch_updated_at on public.student_applications;
create trigger student_applications_touch_updated_at
before update on public.student_applications
for each row execute function public.touch_student_applications_updated_at();

drop trigger if exists student_application_templates_touch_updated_at on public.student_application_templates;
create trigger student_application_templates_touch_updated_at
before update on public.student_application_templates
for each row execute function public.touch_student_applications_updated_at();

alter table public.student_applications enable row level security;
alter table public.student_application_templates enable row level security;

drop policy if exists student_applications_select on public.student_applications;
create policy student_applications_select on public.student_applications
for select to authenticated
using (
  student_id = auth.uid()
  or recipient_id = auth.uid()
  or (
    institution_type = 'school'
    and exists (
      select 1 from public.school_guardians sg
      where sg.organization_id = institution_id
        and sg.student_id = student_applications.student_id
        and sg.guardian_id = auth.uid()
        and sg.receives_alerts = true
    )
  )
  or (
    institution_type = 'college'
    and exists (
      select 1 from public.college_guardians cg
      where cg.organization_id = institution_id
        and cg.student_id = student_applications.student_id
        and cg.guardian_id = auth.uid()
        and cg.receives_alerts = true
    )
  )
);

drop policy if exists student_applications_insert on public.student_applications;
create policy student_applications_insert on public.student_applications
for insert to authenticated
with check (student_id = auth.uid());

drop policy if exists student_applications_update on public.student_applications;
create policy student_applications_update on public.student_applications
for update to authenticated
using (recipient_id = auth.uid())
with check (recipient_id = auth.uid());

drop policy if exists student_application_templates_select on public.student_application_templates;
create policy student_application_templates_select on public.student_application_templates
for select to authenticated
using (student_id = auth.uid());

drop policy if exists student_application_templates_insert on public.student_application_templates;
create policy student_application_templates_insert on public.student_application_templates
for insert to authenticated
with check (student_id = auth.uid());

drop policy if exists student_application_templates_update on public.student_application_templates;
create policy student_application_templates_update on public.student_application_templates
for update to authenticated
using (student_id = auth.uid())
with check (student_id = auth.uid());

drop policy if exists student_application_templates_delete on public.student_application_templates;
create policy student_application_templates_delete on public.student_application_templates
for delete to authenticated
using (student_id = auth.uid());