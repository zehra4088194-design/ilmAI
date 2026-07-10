-- Class-scoped resources and admin-authored question bank support.
-- Non-destructive: existing rows remain available until admins tag them.

alter table public.library_resources
  add column if not exists resource_type text not null default 'text_book'
    check (resource_type in ('text_book', 'notes', 'other')),
  add column if not exists chapter_id uuid references public.chapters(id) on delete set null;

create index if not exists idx_library_resource_type on public.library_resources(resource_type);
create index if not exists idx_library_chapter on public.library_resources(chapter_id);
create index if not exists idx_library_grade_board on public.library_resources(grade_level, board);

alter table public.past_papers
  add column if not exists grade_level grade_level,
  add column if not exists chapter_id uuid references public.chapters(id) on delete set null;

create index if not exists idx_past_papers_grade on public.past_papers(grade_level);
create index if not exists idx_past_papers_chapter on public.past_papers(chapter_id);
create index if not exists idx_past_papers_grade_board on public.past_papers(grade_level, board);
