-- Additive multi-tenant School ERP foundation.
-- Consumer FREE/PRO/ELITE entitlements are intentionally not referenced here:
-- school records are available through an active institutional membership.

create extension if not exists pgcrypto;

create table if not exists public.school_organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  organization_type text not null default 'school'
    check (organization_type in ('school', 'academy', 'college')),
  status text not null default 'active'
    check (status in ('trial', 'active', 'suspended', 'archived')),
  timezone text not null default 'Asia/Karachi',
  currency text not null default 'PKR',
  email text,
  phone text,
  address text,
  logo_url text,
  settings jsonb not null default '{}'::jsonb,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_campuses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  name text not null,
  code text not null,
  email text,
  phone text,
  address text,
  is_main boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, code)
);

create table if not exists public.school_memberships (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  campus_id uuid references public.school_campuses(id) on delete set null,
  profile_id uuid not null references public.profiles(id) on delete cascade,
  member_role text not null check (
    member_role in ('owner', 'admin', 'admissions', 'teacher', 'staff', 'accountant', 'parent', 'student')
  ),
  permissions text[] not null default '{}',
  employee_code text,
  designation text,
  status text not null default 'active' check (status in ('invited', 'active', 'suspended', 'left')),
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, profile_id, member_role)
);

create table if not exists public.school_academic_years (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  name text not null,
  starts_on date not null,
  ends_on date not null,
  is_current boolean not null default false,
  status text not null default 'planning' check (status in ('planning', 'active', 'closed')),
  created_at timestamptz not null default now(),
  unique (organization_id, name),
  check (ends_on >= starts_on)
);

create table if not exists public.school_classes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  campus_id uuid not null references public.school_campuses(id) on delete cascade,
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  name text not null,
  grade_level text,
  display_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (campus_id, academic_year_id, name)
);

create table if not exists public.school_sections (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  class_id uuid not null references public.school_classes(id) on delete cascade,
  name text not null,
  room text,
  capacity integer not null default 40 check (capacity > 0),
  homeroom_teacher_id uuid references public.profiles(id) on delete set null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (class_id, name)
);

create table if not exists public.school_subject_offerings (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  section_id uuid not null references public.school_sections(id) on delete cascade,
  subject_id uuid references public.subjects(id) on delete set null,
  subject_name text not null,
  teacher_id uuid references public.profiles(id) on delete set null,
  weekly_periods integer not null default 1 check (weekly_periods > 0),
  created_at timestamptz not null default now(),
  unique (section_id, subject_name)
);

create table if not exists public.school_enrollments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  section_id uuid not null references public.school_sections(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  admission_number text not null,
  roll_number text,
  enrolled_on date not null default current_date,
  status text not null default 'active'
    check (status in ('active', 'promoted', 'graduated', 'withdrawn', 'suspended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, academic_year_id, student_id),
  unique (organization_id, admission_number)
);

create table if not exists public.school_guardians (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  guardian_id uuid not null references public.profiles(id) on delete cascade,
  relationship text not null default 'guardian',
  is_primary boolean not null default false,
  can_pick_up boolean not null default false,
  receives_alerts boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, student_id, guardian_id)
);

create table if not exists public.school_admissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  campus_id uuid references public.school_campuses(id) on delete set null,
  academic_year_id uuid references public.school_academic_years(id) on delete set null,
  applicant_profile_id uuid references public.profiles(id) on delete set null,
  application_number text not null,
  applicant_name text not null,
  date_of_birth date,
  gender text,
  applying_for_class text not null,
  guardian_name text not null,
  guardian_email text,
  guardian_phone text not null,
  previous_school text,
  notes text,
  status text not null default 'submitted' check (
    status in ('draft', 'submitted', 'under_review', 'waitlisted', 'approved', 'rejected', 'enrolled', 'withdrawn')
  ),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, application_number)
);

create table if not exists public.school_admission_documents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  admission_id uuid not null references public.school_admissions(id) on delete cascade,
  document_type text not null,
  file_name text not null,
  storage_path text not null,
  mime_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  verification_status text not null default 'pending'
    check (verification_status in ('pending', 'verified', 'rejected')),
  uploaded_at timestamptz not null default now()
);

create table if not exists public.school_attendance_records (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  section_id uuid not null references public.school_sections(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'excused', 'leave')),
  check_in_time time,
  remarks text,
  marked_by uuid not null references public.profiles(id) on delete restrict,
  marked_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (section_id, student_id, attendance_date)
);

create table if not exists public.school_staff_attendance (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  membership_id uuid not null references public.school_memberships(id) on delete cascade,
  attendance_date date not null,
  status text not null check (status in ('present', 'absent', 'late', 'remote', 'leave')),
  check_in_at timestamptz,
  check_out_at timestamptz,
  remarks text,
  marked_by uuid references public.profiles(id) on delete set null,
  unique (membership_id, attendance_date)
);

create table if not exists public.school_leave_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  requester_id uuid not null references public.profiles(id) on delete cascade,
  requester_type text not null check (requester_type in ('student', 'teacher', 'staff')),
  starts_on date not null,
  ends_on date not null,
  reason text not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'cancelled')),
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  check (ends_on >= starts_on)
);

