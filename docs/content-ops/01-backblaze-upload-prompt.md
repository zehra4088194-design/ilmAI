# Prompt 1 — Discover, upload to Backblaze B2 + catalog in Supabase

> Paste this whole file as your first message to a Claude Code CLI session
> (e.g. opened via Hyper) — with the **Supabase MCP connected** and the `b2`
> CLI already authorized. Fill in the blanks first.

---

**ROOT FOLDER:** `___` (e.g. `E:\data\9th\notes`. This can be either ONE
subject's folder, or a folder that contains one subfolder per subject —
I'll figure out which from what's actually inside it, see Step 0.)
**CLASS / GRADE:** `___` (e.g. `Grade 9`)
**BOARD (leave blank for "all boards"):** `___`
**BUCKET NAME (leave blank if unsure — I'll list buckets and ask):** `___`
**SUPABASE PROJECT:** `___` (project ref/name — ask me if you have MCP
access to more than one project and can't tell which is "ilm AI")

---

You are cataloging study files for the ilm AI Study app: discovering what's
actually on disk, uploading it to Backblaze B2, and creating the matching
`library_resources` row in Supabase for each topic/chapter — with **light
PDF, dark PDF, and companion `.txt` context file all linked consistently on
the same row**. A separate web-based Claude session (Supabase-connected)
adds the question bank afterward, in a follow-up pass — this session does
not touch `resource_mcq_sets`.

The `b2` CLI is already authorized — don't re-authorize, don't ask for
credentials.

## Step 0 — Discover before assuming anything

Don't guess the folder layout. Actually walk it:

```
find "<ROOT FOLDER>" -type f | sort
```
(or `Get-ChildItem -Recurse` if this is a PowerShell/Windows shell — use
whatever actually works here.)

**First decide: single-subject mode or multi-subject batch mode.**
- If the root folder's own files/subfolders are clearly one subject's topics
  (e.g. numbered chapter folders directly inside it) → **single-subject
  mode**: treat the whole root as one subject.
- If the root folder's immediate children are themselves subject folders
  (e.g. `biology/`, `chemistry/`, `phy/`, `math/`, `english/`, `islm/`,
  `T_Q/`, `urdu/`, `com/` sitting side by side) → **multi-subject batch
  mode**: process every one of those subfolders as its own subject, one
  after another, doing the full Step 0–3 pipeline for each. Skip any
  subfolder that clearly isn't a subject's content (e.g. a stray `docs/`
  folder) — say so in the final report, don't silently drop it without
  mentioning it.

For **each subject folder** (whichever mode), work out for yourself:
- Which Supabase subject it maps to. Folder names may be abbreviated
  (`phy` → Physics, `com` → Computer Science, `islm` → Islamiat, `T_Q` →
  Tarjuma Tul Quran) — match by meaning against the real subject list in
  Supabase (Step 1), don't ask me to spell out every mapping. Only ask if a
  folder name is genuinely ambiguous or matches nothing.
- How topics/chapters are organized inside it (numbered folders? numbered
  filenames? e.g. `01 - Kinematics/`, `Ch02_Dynamics.pdf`...).
- For each topic, which files are the **light-theme PDF**, the
  **dark-theme PDF**, and the **companion `.txt`** (full extracted text of
  that same content — used for AI grounding, not the question bank).
- Whether a topic's material is `reading` (textbook/notes), `mcq`, `short`,
  or `long` — infer from filename/folder naming (`MCQs`, `Short Questions`,
  `Long Questions`, everything else → `reading`).

**Not every topic will have all three variants — that's expected, not an
error.** Some may only have one PDF (use it for both light and dark), some
may have no `.txt` at all. Upload/link whatever genuinely exists. Track
every missing variant per topic — you must report all of them at the end
(see "End of batch" below), don't just silently skip them.

If the layout is ambiguous for a given topic (can't tell which file is which
variant, or which topic number a file belongs to), don't guess — list what
you found and ask me before uploading that one.

## Step 1 — Resolve subject + chapters in Supabase

1. `select id, name, slug from subjects` (fetch the whole list once) and
   match each subject folder against it by name/meaning. Don't create a new
   subject — if a folder genuinely matches nothing, stop and ask me about
   that one folder (don't block the rest of the batch on it).
2. For each topic discovered in Step 0: `select id, name, slug, order_index
   from chapters where subject_id = '<id>'` and fuzzy-match by name. Use a
   confident match. If genuinely no match, insert a new `chapters` row
   (`name`, `slug`, `subject_id`, `order_index` — use the topic number from
   the folder/file naming if there is one, otherwise max existing + 1). If
   ambiguous, list candidates and ask me — this is the "dynamic topics" step,
   get it right rather than fast.

## Step 2 — Upload, one consistent naming scheme

Confirm the `b2` CLI's exact upload syntax first (`b2 version` / `b2 --help`
— v3/v4 uses `b2 file upload <bucket> <local> <key>` and `b2 bucket list`;
older CLI uses `b2 upload-file` / `b2 list-buckets`). Confirm the bucket
(use what I gave above, or list and ask if more than one).

For every topic, build a clean slug for its title (lowercase, hyphens) and
upload whichever of the 3 files exist under **one shared key prefix**, so
the three variants of the same topic always sit next to each other and are
trivially identifiable:

```
library/<subject-slug>/<chapter-slug>/<content-section>/<clean-title>.light.pdf
library/<subject-slug>/<chapter-slug>/<content-section>/<clean-title>.dark.pdf
library/<subject-slug>/<chapter-slug>/<content-section>/<clean-title>.context.txt
```

Never delete or modify the local source files.

## Step 3 — Insert the `library_resources` row

One row per topic/content-section (not per file — the light PDF, dark PDF,
and `.txt` all belong on the *same* row). Via the Supabase MCP `execute_sql`
tool:

- `subject_id`, `chapter_id` from Step 1.
- `resource_type` (`text_book | notes | pairing_scheme | guess_paper`),
  `content_section` (`reading | mcq | short | long`), `book_title`, `title`
  (specific and exact, e.g. `"Kinematics — MCQs"` — the web session finds
  this row by exact title later, so make it unambiguous).
- `light_file_url` = `'r2://<bucket>/<light key>'` if a light PDF was
  uploaded.
- `dark_file_url` = `'r2://<bucket>/<dark key>'` if a dark PDF was uploaded
  (if only one PDF variant exists, use it for **both** `light_file_url` and
  `dark_file_url`).
- `drive_url` = same as `light_file_url` (falls back to `dark_file_url` if
  no light variant) — this column is `NOT NULL` in the schema, always set it
  even though the app prefers `light_file_url`/`dark_file_url` when present.
- `context_text_url` = `'r2://<bucket>/<context key>'` if a `.txt` was
  found; otherwise leave null (don't invent one).
- `board` (or null for all boards), `grade_level` from what I gave above.

## End of batch

Report **one table per subject folder processed**, columns: topic → chapter
(matched existing / created new) → `library_resources.id` + exact `title` →
**Light** (✓ / MISSING) → **Dark** (✓ / MISSING) → **Context .txt** (✓ /
MISSING). Every topic must appear in this table even if all three variants
were found — the MISSING column is how I catch content gaps, so never omit a
row just because nothing was missing for it.

Then a short separate list: any subject folders you couldn't map to a
Supabase subject, any topics you skipped entirely and why (ambiguous file
mapping, unreadable folder structure, etc.).

Hand me the table(s) — it's what I feed into the next prompt (run
separately, on the web) so it knows exactly which resource row to attach
each topic's question bank to.

Do **not** insert into `resource_mcq_sets` in this session.
