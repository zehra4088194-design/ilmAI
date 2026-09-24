-- Subject-aware question types (Letters, Vocabulary, Grammar, Numericals).
-- Mirrors the migration already applied to the remote project via the
-- Supabase MCP tool (apply_migration name: subject_content_profile_and_extended_questions),
-- recreated here so the local migration history stays in sync with remote.

-- 1. Tag each subject with a content profile so test/practice generation can
--    offer subject-appropriate extra question types (Letters/Vocab/Grammar for
--    language subjects, Numericals for STEM subjects).
alter table public.subjects
  add column if not exists content_profile text not null default 'general'
  check (content_profile in ('language', 'stem', 'general'));

update public.subjects set content_profile = 'language'
  where lower(name) in ('english', 'urdu') or lower(coalesce(code, '')) in ('eng', 'urd', 'urdu');

update public.subjects set content_profile = 'stem'
  where lower(name) in ('mathematics', 'math', 'physics', 'chemistry', 'biology', 'computer science')
     or lower(coalesce(code, '')) in ('math', 'phy', 'chem', 'bio', 'cs');

-- 2. Store the newly-extracted Letter/Vocab/Grammar/Numerical question banks
--    alongside the existing MCQ/short/long ones, per resource.
alter table public.resource_mcq_sets
  add column if not exists extended_questions jsonb not null default '{}'::jsonb;

-- 3. Allow teacher-generated test items to be tagged with the 4 new sections.
alter table public.teacher_generated_test_items
  drop constraint if exists teacher_generated_test_items_section_check;
alter table public.teacher_generated_test_items
  add constraint teacher_generated_test_items_section_check
  check (section in ('MCQ', 'SHORT', 'LONG', 'LETTER', 'VOCAB', 'GRAMMAR', 'NUMERICAL'));
