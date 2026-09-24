-- Uploaded pairing schemes and guess papers reuse the existing library reader,
-- search indexing, source context, and question-bank processing pipeline.
alter table public.library_resources
  drop constraint if exists library_resources_resource_type_check;

alter table public.library_resources
  add constraint library_resources_resource_type_check
  check (resource_type in ('text_book', 'notes', 'pairing_scheme', 'guess_paper', 'other')) not valid;

create index if not exists library_resources_resource_type_catalog_idx
  on public.library_resources (resource_type, board, grade_level, subject_id, chapter_id);
