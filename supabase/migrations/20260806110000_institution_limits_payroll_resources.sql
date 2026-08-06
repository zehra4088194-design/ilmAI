-- Institution controls that make schools/colleges billable, limitable, and auditable.
-- This is additive: existing school_* and college_* records keep working.

create extension if not exists pgcrypto;

create table if not exists public.institution_plan_tiers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  institution_type text not null default 'school'
    check (institution_type in ('school', 'academy', 'college', 'mixed')),
  min_students integer not null default 1 check (min_students >= 0),
  max_students integer not null default 200 check (max_students >= min_students),
  max_teachers integer not null default 25 check (max_teachers >= 0),
  max_storage_gb integer not null default 10 check (max_storage_gb >= 0),
  monthly_price_usd numeric(10,2) not null default 10 check (monthly_price_usd >= 0),
  monthly_price_pkr numeric(12,2) not null default 0 check (monthly_price_pkr >= 0),
  enabled_modules text[] not null default array[
    'dashboard',
    'people',
    'attendance',
    'fees',
    'exams',
    'academics',
    'communication',
    'resources',
    'payroll'
  ],
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.institution_plan_tiers
  (code, name, institution_type, min_students, max_students, max_teachers, max_storage_gb, monthly_price_usd, monthly_price_pkr)
values
  ('school_1_200', 'School 1-200', 'school', 1, 200, 25, 10, 10, 0),
  ('school_201_500', 'School 201-500', 'school', 201, 500, 60, 25, 20, 0),
  ('school_501_1000', 'School 501-1000', 'school', 501, 1000, 120, 50, 50, 0),
  ('college_1_500', 'College 1-500', 'college', 1, 500, 80, 25, 20, 0),
  ('college_501_2000', 'College 501-2000', 'college', 501, 2000, 200, 75, 70, 0)
on conflict (code) do nothing;

create table if not exists public.school_organization_plan_settings (
  organization_id uuid primary key references public.school_organizations(id) on delete cascade,
  plan_tier_id uuid references public.institution_plan_tiers(id) on delete set null,
  billing_status text not null default 'trial'
    check (billing_status in ('trial', 'active', 'past_due', 'manual_review', 'suspended', 'cancelled')),
  max_students integer not null default 200 check (max_students >= 0),
  max_teachers integer not null default 25 check (max_teachers >= 0),
  max_storage_gb integer not null default 10 check (max_storage_gb >= 0),
  monthly_price_usd numeric(10,2) not null default 10 check (monthly_price_usd >= 0),
  monthly_price_pkr numeric(12,2) not null default 0 check (monthly_price_pkr >= 0),
  enabled_modules text[] not null default array[
    'dashboard',
    'people',
    'attendance',
    'fees',
    'exams',
    'academics',
    'communication',
    'resources',
    'payroll'
  ],
  notes text,
  starts_on date,
  renews_on date,
  updated_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.school_organization_plan_settings (organization_id)
select id from public.school_organizations
on conflict (organization_id) do nothing;

create or replace function public.school_apply_default_plan_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.school_organization_plan_settings (organization_id)
  values (new.id)
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_school_default_plan_settings on public.school_organizations;
create trigger trg_school_default_plan_settings
after insert on public.school_organizations
for each row execute function public.school_apply_default_plan_settings();

create or replace function public.school_enforce_active_student_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  allowed integer;
  active_count integer;
begin
  if new.status <> 'active' then
    return new;
  end if;

  select coalesce(max_students, 200)
    into allowed
    from public.school_organization_plan_settings
   where organization_id = new.organization_id;

  allowed := coalesce(allowed, 200);

  select count(*)
    into active_count
    from public.school_enrollments e
   where e.organization_id = new.organization_id
     and e.status = 'active'
     and (tg_op = 'INSERT' or e.id <> new.id);

  if active_count >= allowed then
    raise exception 'Student limit reached for this institution (% active students). Ask platform admin to increase the plan limit.', allowed
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_school_enforce_active_student_limit on public.school_enrollments;
create trigger trg_school_enforce_active_student_limit
before insert or update of status, organization_id on public.school_enrollments
for each row execute function public.school_enforce_active_student_limit();

create table if not exists public.school_principal_links (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  slug text not null unique,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id)
);

insert into public.school_principal_links (organization_id, slug)
select id, slug from public.school_organizations
on conflict (organization_id) do nothing;

create table if not exists public.school_staff_compensation (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  membership_id uuid not null references public.school_memberships(id) on delete cascade,
  base_salary numeric(12,2) not null default 0 check (base_salary >= 0),
  currency text not null default 'PKR',
  pay_frequency text not null default 'monthly' check (pay_frequency in ('monthly', 'weekly', 'daily', 'contract')),
  bank_account_title text,
  bank_account_number text,
  wallet_number text,
  notes text,
  effective_from date not null default current_date,
  effective_to date,
  is_active boolean not null default true,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, membership_id, effective_from),
  check (effective_to is null or effective_to >= effective_from)
);

create table if not exists public.school_payroll_runs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  payroll_month date not null,
  status text not null default 'draft' check (status in ('draft', 'approved', 'paid', 'cancelled')),
  gross_amount numeric(14,2) not null default 0 check (gross_amount >= 0),
  deductions_amount numeric(14,2) not null default 0 check (deductions_amount >= 0),
  net_amount numeric(14,2) not null default 0 check (net_amount >= 0),
  notes text,
  created_by uuid references public.profiles(id) on delete set null,
  approved_by uuid references public.profiles(id) on delete set null,
  paid_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, payroll_month)
);