create table if not exists public.school_exams (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  name text not null,
  term text,
  starts_on date not null,
  ends_on date not null,
  status text not null default 'draft' check (status in ('draft', 'scheduled', 'marks_entry', 'published', 'archived')),
  grading_scheme jsonb not null default '{"A+":90,"A":80,"B":70,"C":60,"D":50}'::jsonb,
  published_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (organization_id, academic_year_id, name),
  check (ends_on >= starts_on)
);

create table if not exists public.school_exam_schedules (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  exam_id uuid not null references public.school_exams(id) on delete cascade,
  section_id uuid not null references public.school_sections(id) on delete cascade,
  subject_offering_id uuid references public.school_subject_offerings(id) on delete set null,
  subject_name text not null,
  exam_date date not null,
  starts_at time,
  ends_at time,
  room text,
  max_marks numeric(8,2) not null default 100 check (max_marks > 0),
  passing_marks numeric(8,2) not null default 40 check (passing_marks >= 0),
  created_at timestamptz not null default now(),
  unique (exam_id, section_id, subject_name)
);

create table if not exists public.school_exam_marks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  schedule_id uuid not null references public.school_exam_schedules(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  marks_obtained numeric(8,2),
  is_absent boolean not null default false,
  remarks text,
  entered_by uuid not null references public.profiles(id) on delete restrict,
  entered_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (schedule_id, student_id),
  check (marks_obtained is null or marks_obtained >= 0)
);

