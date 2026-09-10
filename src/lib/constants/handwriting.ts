// Shared source of truth for the "handwritten note" look (NoteEditor, NotesGrid) so the client
// UI, the offline sync route, and any future surface that reuses this palette all agree on the
// same set of colours — a note's `accent_colour` column stores one of these keys, never a raw
// hex value, so the palette can be restyled later without touching any stored data.
// `text` pairs a light-mode shade with a dark-mode one (same convention as
// AiAnswerRenderer's own text-emerald-600 dark:text-emerald-400) so this stays legible on both
// a white page and a dark "glass" card, not just the dark surfaces this was first designed for.
// `important` is the same light/dark pair as `text`, pre-written with Tailwind's `!` modifier on
// each half — literally, not built by string concatenation. Tailwind's build-time scanner only
// generates CSS for class names it can find as plain text in source, so an important-prefixed
// class assembled at runtime (e.g. `` `!${cls}` ``) would silently produce no CSS at all; written
// out here it's covered like any other utility. Needed anywhere this colour has to beat a rule
// with higher selector specificity, such as .ai-doc-body h3's own `color` in globals.css.
export const HANDWRITTEN_PALETTE = [
  { key: 'violet', label: 'Violet', text: 'text-violet-600 dark:text-violet-300', important: '!text-violet-600 dark:!text-violet-300', bg: 'bg-violet-500/10', border: 'border-violet-500/30', dot: 'bg-violet-400' },
  { key: 'rose', label: 'Rose', text: 'text-rose-600 dark:text-rose-300', important: '!text-rose-600 dark:!text-rose-300', bg: 'bg-rose-500/10', border: 'border-rose-500/30', dot: 'bg-rose-400' },
  { key: 'amber', label: 'Amber', text: 'text-amber-700 dark:text-amber-300', important: '!text-amber-700 dark:!text-amber-300', bg: 'bg-amber-500/10', border: 'border-amber-500/30', dot: 'bg-amber-400' },
  { key: 'emerald', label: 'Emerald', text: 'text-emerald-600 dark:text-emerald-300', important: '!text-emerald-600 dark:!text-emerald-300', bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', dot: 'bg-emerald-400' },
  { key: 'sky', label: 'Sky', text: 'text-sky-600 dark:text-sky-300', important: '!text-sky-600 dark:!text-sky-300', bg: 'bg-sky-500/10', border: 'border-sky-500/30', dot: 'bg-sky-400' },
  { key: 'fuchsia', label: 'Fuchsia', text: 'text-fuchsia-600 dark:text-fuchsia-300', important: '!text-fuchsia-600 dark:!text-fuchsia-300', bg: 'bg-fuchsia-500/10', border: 'border-fuchsia-500/30', dot: 'bg-fuchsia-400' },
] as const;

export type HandwrittenColourKey = (typeof HANDWRITTEN_PALETTE)[number]['key'];
export const HANDWRITTEN_COLOUR_KEYS = HANDWRITTEN_PALETTE.map((c) => c.key) as HandwrittenColourKey[];

export function handwrittenColour(key: string | null | undefined) {
  return HANDWRITTEN_PALETTE.find((c) => c.key === key) || HANDWRITTEN_PALETTE[0];
}

export const NOTE_STYLES = ['typed', 'handwritten'] as const;
export type NoteStyle = (typeof NOTE_STYLES)[number];
