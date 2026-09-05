-- Subject-wide RAG search over resource_source_chunks for the AI Tutor.
-- search_resource_source_chunks (added in 20260804140000_txt_resource_rag.sql) only
-- searches within ONE already-known resource. The AI Tutor needs to ground a
-- student's free-text question across every processed library resource and
-- verified past paper for their subject (optionally narrowed to a chapter), so
-- this adds a second function that resolves the resource set first and then
-- ranks chunks the same way (Postgres full-text search, language-neutral).

create or replace function public.search_subject_resource_chunks(
  p_subject_id uuid,
  p_chapter_id uuid default null,
  p_query text default '',
  p_limit integer default 6
)
returns table (
  resource_kind text,
  resource_id uuid,
  resource_title text,
  chunk_index integer,
  page_number integer,
  heading text,
  text text,
  rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  with scoped_resources as (
    select
      'library'::text as resource_kind,
      lr.id as resource_id,
      lr.title as resource_title
    from public.library_resources lr
    where lr.subject_id = p_subject_id
      and (p_chapter_id is null or lr.chapter_id = p_chapter_id)
      and lr.importer_status = 'approved'
    union all
    select
      'past-paper'::text as resource_kind,
      pp.id as resource_id,
      (pp.board::text || ' ' || pp.year::text || ' ' || pp.paper_type::text) as resource_title
    from public.past_papers pp
    where pp.subject_id = p_subject_id
      and (p_chapter_id is null or pp.chapter_id = p_chapter_id)
      and pp.extraction_status = 'approved'
      and pp.is_verified = true
  )
  select
    chunk.resource_kind,
    chunk.resource_id,
    scoped.resource_title,
    chunk.chunk_index,
    chunk.page_number,
    chunk.heading,
    chunk.text,
    ts_rank_cd(chunk.search_vector, websearch_to_tsquery('simple', p_query))::real as rank
  from public.resource_source_chunks as chunk
  join scoped_resources as scoped
    on scoped.resource_kind = chunk.resource_kind
   and scoped.resource_id = chunk.resource_id
  where p_subject_id is not null
    and length(btrim(p_query)) > 0
    and chunk.search_vector @@ websearch_to_tsquery('simple', p_query)
  order by rank desc, chunk.chunk_index asc
  limit greatest(1, least(coalesce(p_limit, 6), 20));
$$;

revoke all on function public.search_subject_resource_chunks(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.search_subject_resource_chunks(uuid, uuid, text, integer) to service_role;
