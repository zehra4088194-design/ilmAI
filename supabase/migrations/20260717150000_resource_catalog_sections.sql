-- Structured resource catalog: book/collection -> chapter -> exact file type.
-- Companion TXT URLs stay private; clients only receive a safe availability flag.
alter table public.library_resources
  add column if not exists book_title text,
  add column if not exists content_section text not null default 'reading',
  add column if not exists has_context_text boolean
    generated always as (context_text_url is not null and length(btrim(context_text_url)) > 0) stored;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'library_resources_content_section_check'
  ) then
    alter table public.library_resources
      add constraint library_resources_content_section_check
      check (content_section in ('reading', 'mcq', 'short', 'long'));
  end if;
end $$;

update public.library_resources as resource
set book_title = coalesce(
  nullif(btrim(resource.book_title), ''),
  case
    when resource.resource_type = 'text_book' then subject.name || ' Text Book'
    when resource.resource_type = 'notes' then subject.name || ' Notes'
    else subject.name || ' Study Material'
  end
)
from public.subjects as subject
where resource.subject_id = subject.id
  and (resource.book_title is null or btrim(resource.book_title) = '');

update public.library_resources
set book_title = case
  when resource_type = 'text_book' then 'General Text Book'
  when resource_type = 'notes' then 'General Notes'
  else 'General Study Material'
end
where book_title is null or btrim(book_title) = '';

create index if not exists library_resources_catalog_idx
  on public.library_resources (resource_type, subject_id, chapter_id, content_section);
create index if not exists library_resources_book_title_idx
  on public.library_resources (book_title);

grant select (
  id, title, description, category, resource_type, subject_id, chapter_id,
  board, grade_level, file_type, book_title, content_section, has_context_text, created_at
) on table public.library_resources to authenticated;