create table if not exists public.school_report_cards (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  exam_id uuid not null references public.school_exams(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  summary jsonb not null default '{}'::jsonb,
  total_marks numeric(10,2) not null default 0,
  obtained_marks numeric(10,2) not null default 0,
  percentage numeric(6,2) not null default 0,
  gpa numeric(4,2),
  grade text,
  class_position integer,
  teacher_comment text,
  published_at timestamptz,
  generated_at timestamptz not null default now(),
  unique (exam_id, student_id)
);

create table if not exists public.school_fee_structures (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  class_id uuid references public.school_classes(id) on delete cascade,
  name text not null,
  fee_type text not null check (fee_type in ('admission', 'tuition', 'exam', 'transport', 'activity', 'other')),
  frequency text not null default 'monthly' check (frequency in ('one_time', 'monthly', 'quarterly', 'annual')),
  amount numeric(12,2) not null check (amount >= 0),
  due_day integer check (due_day is null or due_day between 1 and 28),
  late_fee_type text not null default 'fixed' check (late_fee_type in ('none', 'fixed', 'daily')),
  late_fee_amount numeric(12,2) not null default 0 check (late_fee_amount >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.school_fee_invoices (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  academic_year_id uuid not null references public.school_academic_years(id) on delete cascade,
  student_id uuid not null references public.profiles(id) on delete cascade,
  fee_structure_id uuid references public.school_fee_structures(id) on delete set null,
  voucher_number text not null,
  billing_period text,
  issue_date date not null default current_date,
  due_date date not null,
  subtotal numeric(12,2) not null check (subtotal >= 0),
  discount_amount numeric(12,2) not null default 0 check (discount_amount >= 0),
  scholarship_amount numeric(12,2) not null default 0 check (scholarship_amount >= 0),
  fine_amount numeric(12,2) not null default 0 check (fine_amount >= 0),
  total_amount numeric(12,2) generated always as (
    greatest(0::numeric, subtotal - discount_amount - scholarship_amount + fine_amount)
  ) stored,
  paid_amount numeric(12,2) not null default 0 check (paid_amount >= 0),
  status text not null default 'issued'
    check (status in ('draft', 'issued', 'partial', 'paid', 'overdue', 'waived', 'cancelled')),
  notes text,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, voucher_number),
  check (due_date >= issue_date)
);

create table if not exists public.school_fee_payments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  invoice_id uuid not null references public.school_fee_invoices(id) on delete cascade,
  amount numeric(12,2) not null check (amount > 0),
  payment_method text not null check (payment_method in ('cash', 'bank', 'card', 'wallet', 'online', 'adjustment')),
  provider text,
  provider_reference text,
  receipt_number text not null,
  paid_at timestamptz not null default now(),
  received_by uuid references public.profiles(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  unique (organization_id, receipt_number)
);

create table if not exists public.school_timetable_entries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  section_id uuid not null references public.school_sections(id) on delete cascade,
  subject_offering_id uuid references public.school_subject_offerings(id) on delete set null,
  subject_name text not null,
  teacher_id uuid references public.profiles(id) on delete set null,
  day_of_week integer not null check (day_of_week between 1 and 7),
  starts_at time not null,
  ends_at time not null,
  room text,
  created_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create table if not exists public.school_homework (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  section_id uuid not null references public.school_sections(id) on delete cascade,
  subject_offering_id uuid references public.school_subject_offerings(id) on delete set null,
  title text not null,
  instructions text,
  attachment_url text,
  assigned_on date not null default current_date,
  due_at timestamptz,
  max_marks numeric(8,2),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.school_lesson_plans (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  subject_offering_id uuid not null references public.school_subject_offerings(id) on delete cascade,
  title text not null,
  objectives text,
  lesson_date date not null,
  content text,
  resources jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'ready', 'delivered', 'reviewed')),
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.school_calendar_events (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  campus_id uuid references public.school_campuses(id) on delete cascade,
  title text not null,
  description text,
  event_type text not null default 'academic'
    check (event_type in ('academic', 'exam', 'holiday', 'meeting', 'activity', 'deadline')),
  starts_at timestamptz not null,
  ends_at timestamptz,
  audience_roles text[] not null default array['student', 'parent', 'teacher', 'staff'],
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.school_announcements (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  campus_id uuid references public.school_campuses(id) on delete cascade,
  title text not null,
  body text not null,
  priority text not null default 'normal' check (priority in ('normal', 'important', 'urgent')),
  audience_roles text[] not null default array['student', 'parent', 'teacher', 'staff'],
  delivery_channels text[] not null default array['in_app'],
  published_at timestamptz,
  expires_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table if not exists public.school_notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  announcement_id uuid references public.school_announcements(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,
  recipient_address text,
  channel text not null check (channel in ('in_app', 'email', 'sms', 'whatsapp', 'push')),
  status text not null default 'queued' check (status in ('queued', 'processing', 'sent', 'failed', 'skipped')),
  attempts integer not null default 0,
  provider_reference text,
  last_error text,
  scheduled_for timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.school_audit_logs (
  id bigint generated always as identity primary key,
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip_hash text,
  created_at timestamptz not null default now()
);

create table if not exists public.school_contact_messages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  recipient_role text not null check (recipient_role in ('admin', 'admissions', 'teacher', 'accountant')),
  subject text not null,
  body text not null,
  status text not null default 'open' check (status in ('open', 'read', 'replied', 'closed')),
  response text,
  responded_by uuid references public.profiles(id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Composite tenant keys reject cross-organization foreign-key references.
create unique index if not exists school_campuses_id_org_uidx on public.school_campuses (id, organization_id);
create unique index if not exists school_memberships_id_org_uidx on public.school_memberships (id, organization_id);
create unique index if not exists school_years_id_org_uidx on public.school_academic_years (id, organization_id);
create unique index if not exists school_classes_id_org_uidx on public.school_classes (id, organization_id);
create unique index if not exists school_sections_id_org_uidx on public.school_sections (id, organization_id);
create unique index if not exists school_offerings_id_org_uidx on public.school_subject_offerings (id, organization_id);
create unique index if not exists school_admissions_id_org_uidx on public.school_admissions (id, organization_id);
create unique index if not exists school_exams_id_org_uidx on public.school_exams (id, organization_id);
create unique index if not exists school_schedules_id_org_uidx on public.school_exam_schedules (id, organization_id);
create unique index if not exists school_fee_structures_id_org_uidx on public.school_fee_structures (id, organization_id);
create unique index if not exists school_fee_invoices_id_org_uidx on public.school_fee_invoices (id, organization_id);
create unique index if not exists school_announcements_id_org_uidx on public.school_announcements (id, organization_id);

alter table public.school_memberships add constraint school_memberships_campus_tenant_fk
  foreign key (campus_id, organization_id) references public.school_campuses (id, organization_id);
alter table public.school_classes add constraint school_classes_campus_tenant_fk
  foreign key (campus_id, organization_id) references public.school_campuses (id, organization_id);
alter table public.school_classes add constraint school_classes_year_tenant_fk
  foreign key (academic_year_id, organization_id) references public.school_academic_years (id, organization_id);
alter table public.school_sections add constraint school_sections_class_tenant_fk
  foreign key (class_id, organization_id) references public.school_classes (id, organization_id);
alter table public.school_subject_offerings add constraint school_offerings_section_tenant_fk
  foreign key (section_id, organization_id) references public.school_sections (id, organization_id);
alter table public.school_enrollments add constraint school_enrollments_year_tenant_fk
  foreign key (academic_year_id, organization_id) references public.school_academic_years (id, organization_id);
alter table public.school_enrollments add constraint school_enrollments_section_tenant_fk
  foreign key (section_id, organization_id) references public.school_sections (id, organization_id);
alter table public.school_admissions add constraint school_admissions_campus_tenant_fk
  foreign key (campus_id, organization_id) references public.school_campuses (id, organization_id);
alter table public.school_admissions add constraint school_admissions_year_tenant_fk
  foreign key (academic_year_id, organization_id) references public.school_academic_years (id, organization_id);
alter table public.school_admission_documents add constraint school_documents_admission_tenant_fk
  foreign key (admission_id, organization_id) references public.school_admissions (id, organization_id);
alter table public.school_attendance_records add constraint school_attendance_section_tenant_fk
  foreign key (section_id, organization_id) references public.school_sections (id, organization_id);
alter table public.school_staff_attendance add constraint school_staff_attendance_member_tenant_fk
  foreign key (membership_id, organization_id) references public.school_memberships (id, organization_id);
alter table public.school_exams add constraint school_exams_year_tenant_fk
  foreign key (academic_year_id, organization_id) references public.school_academic_years (id, organization_id);
alter table public.school_exam_schedules add constraint school_schedules_exam_tenant_fk
  foreign key (exam_id, organization_id) references public.school_exams (id, organization_id);
alter table public.school_exam_schedules add constraint school_schedules_section_tenant_fk
  foreign key (section_id, organization_id) references public.school_sections (id, organization_id);
alter table public.school_exam_schedules add constraint school_schedules_offering_tenant_fk
  foreign key (subject_offering_id, organization_id) references public.school_subject_offerings (id, organization_id);
alter table public.school_exam_marks add constraint school_marks_schedule_tenant_fk
  foreign key (schedule_id, organization_id) references public.school_exam_schedules (id, organization_id);
alter table public.school_report_cards add constraint school_reports_exam_tenant_fk
  foreign key (exam_id, organization_id) references public.school_exams (id, organization_id);
alter table public.school_fee_structures add constraint school_fee_structures_year_tenant_fk
  foreign key (academic_year_id, organization_id) references public.school_academic_years (id, organization_id);
alter table public.school_fee_structures add constraint school_fee_structures_class_tenant_fk
  foreign key (class_id, organization_id) references public.school_classes (id, organization_id);
alter table public.school_fee_invoices add constraint school_invoices_year_tenant_fk
  foreign key (academic_year_id, organization_id) references public.school_academic_years (id, organization_id);
alter table public.school_fee_invoices add constraint school_invoices_structure_tenant_fk
  foreign key (fee_structure_id, organization_id) references public.school_fee_structures (id, organization_id);
alter table public.school_fee_payments add constraint school_payments_invoice_tenant_fk
  foreign key (invoice_id, organization_id) references public.school_fee_invoices (id, organization_id);
alter table public.school_timetable_entries add constraint school_timetable_section_tenant_fk
  foreign key (section_id, organization_id) references public.school_sections (id, organization_id);
alter table public.school_timetable_entries add constraint school_timetable_offering_tenant_fk
  foreign key (subject_offering_id, organization_id) references public.school_subject_offerings (id, organization_id);
alter table public.school_homework add constraint school_homework_section_tenant_fk
  foreign key (section_id, organization_id) references public.school_sections (id, organization_id);
alter table public.school_homework add constraint school_homework_offering_tenant_fk
  foreign key (subject_offering_id, organization_id) references public.school_subject_offerings (id, organization_id);
alter table public.school_lesson_plans add constraint school_lessons_offering_tenant_fk
  foreign key (subject_offering_id, organization_id) references public.school_subject_offerings (id, organization_id);
alter table public.school_calendar_events add constraint school_calendar_campus_tenant_fk
  foreign key (campus_id, organization_id) references public.school_campuses (id, organization_id);
alter table public.school_announcements add constraint school_announcements_campus_tenant_fk
  foreign key (campus_id, organization_id) references public.school_campuses (id, organization_id);
alter table public.school_notification_deliveries add constraint school_deliveries_announcement_tenant_fk
  foreign key (announcement_id, organization_id) references public.school_announcements (id, organization_id);

-- Indexes are tenant-first to keep organization-scoped queries selective at scale.
create index if not exists school_memberships_profile_status_idx
  on public.school_memberships (profile_id, status, organization_id);
create unique index if not exists school_one_main_campus_org_uidx
  on public.school_campuses (organization_id) where is_main;
create unique index if not exists school_one_current_year_org_uidx
  on public.school_academic_years (organization_id) where is_current;
create index if not exists school_memberships_org_role_idx
  on public.school_memberships (organization_id, member_role, status);
create index if not exists school_classes_org_year_idx
  on public.school_classes (organization_id, academic_year_id, is_active);
create index if not exists school_sections_org_class_idx
  on public.school_sections (organization_id, class_id, is_active);
create index if not exists school_enrollments_org_section_status_idx
  on public.school_enrollments (organization_id, section_id, status);
create index if not exists school_enrollments_student_idx
  on public.school_enrollments (student_id, status, academic_year_id);
create index if not exists school_admissions_org_status_created_idx
  on public.school_admissions (organization_id, status, created_at desc);
create index if not exists school_attendance_org_date_section_idx
  on public.school_attendance_records (organization_id, attendance_date desc, section_id);
create index if not exists school_attendance_student_date_idx
  on public.school_attendance_records (student_id, attendance_date desc);
create index if not exists school_exam_marks_student_idx
  on public.school_exam_marks (student_id, schedule_id);
create index if not exists school_report_cards_student_published_idx
  on public.school_report_cards (student_id, published_at desc);
create index if not exists school_fee_invoices_org_status_due_idx
  on public.school_fee_invoices (organization_id, status, due_date);
create index if not exists school_fee_invoices_student_idx
  on public.school_fee_invoices (student_id, due_date desc);
create index if not exists school_timetable_section_day_idx
  on public.school_timetable_entries (section_id, day_of_week, starts_at);
create index if not exists school_homework_section_due_idx
  on public.school_homework (section_id, due_at desc);
create index if not exists school_announcements_org_published_idx
  on public.school_announcements (organization_id, published_at desc);
create index if not exists school_deliveries_queue_idx
  on public.school_notification_deliveries (status, scheduled_for)
  where status in ('queued', 'failed');
create index if not exists school_audit_org_created_idx
  on public.school_audit_logs (organization_id, created_at desc);
create index if not exists school_contact_messages_org_role_status_idx
  on public.school_contact_messages (organization_id, recipient_role, status, created_at desc);
create index if not exists school_contact_messages_sender_idx
  on public.school_contact_messages (sender_id, created_at desc);

create or replace function public.school_is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  )
$$;

create or replace function public.school_has_role(p_organization_id uuid, p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.school_is_platform_admin() or exists (
    select 1
    from public.school_memberships m
    where m.organization_id = p_organization_id
      and m.profile_id = auth.uid()
      and m.status = 'active'
      and m.member_role = any(p_roles)
  )
$$;

create or replace function public.school_is_member(p_organization_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.school_has_role(
    p_organization_id,
    array['owner','admin','admissions','teacher','staff','accountant','parent','student']
  )
$$;

create or replace function public.school_can_view_student(p_organization_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    auth.uid() = p_student_id
    or public.school_has_role(p_organization_id, array['owner','admin','admissions','accountant'])
    or exists (
      select 1 from public.school_guardians g
      where g.organization_id = p_organization_id
        and g.student_id = p_student_id
        and g.guardian_id = auth.uid()
    )
    or exists (
      select 1
      from public.school_enrollments e
      join public.school_sections s on s.id = e.section_id
      left join public.school_subject_offerings o on o.section_id = s.id
      where e.organization_id = p_organization_id
        and e.student_id = p_student_id
        and (s.homeroom_teacher_id = auth.uid() or o.teacher_id = auth.uid())
    )
$$;

create or replace function public.school_teacher_can_manage_section(p_organization_id uuid, p_section_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.school_has_role(p_organization_id, array['owner','admin'])
    or exists (
      select 1
      from public.school_sections s
      where s.id = p_section_id
        and s.organization_id = p_organization_id
        and s.homeroom_teacher_id = auth.uid()
    )
    or exists (
      select 1
      from public.school_subject_offerings o
      where o.section_id = p_section_id
        and o.organization_id = p_organization_id
        and o.teacher_id = auth.uid()
    )
$$;

create or replace function public.school_teacher_can_manage_student(p_organization_id uuid, p_student_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.school_has_role(p_organization_id, array['owner','admin'])
    or exists (
      select 1
      from public.school_enrollments e
      where e.organization_id = p_organization_id
        and e.student_id = p_student_id
        and public.school_teacher_can_manage_section(e.organization_id, e.section_id)
    )
$$;

create or replace function public.school_update_organization_profile(
  p_organization_id uuid,
  p_name text,
  p_timezone text,
  p_currency text,
  p_email text,
  p_phone text,
  p_address text
)
returns public.school_organizations
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_organization public.school_organizations;
begin
  if not public.school_has_role(p_organization_id, array['owner','admin']) then
    raise exception 'School owner or admin access required';
  end if;
  update public.school_organizations
  set
    name = left(trim(p_name), 120),
    timezone = left(trim(p_timezone), 80),
    currency = upper(left(trim(p_currency), 3)),
    email = nullif(left(trim(p_email), 254), ''),
    phone = nullif(left(trim(p_phone), 30), ''),
    address = nullif(left(trim(p_address), 500), ''),
    updated_at = now()
  where id = p_organization_id
  returning * into updated_organization;
  return updated_organization;
end;
$$;

revoke all on function public.school_update_organization_profile(uuid, text, text, text, text, text, text) from public;
grant execute on function public.school_update_organization_profile(uuid, text, text, text, text, text, text) to authenticated;

-- RLS is enabled on every tenant table. Policies are role- and relationship-scoped.
alter table public.school_organizations enable row level security;
alter table public.school_campuses enable row level security;
alter table public.school_memberships enable row level security;
alter table public.school_academic_years enable row level security;
alter table public.school_classes enable row level security;
alter table public.school_sections enable row level security;
alter table public.school_subject_offerings enable row level security;
alter table public.school_enrollments enable row level security;
alter table public.school_guardians enable row level security;
alter table public.school_admissions enable row level security;
alter table public.school_admission_documents enable row level security;
alter table public.school_attendance_records enable row level security;
alter table public.school_staff_attendance enable row level security;
alter table public.school_leave_requests enable row level security;
alter table public.school_exams enable row level security;
alter table public.school_exam_schedules enable row level security;
alter table public.school_exam_marks enable row level security;
alter table public.school_report_cards enable row level security;
alter table public.school_fee_structures enable row level security;
alter table public.school_fee_invoices enable row level security;
alter table public.school_fee_payments enable row level security;
alter table public.school_timetable_entries enable row level security;
alter table public.school_homework enable row level security;
alter table public.school_lesson_plans enable row level security;
alter table public.school_calendar_events enable row level security;
alter table public.school_announcements enable row level security;
alter table public.school_notification_deliveries enable row level security;
alter table public.school_audit_logs enable row level security;
alter table public.school_contact_messages enable row level security;

create policy "school organizations visible to members"
  on public.school_organizations for select
  using (public.school_is_member(id));
create policy "platform admins manage school organizations"
  on public.school_organizations for all
  using (public.school_is_platform_admin())
  with check (public.school_is_platform_admin());

create policy "school campuses visible to members"
  on public.school_campuses for select using (public.school_is_member(organization_id));
create policy "school admins manage campuses"
  on public.school_campuses for all
  using (public.school_has_role(organization_id, array['owner','admin']))
  with check (public.school_has_role(organization_id, array['owner','admin']));

create policy "memberships visible to self and school admins"
  on public.school_memberships for select
  using (
    profile_id = auth.uid()
    or public.school_has_role(organization_id, array['owner','admin','admissions'])
  );
create policy "school owners manage memberships"
  on public.school_memberships for all
  using (public.school_has_role(organization_id, array['owner']))
  with check (public.school_has_role(organization_id, array['owner']));
create policy "school admins insert non-owner memberships"
  on public.school_memberships for insert
  with check (
    member_role <> 'owner'
    and public.school_has_role(organization_id, array['admin'])
  );
create policy "school admins update non-owner memberships"
  on public.school_memberships for update
  using (
    member_role <> 'owner'
    and public.school_has_role(organization_id, array['admin'])
  )
  with check (
    member_role <> 'owner'
    and public.school_has_role(organization_id, array['admin'])
  );
create policy "school admins delete non-owner memberships"
  on public.school_memberships for delete
  using (
    member_role <> 'owner'
    and public.school_has_role(organization_id, array['admin'])
  );

create policy "academic years visible to members"
  on public.school_academic_years for select using (public.school_is_member(organization_id));
create policy "school admins manage academic years"
  on public.school_academic_years for all
  using (public.school_has_role(organization_id, array['owner','admin']))
  with check (public.school_has_role(organization_id, array['owner','admin']));

create policy "school classes visible to members"
  on public.school_classes for select using (public.school_is_member(organization_id));
create policy "school admins manage classes"
  on public.school_classes for all
  using (public.school_has_role(organization_id, array['owner','admin']))
  with check (public.school_has_role(organization_id, array['owner','admin']));

create policy "school sections visible to members"
  on public.school_sections for select using (public.school_is_member(organization_id));
create policy "school admins manage sections"
  on public.school_sections for all
  using (public.school_has_role(organization_id, array['owner','admin']))
  with check (public.school_has_role(organization_id, array['owner','admin']));

create policy "subject offerings visible to members"
  on public.school_subject_offerings for select using (public.school_is_member(organization_id));
create policy "school academics manage subject offerings"
  on public.school_subject_offerings for all
  using (public.school_teacher_can_manage_section(organization_id, section_id))
  with check (public.school_teacher_can_manage_section(organization_id, section_id));

create policy "enrollments visible by student relationship"
  on public.school_enrollments for select
  using (public.school_can_view_student(organization_id, student_id));
create policy "school admissions manage enrollments"
  on public.school_enrollments for all
  using (public.school_has_role(organization_id, array['owner','admin','admissions']))
  with check (public.school_has_role(organization_id, array['owner','admin','admissions']));

create policy "guardian links visible by relationship"
  on public.school_guardians for select
  using (
    guardian_id = auth.uid()
    or student_id = auth.uid()
    or public.school_has_role(organization_id, array['owner','admin','admissions'])
  );
create policy "school admins manage guardian links"
  on public.school_guardians for all
  using (public.school_has_role(organization_id, array['owner','admin','admissions']))
  with check (public.school_has_role(organization_id, array['owner','admin','admissions']));

create policy "admissions visible to applicants and admissions team"
  on public.school_admissions for select
  using (
    applicant_profile_id = auth.uid()
    or public.school_has_role(organization_id, array['owner','admin','admissions'])
  );
create policy "admissions team manages applications"
  on public.school_admissions for all
  using (public.school_has_role(organization_id, array['owner','admin','admissions']))
  with check (public.school_has_role(organization_id, array['owner','admin','admissions']));

create policy "admission documents visible to admissions team"
  on public.school_admission_documents for select
  using (public.school_has_role(organization_id, array['owner','admin','admissions']));
create policy "admissions team manages documents"
  on public.school_admission_documents for all
  using (public.school_has_role(organization_id, array['owner','admin','admissions']))
  with check (public.school_has_role(organization_id, array['owner','admin','admissions']));

create policy "student attendance visible by relationship"
  on public.school_attendance_records for select
  using (public.school_can_view_student(organization_id, student_id));
create policy "teachers manage student attendance"
  on public.school_attendance_records for all
  using (public.school_teacher_can_manage_section(organization_id, section_id))
  with check (public.school_teacher_can_manage_section(organization_id, section_id));

create policy "staff attendance visible to self and admins"
  on public.school_staff_attendance for select
  using (
    exists (
      select 1 from public.school_memberships m
      where m.id = membership_id and m.profile_id = auth.uid()
    )
    or public.school_has_role(organization_id, array['owner','admin'])
  );
create policy "school admins manage staff attendance"
  on public.school_staff_attendance for all
  using (public.school_has_role(organization_id, array['owner','admin']))
  with check (public.school_has_role(organization_id, array['owner','admin']));

create policy "leave requests visible to requester and reviewers"
  on public.school_leave_requests for select
  using (
    requester_id = auth.uid()
    or public.school_has_role(organization_id, array['owner','admin','teacher'])
  );
create policy "members create own leave requests"
  on public.school_leave_requests for insert
  with check (
    (requester_id = auth.uid() and public.school_is_member(organization_id))
    or exists (
      select 1
      from public.school_guardians g
      where g.organization_id = school_leave_requests.organization_id
        and g.student_id = school_leave_requests.requester_id
        and g.guardian_id = auth.uid()
    )
  );
create policy "reviewers update leave requests"
  on public.school_leave_requests for update
  using (public.school_has_role(organization_id, array['owner','admin','teacher']))
  with check (public.school_has_role(organization_id, array['owner','admin','teacher']));

create policy "exams visible to school members"
  on public.school_exams for select using (public.school_is_member(organization_id));
create policy "school academics manage exams"
  on public.school_exams for all
  using (public.school_has_role(organization_id, array['owner','admin','teacher']))
  with check (public.school_has_role(organization_id, array['owner','admin','teacher']));

create policy "exam schedules visible to school members"
  on public.school_exam_schedules for select using (public.school_is_member(organization_id));
create policy "school academics manage exam schedules"
  on public.school_exam_schedules for all
  using (public.school_teacher_can_manage_section(organization_id, section_id))
  with check (public.school_teacher_can_manage_section(organization_id, section_id));

create policy "exam marks visible by student relationship"
  on public.school_exam_marks for select
  using (public.school_can_view_student(organization_id, student_id));
create policy "school academics manage exam marks"
  on public.school_exam_marks for all
  using (
    public.school_has_role(organization_id, array['owner','admin'])
    or exists (
      select 1 from public.school_exam_schedules s
      where s.id = schedule_id
        and public.school_teacher_can_manage_section(s.organization_id, s.section_id)
    )
  )
  with check (
    public.school_has_role(organization_id, array['owner','admin'])
    or exists (
      select 1 from public.school_exam_schedules s
      where s.id = schedule_id
        and public.school_teacher_can_manage_section(s.organization_id, s.section_id)
    )
  );

create policy "report cards visible by student relationship"
  on public.school_report_cards for select
  using (published_at is not null and public.school_can_view_student(organization_id, student_id));
create policy "school academics manage report cards"
  on public.school_report_cards for all
  using (public.school_teacher_can_manage_student(organization_id, student_id))
  with check (public.school_teacher_can_manage_student(organization_id, student_id));

create policy "fee structures visible to finance and admins"
  on public.school_fee_structures for select
  using (public.school_has_role(organization_id, array['owner','admin','accountant']));
create policy "school finance manages fee structures"
  on public.school_fee_structures for all
  using (public.school_has_role(organization_id, array['owner','admin','accountant']))
  with check (public.school_has_role(organization_id, array['owner','admin','accountant']));

create policy "fee invoices visible by student relationship"
  on public.school_fee_invoices for select
  using (
    public.school_can_view_student(organization_id, student_id)
    or public.school_has_role(organization_id, array['owner','admin','accountant'])
  );
create policy "school finance manages invoices"
  on public.school_fee_invoices for all
  using (public.school_has_role(organization_id, array['owner','admin','accountant']))
  with check (public.school_has_role(organization_id, array['owner','admin','accountant']));

create policy "fee payments visible through invoice relationship"
  on public.school_fee_payments for select
  using (
    public.school_has_role(organization_id, array['owner','admin','accountant'])
    or exists (
      select 1 from public.school_fee_invoices i
      where i.id = invoice_id and public.school_can_view_student(i.organization_id, i.student_id)
    )
  );
create policy "school finance manages payments"
  on public.school_fee_payments for all
  using (public.school_has_role(organization_id, array['owner','admin','accountant']))
  with check (public.school_has_role(organization_id, array['owner','admin','accountant']));

create policy "timetable visible to school members"
  on public.school_timetable_entries for select using (public.school_is_member(organization_id));
create policy "school academics manage timetable"
  on public.school_timetable_entries for all
  using (public.school_teacher_can_manage_section(organization_id, section_id))
  with check (public.school_teacher_can_manage_section(organization_id, section_id));

create policy "homework visible to school members"
  on public.school_homework for select using (public.school_is_member(organization_id));
create policy "teachers manage homework"
  on public.school_homework for all
  using (public.school_teacher_can_manage_section(organization_id, section_id))
  with check (public.school_teacher_can_manage_section(organization_id, section_id));

create policy "lesson plans visible to school academics"
  on public.school_lesson_plans for select
  using (public.school_has_role(organization_id, array['owner','admin','teacher']));
create policy "teachers manage lesson plans"
  on public.school_lesson_plans for all
  using (
    public.school_has_role(organization_id, array['owner','admin'])
    or exists (
      select 1 from public.school_subject_offerings o
      where o.id = subject_offering_id and o.teacher_id = auth.uid()
    )
  )
  with check (
    public.school_has_role(organization_id, array['owner','admin'])
    or exists (
      select 1 from public.school_subject_offerings o
      where o.id = subject_offering_id and o.teacher_id = auth.uid()
    )
  );

create policy "calendar visible to school members"
  on public.school_calendar_events for select using (public.school_is_member(organization_id));
create policy "school staff manage calendar"
  on public.school_calendar_events for all
  using (public.school_has_role(organization_id, array['owner','admin','teacher','staff']))
  with check (public.school_has_role(organization_id, array['owner','admin','teacher','staff']));

create policy "announcements visible to school members"
  on public.school_announcements for select
  using (public.school_is_member(organization_id));
create policy "school staff manage announcements"
  on public.school_announcements for all
  using (public.school_has_role(organization_id, array['owner','admin','teacher','staff']))
  with check (public.school_has_role(organization_id, array['owner','admin','teacher','staff']));

create policy "delivery queue visible to school admins"
  on public.school_notification_deliveries for select
  using (public.school_has_role(organization_id, array['owner','admin']));
create policy "school staff queues deliveries"
  on public.school_notification_deliveries for insert
  with check (public.school_has_role(organization_id, array['owner','admin','teacher','staff']));

create policy "audit logs visible to school admins"
  on public.school_audit_logs for select
  using (public.school_has_role(organization_id, array['owner','admin']));
create policy "active members append audit logs"
  on public.school_audit_logs for insert
  with check (actor_user_id = auth.uid() and public.school_is_member(organization_id));

create policy "contact messages visible to sender and recipient team"
  on public.school_contact_messages for select
  using (
    sender_id = auth.uid()
    or public.school_has_role(organization_id, array['owner','admin'])
    or public.school_has_role(organization_id, array[recipient_role])
  );
create policy "members send contact messages"
  on public.school_contact_messages for insert
  with check (
    sender_id = auth.uid()
    and public.school_is_member(organization_id)
  );
create policy "recipient team responds to contact messages"
  on public.school_contact_messages for update
  using (
    public.school_has_role(organization_id, array['owner','admin'])
    or public.school_has_role(organization_id, array[recipient_role])
  )
  with check (
    public.school_has_role(organization_id, array['owner','admin'])
    or public.school_has_role(organization_id, array[recipient_role])
  );

-- Parent alerts use the existing notification center and cost no AI credits.
create or replace function public.school_notify_attendance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  student_name text;
begin
  if new.status not in ('absent', 'late') then
    return new;
  end if;
  select p.full_name into student_name from public.profiles p where p.id = new.student_id;
  insert into public.notifications (user_id, type, title, message, link)
  select
    g.guardian_id,
    'SYSTEM',
    case when new.status = 'absent' then 'Attendance alert' else 'Late arrival alert' end,
    coalesce(student_name, 'Student') || ' was marked ' || new.status || ' on ' || new.attendance_date::text || '.',
    '/school'
  from public.school_guardians g
  where g.organization_id = new.organization_id
    and g.student_id = new.student_id
    and g.receives_alerts = true;
  return new;
end;
$$;

drop trigger if exists trg_school_notify_attendance on public.school_attendance_records;
create trigger trg_school_notify_attendance
after insert or update of status on public.school_attendance_records
for each row execute function public.school_notify_attendance();

create or replace function public.school_notify_fee_invoice()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  student_name text;
begin
  if new.status not in ('issued', 'overdue') then
    return new;
  end if;
  select p.full_name into student_name from public.profiles p where p.id = new.student_id;
  insert into public.notifications (user_id, type, title, message, link)
  select recipient_id, 'SYSTEM', 'Fee voucher available',
    'Fee voucher ' || new.voucher_number || ' for ' || coalesce(student_name, 'student') ||
    ' is due on ' || new.due_date::text || '.', '/school'
  from (
    select new.student_id as recipient_id
    union
    select g.guardian_id
    from public.school_guardians g
    where g.organization_id = new.organization_id
      and g.student_id = new.student_id
      and g.receives_alerts = true
  ) recipients;
  return new;
end;
$$;

drop trigger if exists trg_school_notify_fee_invoice on public.school_fee_invoices;
create trigger trg_school_notify_fee_invoice
after insert or update of status on public.school_fee_invoices
for each row execute function public.school_notify_fee_invoice();

create or replace function public.school_apply_fee_payment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_invoice_id uuid;
  new_paid_amount numeric;
begin
  if tg_op = 'DELETE' then
    target_invoice_id := old.invoice_id;
  else
    target_invoice_id := new.invoice_id;
  end if;
  select coalesce(sum(p.amount), 0)
  into new_paid_amount
  from public.school_fee_payments p
  where p.invoice_id = target_invoice_id;

  update public.school_fee_invoices i
  set
    paid_amount = new_paid_amount,
    status = case
      when new_paid_amount >= i.total_amount then 'paid'
      when new_paid_amount > 0 then 'partial'
      when i.status in ('partial', 'paid') then 'issued'
      else i.status
    end,
    updated_at = now()
  where i.id = target_invoice_id;
  return new;
end;
$$;

drop trigger if exists trg_school_apply_fee_payment on public.school_fee_payments;
create trigger trg_school_apply_fee_payment
after insert or update or delete on public.school_fee_payments
for each row execute function public.school_apply_fee_payment();

create or replace function public.school_notify_report_card()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  exam_name text;
begin
  if new.published_at is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.published_at is not null then
    return new;
  end if;
  select e.name into exam_name from public.school_exams e where e.id = new.exam_id;
  insert into public.notifications (user_id, type, title, message, link)
  select recipient_id, 'SYSTEM', 'Report card published',
    coalesce(exam_name, 'Exam') || ' report card is now available.',
    '/school/report-card/' || new.id::text
  from (
    select new.student_id as recipient_id
    union
    select g.guardian_id
    from public.school_guardians g
    where g.organization_id = new.organization_id and g.student_id = new.student_id
  ) recipients;
  return new;
end;
$$;

drop trigger if exists trg_school_notify_report_card on public.school_report_cards;
create trigger trg_school_notify_report_card
after insert or update of published_at on public.school_report_cards
for each row execute function public.school_notify_report_card();

-- Private admission-document bucket. Signed URLs are generated only after access checks.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'school-admissions',
  'school-admissions',
  false,
  5242880,
  array['application/pdf','image/jpeg','image/png','image/webp']
)
on conflict (id) do update
set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "school admissions team reads admission files" on storage.objects;
create policy "school admissions team reads admission files"
  on storage.objects for select
  using (
    bucket_id = 'school-admissions'
    and public.school_has_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner','admin','admissions']
    )
  );

drop policy if exists "school admissions team uploads admission files" on storage.objects;
create policy "school admissions team uploads admission files"
  on storage.objects for insert
  with check (
    bucket_id = 'school-admissions'
    and public.school_has_role(
      ((storage.foldername(name))[1])::uuid,
      array['owner','admin','admissions']
    )
  );
