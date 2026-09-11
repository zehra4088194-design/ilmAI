-- Add chapter_id reference to school_lecture_annotations for linking to chapter question bank.
-- This allows teachers to annotate lectures that correspond to specific uploaded chapters/topics.

alter table public.school_lecture_annotations
  add column chapter_id uuid references public.chapters(id) on delete set null;

create index if not exists school_lecture_annotations_chapter_idx
  on public.school_lecture_annotations (chapter_id);
