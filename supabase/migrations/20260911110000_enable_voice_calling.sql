-- Enable voice calling for all schools by default
-- This sets allow_student_student = true so students can call each other

-- SCHOOL: Enable calling with all permissions on
insert into public.school_calling_settings (organization_id, enabled, allow_student_student, allow_student_staff, allow_parent_staff)
select id, true, true, true, true
from public.school_organizations
on conflict (organization_id) do update set
  enabled = true,
  allow_student_student = true,
  allow_student_staff = true,
  allow_parent_staff = true,
  updated_at = now();

-- COLLEGE: Same for parity
insert into public.college_calling_settings (organization_id, enabled, allow_student_student, allow_student_staff, allow_parent_staff)
select id, true, true, true, true
from public.college_organizations
on conflict (organization_id) do update set
  enabled = true,
  allow_student_student = true,
  allow_student_staff = true,
  allow_parent_staff = true,
  updated_at = now();
