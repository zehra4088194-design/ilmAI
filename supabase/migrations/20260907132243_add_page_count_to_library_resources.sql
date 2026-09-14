-- Adds a page_count column to library_resources (e.g. for showing "42 pages" on a
-- resource card / progress indicators). This migration was originally applied
-- directly to the database (not through a local file) — recreated here to match
-- what's actually on the remote database, so local history stays complete.
alter table public.library_resources
  add column if not exists page_count integer;
