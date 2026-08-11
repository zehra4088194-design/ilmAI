# Prompt 2 — Add the exact question bank to an existing resource

> Run this on **claude.ai (web)**, in a chat with the **Supabase connector**
> turned on for the ilm AI project — not the CLI, not this repo. Paste this
> whole message, fill in the blanks, and attach the PDF for this one file.

---

**RESOURCE TITLE (exact, as created by the upload session):** `___`
(e.g. `Kinematics — MCQs`. If you don't have the exact title, paste the row
from `upload-manifest.json` / the summary table the upload session gave you
instead — subject, chapter, and `library_resources.id` if you have it.)

---

The file this row points to (in Backblaze B2) is **the same PDF I'm
attaching here** — it was already uploaded and cataloged by a separate
session. Your only job is to read the attached PDF and add its **exact,
verbatim** question bank to Supabase for that one resource. This is not
AI-generated content — every question must come word-for-word from the
attached PDF. If a section (MCQs / short / long) genuinely isn't in the
file, leave that array empty. Never invent filler questions to hit a target
count.

## Why this matters

Once seeded, `resource_mcq_sets` (with `status='ready'`) is served directly
by the app's `/api/resources/questions` route with **zero AI calls** at test
time. Get the transcription right here and no AI call is ever needed for
this file again.

## Steps

1. **Find the resource row.** Using Supabase:
   `select id, title, subject_id, chapter_id from library_resources where
   title = '<RESOURCE TITLE>'`. If that doesn't match exactly, search more
   loosely (`ilike '%...%'`, or filter by subject/chapter) using whatever I
   gave you above. If you find more than one plausible match, list them and
   ask me which one — don't guess. Note this row's `id`.

2. **Read the attached PDF fully** and transcribe its questions verbatim:
   - **MCQs**: `{ q, opts: [4 options], correct: <0-3 index>, exp }` — the
     correct index and `exp` (explanation) must come from what's actually
     marked/answer-keyed in the file. If no answer key exists for an MCQ,
     drop that MCQ rather than guessing the answer.
   - **Short questions**: `{ q, marks, keyPoints: [...], modelAnswer }` —
     `marks` only if stated in the file, `modelAnswer`/`keyPoints` taken from
     the file's own answer, not paraphrased.
   - **Long questions**: same shape as short, typically higher `marks`.

3. **Upsert into `resource_mcq_sets`** via Supabase (SQL editor or the
   connector's SQL tool — not a schema migration, this is a data write):
   ```sql
   insert into public.resource_mcq_sets
     (resource_kind, resource_id, questions, short_questions, long_questions, status, generated_at, updated_at)
   values
     ('library', '<library_resources.id from step 1>', '<questions jsonb>'::jsonb, '<short jsonb>'::jsonb, '<long jsonb>'::jsonb, 'ready', now(), now())
   on conflict (resource_kind, resource_id) do update set
     questions = excluded.questions,
     short_questions = excluded.short_questions,
     long_questions = excluded.long_questions,
     status = 'ready',
     generated_at = now(),
     updated_at = now();
   ```
   **Do not** touch `resource_processing_jobs` or `library_resources.drive_url`
   in this session — the upload session already set those up; this pass only
   adds the question bank to the row that already exists.

4. **Report back**: resource title + id you attached it to, MCQ / short /
   long counts, and anything you skipped (no answer key, unreadable scan,
   couldn't find a matching resource row) so I can follow up.

If I'm sending you several PDFs in one chat, repeat steps 1–3 for each one —
match each PDF to its own resource row by title, don't mix questions from
different files into the same `resource_mcq_sets` row.