create table if not exists public.school_payroll_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  payroll_run_id uuid not null references public.school_payroll_runs(id) on delete cascade,
  membership_id uuid not null references public.school_memberships(id) on delete cascade,
  base_salary numeric(12,2) not null default 0 check (base_salary >= 0),
  bonus_amount numeric(12,2) not null default 0 check (bonus_amount >= 0),
  deduction_amount numeric(12,2) not null default 0 check (deduction_amount >= 0),
  net_amount numeric(12,2) not null default 0 check (net_amount >= 0),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid', 'held', 'cancelled')),
  payment_method text,
  payment_reference text,
  paid_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (payroll_run_id, membership_id)
);

create table if not exists public.school_resources (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.school_organizations(id) on delete cascade,
  uploaded_by uuid references public.profiles(id) on delete set null,
  title text not null,
  description text,
  resource_type text not null default 'notes'
    check (resource_type in ('notes', 'past_paper', 'test', 'assignment', 'book', 'other')),
  class_id uuid references public.school_classes(id) on delete set null,
  section_id uuid references public.school_sections(id) on delete set null,
  subject_name text,
  file_url text not null,
  light_file_url text,
  dark_file_url text,
  context_text_url text,
  file_type text not null default 'pdf',
  visibility text not null default 'school'
    check (visibility in ('school', 'class', 'section', 'teacher_private')),
  status text not null default 'active' check (status in ('active', 'hidden', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists school_plan_settings_status_idx
  on public.school_organization_plan_settings (billing_status, max_students);
create index if not exists school_compensation_org_member_idx
  on public.school_staff_compensation (organization_id, membership_id, is_active);
create index if not exists school_payroll_runs_org_month_idx
  on public.school_payroll_runs (organization_id, payroll_month desc);
create index if not exists school_payroll_items_run_status_idx
  on public.school_payroll_items (payroll_run_id, payment_status);
create index if not exists school_resources_org_scope_idx
  on public.school_resources (organization_id, resource_type, class_id, section_id, created_at desc);

alter table public.institution_plan_tiers enable row level security;
alter table public.school_organization_plan_settings enable row level security;
alter table public.school_principal_links enable row level security;
alter table public.school_staff_compensation enable row level security;
alter table public.school_payroll_runs enable row level security;
alter table public.school_payroll_items enable row level security;
alter table public.school_resources enable row level security;

drop policy if exists "platform admins manage institution plan tiers" on public.institution_plan_tiers;
create policy "platform admins manage institution plan tiers"
  on public.institution_plan_tiers for all
  using (public.school_is_platform_admin())
  with check (public.school_is_platform_admin());

drop policy if exists "school admins read own plan settings" on public.school_organization_plan_settings;
create policy "school admins read own plan settings"
  on public.school_organization_plan_settings for select
  using (public.school_has_role(organization_id, array['owner','admin']));

drop policy if exists "platform admins manage school plan settings" on public.school_organization_plan_settings;
create policy "platform admins manage school plan settings"
  on public.school_organization_plan_settings for all
  using (public.school_is_platform_admin())
  with check (public.school_is_platform_admin());

drop policy if exists "principal links visible to members" on public.school_principal_links;
create policy "principal links visible to members"
  on public.school_principal_links for select
  using (is_active and public.school_is_member(organization_id));

drop policy if exists "platform admins manage principal links" on public.school_principal_links;
create policy "platform admins manage principal links"
  on public.school_principal_links for all
  using (public.school_is_platform_admin())
  with check (public.school_is_platform_admin());

drop policy if exists "school payroll visible to finance admins" on public.school_staff_compensation;
create policy "school payroll visible to finance admins"
  on public.school_staff_compensation for select
  using (public.school_has_role(organization_id, array['owner','admin','accountant']));

drop policy if exists "school payroll managed by finance admins" on public.school_staff_compensation;
create policy "school payroll managed by finance admins"
  on public.school_staff_compensation for all
  using (public.school_has_role(organization_id, array['owner','admin','accountant']))
  with check (public.school_has_role(organization_id, array['owner','admin','accountant']));

drop policy if exists "school payroll runs visible to finance admins" on public.school_payroll_runs;
create policy "school payroll runs visible to finance admins"
  on public.school_payroll_runs for select
  using (public.school_has_role(organization_id, array['owner','admin','accountant']));

drop policy if exists "school payroll runs managed by finance admins" on public.school_payroll_runs;
create policy "school payroll runs managed by finance admins"
  on public.school_payroll_runs for all
  using (public.school_has_role(organization_id, array['owner','admin','accountant']))
  with check (public.school_has_role(organization_id, array['owner','admin','accountant']));

drop policy if exists "school payroll items visible to finance admins" on public.school_payroll_items;
create policy "school payroll items visible to finance admins"
  on public.school_payroll_items for select
  using (public.school_has_role(organization_id, array['owner','admin','accountant']));

drop policy if exists "school payroll items managed by finance admins" on public.school_payroll_items;
create policy "school payroll items managed by finance admins"
  on public.school_payroll_items for all
  using (public.school_has_role(organization_id, array['owner','admin','accountant']))
  with check (public.school_has_role(organization_id, array['owner','admin','accountant']));

drop policy if exists "school resources visible to members" on public.school_resources;
create policy "school resources visible to members"
  on public.school_resources for select
  using (
    status = 'active'
    and (
      public.school_has_role(organization_id, array['owner','admin','teacher','staff'])
      or public.school_can_view_student(organization_id, auth.uid())
      or public.school_is_member(organization_id)
    )
  );

drop policy if exists "school teachers manage resources" on public.school_resources;
create policy "school teachers manage resources"
  on public.school_resources for all
  using (public.school_has_role(organization_id, array['owner','admin','teacher']))
  with check (public.school_has_role(organization_id, array['owner','admin','teacher']));

do $$
begin
  alter publication supabase_realtime add table public.school_organization_plan_settings;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.school_payroll_runs;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.school_payroll_items;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
