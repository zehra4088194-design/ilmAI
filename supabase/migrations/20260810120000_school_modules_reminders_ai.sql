-- ============================================================
-- SCHOOL ERP: module gating, automated reminders, AI remarks
-- ------------------------------------------------------------
-- 1. enabled_modules becomes a real switch (it was stored but never read)
-- 2. notification deliveries can carry their own title/body so reminders do
--    not need a fake announcement row, plus a dedupe key so a cron re-run
--    never messages the same guardian twice for the same thing
-- 3. report cards get an AI remark column that is separate from the
--    teacher's own comment
-- ============================================================

-- ---------- 1. MODULE GATING ----------
-- Existing rows predate the admissions/ptm/reports/tests modules. Backfill
-- them so enforcement does not silently remove pages schools already use.
update public.school_organization_plan_settings
set enabled_modules = (
  select array_agg(distinct value order by value)
  from unnest(enabled_modules || array['admissions', 'ptm', 'reports', 'tests']) as value
)
where not (enabled_modules @> array['admissions', 'ptm', 'reports', 'tests']);

alter table public.school_organization_plan_settings
  alter column enabled_modules set default array[
    'dashboard',
    'people',
    'admissions',
    'attendance',
    'exams',
    'tests',
    'fees',
    'payroll',
    'academics',
    'ptm',
    'communication',
    'reports',
    'resources'
  ];

-- Members need to know which modules are on, but plan settings also hold
-- pricing and are readable only by owners/admins. This exposes just the
-- module list to any active member of that organization.
create or replace function public.school_enabled_modules(p_organization_id uuid)
returns text[]
language sql
stable
security definer
set search_path = public
as $$
  select s.enabled_modules
  from public.school_organization_plan_settings s
  where s.organization_id = p_organization_id
    and public.school_is_member(p_organization_id)
  limit 1;
$$;

grant execute on function public.school_enabled_modules(uuid) to authenticated;

-- ---------- 2. STANDALONE + DEDUPED DELIVERIES ----------
alter table public.school_notification_deliveries
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists category text not null default 'announcement',
  add column if not exists dedupe_key text;

-- One delivery per recipient per channel per logical event. The reminder cron
-- can therefore run every hour without ever double-messaging a guardian.
-- Not a partial index: NULL dedupe_key rows (plain announcements) never
-- collide anyway, and a full index is what ON CONFLICT can infer.
create unique index if not exists school_deliveries_dedupe_idx
  on public.school_notification_deliveries (organization_id, channel, dedupe_key);

create index if not exists school_deliveries_category_idx
  on public.school_notification_deliveries (organization_id, category, created_at desc);

-- ---------- 3. AI REPORT CARD REMARKS ----------
alter table public.school_report_cards
  add column if not exists ai_comment text,
  add column if not exists ai_comment_generated_at timestamptz;

-- ---------- 4. INDEXES FOR THE REMINDER QUERIES ----------
create index if not exists school_fee_invoices_due_reminder_idx
  on public.school_fee_invoices (organization_id, status, due_date);

create index if not exists school_attendance_absent_idx
  on public.school_attendance_records (organization_id, attendance_date, status);
