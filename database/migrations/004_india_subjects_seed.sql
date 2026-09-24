-- ============================================
-- MIGRATION: India (CBSE/ICSE/State Board) subjects
-- Without this, Indian students see ZERO subjects — the `subjects` table
-- is board-scoped (boards text[] column) and no subject listed CBSE/ICSE/
-- STATE_BOARD_IN before this migration.
-- ============================================

-- 1. Core science/math/English subjects are curriculum-similar enough at
--    this level to extend to Indian boards too, rather than duplicating them.
update public.subjects
set boards = array(select distinct unnest(boards || array['CBSE','ICSE','STATE_BOARD_IN']))
where slug in ('physics', 'chemistry', 'biology', 'mathematics', 'english', 'computer-science');

-- 2. India-specific subjects that replace the Pakistan-only ones
--    (Urdu -> Hindi, Pakistan Studies -> Social Science). Islamiat is not
--    added for Indian boards — it stays Pakistan-only, unchanged.
insert into public.subjects (name, slug, code, description, color, boards, grade_levels, total_chapters) values
('Hindi', 'hindi', 'HIN', 'Gadya, Padya aur Vyakaran', '#ea580c', '{CBSE,ICSE,STATE_BOARD_IN}', '{GRADE_9,GRADE_10}', 0),
('Social Science', 'social-science', 'SST', 'History, Geography, Civics aur Economics', '#6d28d9', '{CBSE,ICSE,STATE_BOARD_IN}', '{GRADE_9,GRADE_10}', 0)
on conflict (slug) do nothing;

select public.refresh_subject_counts();
