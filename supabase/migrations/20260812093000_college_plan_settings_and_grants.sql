-- College-side mirror of 20260806110000_institution_limits_payroll_resources.sql's
-- school_organization_plan_settings + school_enforce_active_student_limit, and
-- 20260810120000_school_modules_reminders_ai.sql's school_enabled_modules RPC.
-- Additive: does not touch school_* tables, and finally puts the 'college_1_500'/'college_501_2000'
-- institution_plan_tiers rows (seeded but unused since 20260806110000) to use.

create table if not exists public.college_organization_plan_settings (
  organization_id uuid primary key references public.college_organizations(id) on delete cascade,
  plan_tier_id uuid references public.institution_plan_tiers(id) on delete set null,
  billing_status text not null default 'trial'
    check (billing_status in ('trial', 'active', 'past_due', 'manual_review', 'suspended', 'cancelled')),
  max_students integer not null default 500 check (max_students >= 0),
  max_teachers integer not null default 80 check (max_teachers >= 0),
  max_storage_gb integer not null default 25 check (max_storage_gb >= 0),
  monthly_price_usd numeric(10,2) not null default 20 check (monthly_price_usd >= 0),
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

insert into public.college_organization_plan_settings (organization_id)
select id from public.college_organizations
on conflict (organization_id) do nothing;

create or replace function public.college_apply_default_plan_settings()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.college_organization_plan_settings (organization_id)
  values (new.id)
  on conflict (organization_id) do nothing;
  return new;
end;
$$;

drop trigger if exists trg_college_default_plan_settings on public.college_organizations;
create trigger trg_college_default_plan_settings
after insert on public.college_organizations
for each row execute function public.college_apply_default_plan_settings();

create or replace function public.college_enforce_active_student_limit()
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

  select coalesce(max_students, 500)
    into allowed
    from public.college_organization_plan_settings
   where organization_id = new.organization_id;

  allowed := coalesce(allowed, 500);

  select count(*)
    into active_count
    from public.college_enrollments e
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

drop trigger if exists trg_college_enforce_active_student_limit on public.college_enrollments;
create trigger trg_college_enforce_active_student_limit
before insert or update of status, organization_id on public.college_enrollments
for each row execute function public.college_enforce_active_student_limit();

create or replace function public.college_enabled_modules(p_organization_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select s.enabled_modules
  from public.college_organization_plan_settings s
  where s.organization_id = p_organization_id
    and public.college_is_member(p_organization_id)
  limit 1;
$$;

grant execute on function public.college_enabled_modules(uuid) to authenticated;

create index if not exists college_plan_settings_status_idx
  on public.college_organization_plan_settings (billing_status, max_students);

alter table public.college_organization_plan_settings enable row level security;

drop policy if exists "college admins read own plan settings" on public.college_organization_plan_settings;
create policy "college admins read own plan settings"
  on public.college_organization_plan_settings for select
  using (public.college_has_role(organization_id, array['owner','admin']));

drop policy if exists "platform admins manage college plan settings" on public.college_organization_plan_settings;
create policy "platform admins manage college plan settings"
  on public.college_organization_plan_settings for all
  using (public.college_is_platform_admin())
  with check (public.college_is_platform_admin());
