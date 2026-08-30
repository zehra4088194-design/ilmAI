-- Lock down two staging tables flagged by the Supabase security advisor
-- (RLS disabled -> fully readable/writable by anon and authenticated roles).
--
-- Found via Phase 8 audit. Both public.import_payload_staging and
-- public.verified_qbank_stage_20260823 are transient bulk-import staging
-- tables (batch_id/seq/total/chunk columns are used to reassemble a large
-- payload that was uploaded in chunks by a one-off admin script / MCP SQL
-- call). A repo-wide grep of src/, scripts/, and supabase/ for both table
-- names found no application code touching them at all -- the only hit is
-- the auto-generated src/lib/supabase/database.types.ts type declarations.
-- There is no legitimate client-facing (anon/authenticated) access pattern
-- to preserve, so instead of writing policies we enable RLS with zero
-- policies, which fully default-denies anon/authenticated access while
-- leaving service-role clients (used by scripts/ for the actual import
-- work) completely unaffected, since service-role always bypasses RLS.

ALTER TABLE public.import_payload_staging ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.verified_qbank_stage_20260823 ENABLE ROW LEVEL SECURITY;
