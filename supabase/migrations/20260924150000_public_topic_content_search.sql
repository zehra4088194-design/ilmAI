-- Public content search for the global search box.
-- Only the service role can execute this function; it searches approved library
-- excerpts and verified question-bank text without exposing the source index itself
-- to anon/authenticated clients.

create or replace function public.search_public_topic_content(
  p_query text,
  p_limit integer default 12
)
returns table (
  match_kind text,
  subject_slug text,
  subject_name text,
  chapter_slug text,
  chapter_name text,
  grade_level text,
  board text,
  resource_id uuid,
  resource_title text,
  content_section text,
  snippet text,
  rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with matches as (
    select
      'resource'::text as match_kind,
      s.slug as subject_slug,
      s.name as subject_name,
      c.slug as chapter_slug,
      c.name as chapter_name,
      lr.grade_level::text as grade_level,
      lr.board::text as board,
      lr.id as resource_id,
      lr.title as resource_title,
      lr.content_section as content_section,
      left(rc.text, 700) as snippet,
      ts_rank_cd(rc.search_vector, websearch_to_tsquery('simple', p_query))::real as rank
    from public.resource_source_chunks rc
    join public.library_resources lr on lr.id = rc.resource_id
    join public.subjects s on s.id = lr.subject_id and s.is_active = true
    join public.chapters c on c.id = lr.chapter_id and c.is_active = true
    where rc.resource_kind = 'library'
      and lr.importer_status = 'approved'
      and length(btrim(p_query)) > 0
      and rc.search_vector @@ websearch_to_tsquery('simple', p_query)

    union all

    select
      'question'::text as match_kind,
      s.slug as subject_slug,
      s.name as subject_name,
      c.slug as chapter_slug,
      c.name as chapter_name,
      null::text as grade_level,
      null::text as board,
      q.id as resource_id,
      null::text as resource_title,
      coalesce(q.question_type, q.type::text) as content_section,
      left(q.text, 700) as snippet,
      public.similarity(q.text, p_query)::real as rank
    from public.questions q
    join public.subjects s on s.id = q.subject_id and s.is_active = true
    join public.chapters c on c.id = q.chapter_id and c.is_active = true
    where q.is_verified = true
      and q.correct_answer is not null
      and length(btrim(p_query)) > 1
      and public.similarity(q.text, p_query) >= 0.18
  )
  select *
  from matches
  order by rank desc
  limit greatest(1, least(coalesce(p_limit, 12), 30));
$$;

revoke all on function public.search_public_topic_content(text, integer) from public, anon, authenticated;
grant execute on function public.search_public_topic_content(text, integer) to service_role;
