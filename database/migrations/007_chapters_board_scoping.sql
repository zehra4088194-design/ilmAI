-- ============================================
-- MIGRATION 007: Board-scoped chapters (Pakistan vs India kept separate)
-- ============================================
-- Problem: migration 004_india_subjects_seed.sql extended shared subject
-- rows (Physics, Chemistry, Biology, Mathematics, English, Computer
-- Science) to cover BOTH Pakistani and Indian boards on the SAME subject
-- row. Chapters belong to a subject (chapters.subject_id), not to a board,
-- so without this migration, any chapters added under those shared
-- subjects would show to Pakistani AND Indian students mixed together —
-- which is exactly what should NOT happen.
--
-- Fix: add a `boards` column to chapters, same array pattern already used
-- on subjects.boards. Empty array = "applies to every board the parent
-- subject supports" (safe default, keeps any existing chapters visible
-- exactly as before). A non-empty array restricts that specific chapter
-- to only the listed boards — e.g. tag Pakistan-curriculum chapters with
-- the BISE/FBISE/AKU boards, and India-curriculum chapters with
-- CBSE/ICSE/STATE_BOARD_IN, even though they sit under the same "Physics"
-- subject row.
-- ============================================

alter table public.chapters add column if not exists boards board_type[] not null default '{}';
comment on column public.chapters.boards is 'Empty = visible to all boards of the parent subject. Non-empty = restricted to just these boards (used to keep Pakistan/India chapters separate under a shared subject like Physics).';

create index if not exists idx_chapters_boards on public.chapters using gin(boards);

-- Chapters admin needs is_active + order_index to already be editable —
-- they are (see 001_initial_schema.sql) — no further column changes needed.
