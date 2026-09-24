-- Phase 2b: lets a queued school_notification_deliveries row point at a specific record (a fee
-- invoice today) so the in-app/push notification it generates can deep-link straight into it
-- (e.g. /school/fees/<invoiceId>) instead of always landing on the generic /school shell.
-- Extends the existing table rather than adding a parallel one — reference_type is left open
-- (not constrained to 'fee_invoice') so a future reminder category can reuse the same column.

alter table public.school_notification_deliveries add column if not exists reference_type text;
alter table public.school_notification_deliveries add column if not exists reference_id uuid;
