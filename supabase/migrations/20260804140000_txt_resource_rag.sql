-- TXT-only resource RAG. PDF binaries remain presentation assets and are never
-- used as AI context. This index is deliberately language-neutral so English,
-- Roman Urdu, and Urdu-script source text can all be searched.

alter table public.resource_source_chunks
  add column if not exists metadata jsonb not null default '{}'::jsonb;

alter table public.resource_source_chunks
  add column if not exists search_vector tsvector
  generated always as (to_tsvector('simple', coalesce(text, ''))) stored;

create index if not exists resource_source_chunks_search_idx
  on public.resource_source_chunks using gin (search_vector);

create or replace function public.search_resource_source_chunks(
  p_resource_kind text,
  p_resource_id uuid,
  p_query text,
  p_limit integer default 8
)
returns table (
  id uuid,
  chunk_index integer,
  page_number integer,
  heading text,
  text text,
  metadata jsonb,
  rank real
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    chunk.id,
    chunk.chunk_index,
    chunk.page_number,
    chunk.heading,
    chunk.text,
    chunk.metadata,
    ts_rank_cd(chunk.search_vector, websearch_to_tsquery('simple', p_query))::real as rank
  from public.resource_source_chunks as chunk
  where chunk.resource_kind = p_resource_kind
    and chunk.resource_id = p_resource_id
    and length(btrim(p_query)) > 0
    and chunk.search_vector @@ websearch_to_tsquery('simple', p_query)
  order by rank desc, chunk.chunk_index asc
  limit greatest(1, least(coalesce(p_limit, 8), 20));
$$;

drop policy if exists authenticated_read_resource_chunks on public.resource_source_chunks;
revoke all on table public.resource_source_chunks from anon, authenticated;
revoke execute on function public.search_resource_source_chunks(text, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.search_resource_source_chunks(text, uuid, text, integer) to service_role;
