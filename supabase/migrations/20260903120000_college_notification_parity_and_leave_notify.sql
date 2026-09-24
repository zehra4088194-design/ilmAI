-- Brings college_notification_deliveries up to the same shape school_notification_deliveries
-- already has (20260810120000_school_modules_reminders_ai.sql + 20260829093000_fee_reminder_deep_link.sql),
-- so the college side can run the exact same reminder-queue pattern (fee/absence/weekly-report/
-- leave-update) as school does. Also adds notified_at to both leave_requests tables so the cron
-- can poll "reviewed but not yet notified" leave decisions without ever double-notifying a guardian.

alter table public.college_notification_deliveries
  add column if not exists title text,
  add column if not exists body text,
  add column if not exists category text not null default 'announcement',
  add column if not exists dedupe_key text,
  add column if not exists reference_type text,
  add column if not exists reference_id uuid;

create unique index if not exists college_deliveries_dedupe_idx
  on public.college_notification_deliveries (organization_id, channel, dedupe_key);

create index if not exists college_deliveries_category_idx
  on public.college_notification_deliveries (organization_id, category, created_at desc);

create index if not exists college_fee_invoices_due_reminder_idx
  on public.college_fee_invoices (organization_id, status, due_date);

create index if not exists college_attendance_absent_idx
  on public.college_attendance_records (organization_id, attendance_date, status);

-- ---------- Leave request decision notifications ----------
alter table public.school_leave_requests add column if not exists notified_at timestamptz;
alter table public.college_leave_requests add column if not exists notified_at timestamptz;

create index if not exists school_leave_requests_notify_idx
  on public.school_leave_requests (organization_id, status, reviewed_at)
  where notified_at is null;

create index if not exists college_leave_requests_notify_idx
  on public.college_leave_requests (organization_id, status, reviewed_at)
  where notified_at is null;
