# Handoff: 9th/10th/11th/12th library resources rollout

Paste this whole file as the first message to the new Claude Code session (same repo, same Supabase MCP + B2 env already configured in `.env.local`). It has everything needed to continue without re-discovering anything.

## What this task is

Bulk-cataloging `E:\data\9th`, `E:\data\10th`, `E:\data\11th`, `E:\data\12th` study
content into `public.library_resources` (Supabase project **bvbipddsowwivuynuuuu**,
"ilm AI"), with files uploaded to the B2 bucket `ilmai-storage-b2` (env var
`OBJECT_STORAGE_BUCKET` in `.env.local`, S3-compatible via `src/lib/storage/r2.ts`).

**User's explicit instructions to respect:**
- Skip **Islamiat** entirely, for **all** grades, this round (user will rebuild it later — do not touch `notes/islm`, `notes/islam`, or any Islamiat folder).
- Content/question-bank seeding (`resource_mcq_sets`) is **NOT** your job — the user does that themselves via a separate **web-Claude** session with the Supabase connector, using the original PDF/txt files. Your job is only: upload files to B2 + insert `library_resources` metadata rows correctly (grade level, subject, chapter, section, urls). Do not attempt exact question transcription.
- Do **not** paste huge SQL blobs through MCP `execute_sql` calls one batch at a time — it burns enormous context for no reason. Instead use `scripts/run-library-inserts.ts` / `scripts/run-simple-inserts.ts` (already written, see below) which use the Supabase JS client directly with the service-role key from `.env.local`. Only use MCP `execute_sql` for small one-off things (checking counts, creating a handful of new chapter rows).
- **B2 has had a couple of transient DNS/connectivity blips this session** (`ETIMEDOUT`, `ENOTFOUND s3.us-east-005.backblazeb2.com`). If an upload script errors out mid-way, it's almost always transient — just re-run it (uploads are idempotent, same key gets overwritten) rather than assuming something is broken.

## Done so far ✅

