-- Public SEO catalog metadata. Source URLs remain unavailable to anon;
-- the server-only reader endpoint fetches the actual file after validation.
grant select (
  id, title, description, category, resource_type, book_title, content_section,
  has_context_text, subject_id, chapter_id, board, grade_level, file_type, created_at
) on table public.library_resources to anon;

grant select (
  id, subject_id, chapter_id, board, grade_level, year, paper_type,
  total_questions, duration, is_verified, download_count, created_at
) on table public.past_papers to anon;

drop policy if exists public_library_catalog_read on public.library_resources;
create policy public_library_catalog_read
on public.library_resources for select to anon
using (true);

drop policy if exists public_past_papers_catalog_read on public.past_papers;
create policy public_past_papers_catalog_read
on public.past_papers for select to anon
using (true);
