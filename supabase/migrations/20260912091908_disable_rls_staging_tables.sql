-- Staging/import/backend-only tables had RLS enabled but no policies (fully locked,
-- inaccessible even to the app). These are populated/read only via service_role
-- (edge functions / server-side jobs), so RLS is disabled here rather than adding
-- policies that would just re-open access to the same server-side callers.
alter table public.chat_archives disable row level security;
alter table public.import_payload_staging disable row level security;
alter table public.presentation_backgrounds disable row level security;
alter table public.qbank_import_chunks disable row level security;
alter table public.resource_processing_jobs disable row level security;
alter table public.resource_source_chunks disable row level security;
alter table public.verified_qbank_stage_20260823 disable row level security;
