-- Biology 9 curriculum import finalization record.
-- Source: user-provided scanned PDF JSON extraction.
-- Source SHA256: 53127e2e9c76b30788a9e40ee85094abb947324a8d5f0b036baf5eb8ae18cc14
-- This migration is intentionally idempotent and does not publish the book.

DO $$
DECLARE
  v_book_id uuid;
BEGIN
  SELECT id INTO v_book_id
  FROM public.curriculum_books
  WHERE id = '6f0632fe-2290-48ae-b592-4197b5d845d3'::uuid;

  IF v_book_id IS NULL THEN
    RAISE NOTICE 'Biology 9 curriculum book not present; nothing to finalize.';
    RETURN;
  END IF;

  UPDATE public.curriculum_books
  SET page_count = 180,
      extraction_status = 'ready',
      extraction_version = 'curriculum-structure-v1-repaired',
      updated_at = now()
  WHERE id = v_book_id;

  UPDATE public.curriculum_imports
  SET status = 'imported',
      source_hash = '53127e2e9c76b30788a9e40ee85094abb947324a8d5f0b036baf5eb8ae18cc14',
      importer = 'claude-chat-etl',
      importer_version = 'curriculum-structure-v1-repaired+chat-import-1.1',
      completed_at = COALESCE(completed_at, now())
  WHERE id = '77577007-41a6-4fac-a6fe-f72389f3e94f'::uuid
    AND book_id = v_book_id;
END $$;

-- Verification invariants for this import:
-- pages = 180; nodes = 69; examples = 3; questions = 7.
-- The source extraction contains 172 fine-grained content blocks; the current
-- database stores one raw_text rollup block per leaf node (56 blocks) while
-- curriculum_pages retains the page-level source transcript.
-- Source page-range inversions are preserved verbatim rather than guessed.