- **9th grade**: all 273 `notes/` resources uploaded to B2 AND inserted into `library_resources` (verified). Plus 9 full-textbook PDFs (`text_books/`, one per subject except Islamiat) uploaded + inserted. Script: `scripts/bulk-upload-9th-library-resources.ts` (discovery+upload), manifest: `9th-library-manifest.json`. Textbook script: `scripts/bulk-upload-9th-textbooks.ts`, manifest: `9th-textbooks-manifest.json`.
- **Pairing schemes, all 4 grades (9/10/11/12), all 9 subjects each minus what didn't exist** (36 total files/rows): uploaded to B2 AND inserted into `library_resources` (resource_type='pairing_scheme', chapter_id=null). Script: `scripts/bulk-upload-pairing-schemes.ts`, manifest: `pairing-schemes-manifest.json`.
- **10th grade**: ✅ DONE. All 215 `notes/` resources uploaded to B2 AND inserted into `library_resources` (verified: `select count(*) from library_resources where grade_level='GRADE_10'` = 224 = 215 notes + 9 pairing-scheme rows). No action needed here anymore.
- **Current total row counts by grade** (verified via SQL): GRADE_9 = 324 (273 notes + 9 textbooks + 33 pre-existing Biology + 9 pairing), GRADE_10 = 224 (215 notes + 9 pairing), GRADE_11 = 9 (pairing schemes only, nothing else done yet), GRADE_12 = 9 (pairing schemes only, nothing else done yet).
- **11 new g10 Tarjuma Tul Quran chapters already created** in Supabase (they didn't exist before — g10 T_Q had 0 rows). IDs are hardcoded into `scripts/bulk-upload-10th-library-resources.ts`'s `CHAPTERS['tarjuma-tul-quran']` array, so no need to recreate them.
- Two reusable insert scripts written and working:
  - `scripts/run-library-inserts.ts <manifest.json> <GRADE_9|GRADE_10|...>` — for the big per-chapter resource manifests (subject_id/chapter_id lookup table is inside the script, keyed by subject slug).
  - `scripts/run-simple-inserts.ts <textbooks|pairing> <manifest.json> [GRADE_N]` — for subject-level (no chapter) textbook/pairing-scheme rows.

## Immediate next steps (do these first)

9th and 10th grades are both fully done (B2 + Supabase). **Nothing to fix there.**
Go straight to "Remaining work: 11th and 12th grades" below.

Optional cleanup (not blocking): `9th-batch-*.sql`, `9th-library-insert.sql` are leftover
from an earlier, less-efficient approach (pasting raw SQL through MCP `execute_sql`
one batch at a time) that got abandoned in favor of `scripts/run-library-inserts.ts`.
Safe to delete, harmless to leave.

## IMPORTANT clarification on `resource_mcq_sets` (the question-bank table)

The user was briefly confused about this — write it down so it doesn't come up again:
`resource_mcq_sets` is **not** MCQ-only despite the name. It has three columns —
`questions` (MCQs), `short_questions`, `long_questions` — **all in one row per
resource** (keyed by `resource_kind`+`resource_id`). Since every `library_resources`
row already has the correct `content_section` ('mcq' | 'short' | 'long' | 'reading'),
whoever seeds the question bank (the user, via web-Claude — NOT you) just fills
whichever ONE of the three array columns matches that resource's `content_section`
and leaves the other two as `[]`. No separate table or process is needed for
short/long questions. This is already correctly documented in
`9th-library-web-claude-prompt.txt`'s Part 2 instructions — no fix needed there,
just don't reintroduce confusion about it if the user asks again.

## Just fixed this session (context for the new session, no action needed)

- Added a 5th `content_section` value **'numericals'** (was just reading/mcq/short/long).
  Migration: `supabase/migrations/20260814100000_library_resources_numericals_section.sql`
  (already applied live). Updated `src/lib/resources/catalog.ts` (`LibraryContentSection`
  type + `LIBRARY_SECTIONS` UI list, now shows a "Numericals" card), plus the two other
  files that had their own hardcoded 4-value union instead of importing the shared type:
  `src/components/features/library/LibraryGrid/index.tsx` and
  `src/components/features/admin/resources/LibraryTab/index.tsx`.
- **Fixed a real categorization bug**: Physics's "exercises" folder (textbook-style
  solved Q&A) had been wrongly tagged `content_section='reading'` — it's actually
  **Short Questions** content in the Pakistani curriculum sense. Fixed via SQL for
  grade 9 (title `— Textbook Exercises` → `— Short Questions`, section → `short`).
  Also moved grade 9 + grade 10 physics "Numericals" rows from `reading` → `numericals`.
  **If you add more grades' physics content (11th/12th), map it correctly from the
  start**: `exercises` folder → `content_section='short'` (NOT reading), `numericals`
  folder → `content_section='numericals'` (NOT reading). Don't repeat the original
  mistake in `scripts/bulk-upload-9th-library-resources.ts`'s `discoverPhysics()` /
  `scripts/bulk-upload-10th-library-resources.ts`'s `discoverPhysics10()` — those two
  scripts still have the OLD (now-wrong) mapping baked in; if you ever re-run them,
  patch the section mapping first (search for `'reading'` inside those two functions).
- **No Supabase trigger/sync needed** for "questions added should appear in the chapter
  question bank" — this already works by design. `src/lib/tests/chapter-question-bank.ts`'s
  `generateChapterQuestionPaper()` (used by Adaptive Practice / quiz generation via
  `api/ai/practice-questions` and `api/ai/generate-quiz`) already queries BOTH the
  `questions` table AND `resource_mcq_sets` (joined through `library_resources` by
  subject_id+chapter_id) and merges them. Once web-Claude seeds `resource_mcq_sets`
  with `status='ready'` for our resource rows, it surfaces automatically — nothing
  else to configure. The Admin → Questions page (`/admin/questions`) is a SEPARATE,
  manual-entry-only tool backed directly by the `questions` table — it showing "No
  questions yet" is expected and unrelated; it will never reflect `resource_mcq_sets`
  content, that's by design (two independent sources merged only at generation time).
- **Not yet done** (raised by the user, not started due to session running out of time):
  Math's chapter page currently shows one lumped "Chapter Reading (N files)" bucket
  instead of listing each individual exercise (Exercise 1.1, 1.2, Review Exercise...)
  as its own browsable item. This is a bigger UI/data-model change (a new grouping
  level between "chapter" and "content-type") — needs proper scoping with the user
  before implementing, don't just hack it in.

