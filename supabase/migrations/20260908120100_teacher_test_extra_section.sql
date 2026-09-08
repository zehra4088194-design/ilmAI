-- Adds an 8th, always-manual "Additional Questions" section to Test Studio — a teacher can type
-- any question that doesn't fit MCQ/Short/Long/Letter/Vocab/Grammar/Numerical. Unlike those, it
-- has no chapter-bank/Auto counterpart, so it's purely for tagging hand-typed items.
-- Mirrors the migration already applied to the remote project via the Supabase MCP tool
-- (apply_migration name: teacher_test_extra_section).

alter table public.teacher_generated_test_items
  drop constraint if exists teacher_generated_test_items_section_check;
alter table public.teacher_generated_test_items
  add constraint teacher_generated_test_items_section_check
  check (section in ('MCQ', 'SHORT', 'LONG', 'LETTER', 'VOCAB', 'GRAMMAR', 'NUMERICAL', 'EXTRA'));
