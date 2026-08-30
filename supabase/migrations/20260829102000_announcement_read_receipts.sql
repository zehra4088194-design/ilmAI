-- Phase 6c: read-receipt tracking for announcements. Extends the existing
-- school_notification_deliveries queue rather than adding a parallel delivery/read table — every
-- in-app delivery already becomes exactly one row in `notifications` (see deliver() in
-- src/app/api/cron/school-notifications/route.ts), this just links the two so a delivery row's
-- read status can be read back from notifications.is_read.
alter table public.school_notification_deliveries add column if not exists notification_id uuid references public.notifications(id) on delete set null;
