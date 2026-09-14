-- Lets a student mark a note as "handwritten" (rendered in a handwriting font with a chosen
-- accent colour) instead of the default "typed" look — see NoteEditorFull and NotesGrid.
-- `accent_colour` only matters when style = 'handwritten'; it stores a key into the small,
-- fixed HANDWRITTEN_PALETTE in src/lib/constants/handwriting.ts, not a raw colour value, so the
-- palette can be restyled later without a data migration.
alter table public.notes
  add column if not exists style text not null default 'typed',
  add column if not exists accent_colour text not null default 'violet';

alter table public.notes
  add constraint notes_style_check check (style in ('typed', 'handwritten'));
