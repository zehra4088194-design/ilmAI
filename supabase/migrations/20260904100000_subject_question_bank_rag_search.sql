-- The AI Tutor's real grounding source: the verified question bank (public.questions,
-- 35k+ rows spanning every subject/chapter, populated per uploaded library resource via
-- source_kind/source_id). MCQs carry an options array + a correct_answer index; SHORT/LONG
-- questions carry a full worked model-answer string as correct_answer. This ranks that bank
-- by trigram similarity against the student's free-text question (same technique already
-- used by idx_questions_text_trgm elsewhere in this schema), scoped to subject (+ optional
-- chapter). Complements search_subject_resource_chunks (20260904090000), which searches the
-- separate, currently-sparse resource_source_chunks TXT index.

create or replace function public.search_subject_questions(
  p_subject_id uuid,
  p_chapter_id uuid default null,
  p_query text default '',
  p_limit integer default 6
)
returns table (
  id uuid,
  chapter_id uuid,
  question_type text,
  text text,
  options jsonb,
  correct_answer jsonb,
  explanation text,
  difficulty text,
  marks integer,
  similarity real
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    q.id,
    q.chapter_id,
    coalesce(q.question_type, q.type::text) as question_type,
    q.text,
    q.options,
    q.correct_answer,
    q.explanation,
    q.difficulty::text,
    q.marks,
    public.similarity(q.text, p_query) as similarity
  from public.questions q
  where q.subject_id = p_subject_id
    and (p_chapter_id is null or q.chapter_id = p_chapter_id)
    and q.is_verified = true
    and q.correct_answer is not null
    and length(btrim(p_query)) > 0
  order by public.similarity(q.text, p_query) desc
  limit greatest(1, least(coalesce(p_limit, 6), 20));
$$;

revoke all on function public.search_subject_questions(uuid, uuid, text, integer) from public, anon, authenticated;
grant execute on function public.search_subject_questions(uuid, uuid, text, integer) to service_role;