## Update the web-Claude prompt before sending it (if not already sent)

The already-sent `9th-library-web-claude-prompt.txt` still has the OLD physics titles
(`— Textbook Exercises` instead of `— Short Questions`) in its title↔file mapping list
for the ~15 grade-9 physics "exercises" resources. This is **safe either way** —
`resource_mcq_sets` links by `resource_id`, not by title, so a title changing after
the fact doesn't break anything already seeded. But if the user hasn't run it yet,
regenerate the title list from the DB (or just tell them: for physics "exercises"
files, look up the row by matching on chapter+"Short Questions" now, not "Textbook
Exercises") to avoid confusion mid-session.

## Remaining work: 11th and 12th grades

**Not started yet.** Same overall process as 9th/10th:

1. `find "E:/data/11th" -type f | sort` and same for 12th — **actually explore, don't guess** (each grade/subject has had genuinely different, quirky folder layouts every time so far — chapter-number folders sometimes offset from grade-9's numbering and continuing across grades, sometimes flat files, sometimes combined MCQ+short in one file, sometimes mislabeled folder names with correct content inside, sometimes filenames in Roman-Urdu spelling that doesn't match the DB chapter name exactly). Spot-check a few chapter folders' actual files before writing a discovery script — don't assume the 9th/10th pattern repeats.
2. Chapter IDs for grade 11 and grade 12 (all subjects, Islamiat excluded) were **already fetched this session** — see `grade-chapters-11-12.json` (written alongside this handoff, in the repo root) for the full `{subject, chapter, slug, order_index, id}` list for every g11-/g12- chapter currently in Supabase. Use that instead of re-querying.
3. Known folder layout at a glance (from a shallow `find -maxdepth 3` scan, **not yet verified per-file** — verify before trusting):
   - **11th** (`E:\data\11th\notes\`): `Math/`, `chem/`, `com/`, `phy/`, `urdu/` (each has `dark/light/txt`), `eng/chapters/` (different shape, not yet inspected), `T_Q/` (not yet inspected), `islam/` (**skip**). Plus `E:\data\11th\text_books\` (not yet inspected — likely one full-book PDF per subject like 9th's).
   - **12th** (`E:\data\12th\notes\`): `Sst/` (per-chapter folders, chapter names are literally Roman-Urdu matching Pakistan Studies' 6 g12 chapters — `Chapter 1 – Islam aur Pakistan` etc., looks clean), `math/` (`dark/light/txt`), `chem/`, `com/`, `phy/mcques` + `phy/notes` (different shape than 9th/10th physics — only 2 folders, not 4), `eng/chapters/` + `eng/chips/` (two different things, not yet inspected), `urdu/chapter/` + `urdu/ghazal/` + `urdu/nazam/` (three separate folders, not yet inspected), `T_Q/` (not yet inspected), `islam/` (**skip**). Plus `E:\data\12th\text_books\`.
4. Write `scripts/bulk-upload-11th-library-resources.ts` and `...-12th-...ts` following the exact same pattern as the 10th script (per-subject discovery functions, `pushRow` helper, dry-run first, sanity-check counts against expected chapter×section totals, THEN real upload).
5. Insert via `scripts/run-library-inserts.ts <manifest> GRADE_11` / `GRADE_12` (same script, just point it at the new manifest + grade).
6. Also check `E:\data\10th\text_books\` (originally `E:\data\10th\text-books\`, hyphenated differently — confirm exact folder name) — **not yet explored or uploaded**, same treatment as `scripts/bulk-upload-9th-textbooks.ts`.
7. `E:\data\11th\text_books\` and `E:\data\12th\text_books\` similarly not yet explored/uploaded.

## Report back to the user

Once 11th/12th (notes + textbooks) are uploaded and inserted, tell the user:
- Final counts per grade/subject.
- Anything skipped and why (Islamiat — already expected/confirmed by user; any folder that was too ambiguous to map confidently — list it, don't guess).
- Remind them: question-bank seeding (`resource_mcq_sets`) is still their job via web-Claude, same as before — you only handled the file+metadata layer.
