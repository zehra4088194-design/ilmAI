# Content ops: bulk upload + exact question banks

Two reusable prompts, run in **two different places**, for bulk-adding
subject/chapter files without touching the admin UI one file at a time:

1. **[`01-backblaze-upload-prompt.md`](./01-backblaze-upload-prompt.md)** — run in a **Claude Code CLI session** (e.g. opened via Hyper), with the Supabase MCP connected and the `b2` CLI authorized. You point it at one subject's folder — it explores the folder tree itself (doesn't need you to pre-describe the layout), figures out topic numbering and which files are the light PDF / dark PDF / companion `.txt` per topic, uploads all of them to Backblaze B2, and **creates the `library_resources` row** per topic (resolving/creating subject + chapter dynamically, `light_file_url`/`dark_file_url`/`context_text_url` all set on the same row). This is the only step that touches Backblaze or catalogs files.
2. **[`02-exact-question-bank-prompt.md`](./02-exact-question-bank-prompt.md)** — run separately on **claude.ai (web)**, in a chat with the Supabase connector enabled — not this repo, not the CLI. Given one resource's exact title (from step 1's summary) and the same PDF re-attached there, it finds that existing row and seeds its *exact*, verbatim question bank, so `/practice` never needs a live AI call for that file.

Run them in that order, per file/batch. Step 1 is the only one that needs
repo/CLI access; step 2 is deliberately self-contained so it can run
anywhere the Supabase connector is available, one resource at a time.

## Where the app's Backblaze credentials go

The `b2` CLI's own login (`b2 authorize-account`) is separate from what the
**app** needs to read files back to students. The app talks to B2 through its
S3-compatible API using [`src/lib/storage/r2.ts`](../../src/lib/storage/r2.ts),
which already supports B2 via env var fallbacks — no code changes needed,
just fill these in:

| Var | Value |
|---|---|
| `OBJECT_STORAGE_ENDPOINT` | `https://s3.<region>.backblazeb2.com` (e.g. `https://s3.us-west-004.backblazeb2.com` — check your bucket's "Endpoint" in the B2 dashboard) |
| `OBJECT_STORAGE_REGION` | the region part of the endpoint, e.g. `us-west-004` |
| `OBJECT_STORAGE_ACCESS_KEY_ID` | the B2 application key**ID** |
| `OBJECT_STORAGE_SECRET_ACCESS_KEY` | the B2 application key |
| `OBJECT_STORAGE_BUCKET` | your bucket name |

Use the **same** application key the `b2` CLI is already authorized with (or
another key scoped to the same bucket, read+write). Put these in:

- **Local dev**: `.env.local` (shape already documented in `.env.local.example`)
- **Production**: `.env.oracle` (the real file `docker-compose.oracle.yml`
  loads — `.env.oracle.example` is just the template, don't edit that one)

`R2_*` and `S3_*` names also work (same fallback chain in `r2.ts`) if you'd
rather match Cloudflare-R2-style naming — pick one set and be consistent.

## Object key naming convention

Prompt 1 keys every uploaded file the same way, with the light/dark/context
variants of one topic sharing one prefix so they're always found together:

```
library/<subject-slug>/<chapter-slug>/<content-section>/<clean-title>.light.pdf
library/<subject-slug>/<chapter-slug>/<content-section>/<clean-title>.dark.pdf
library/<subject-slug>/<chapter-slug>/<content-section>/<clean-title>.context.txt
```

- `subject-slug` / `chapter-slug` — match `subjects.slug` / `chapters.slug` in Supabase.
- `content-section` — one of `reading | mcq | short | long` (see [`LIBRARY_SECTIONS`](../../src/lib/resources/catalog.ts)).
- Example: `library/physics/kinematics/mcq/kinematics-mcqs.light.pdf`

Not every topic has all three (some have only one PDF, some have no `.txt`)
— only upload/link what actually exists, don't invent files.

The app stores these as `r2://<bucket>/<key>` — one row's `light_file_url`,
`dark_file_url`, and `context_text_url` in `library_resources` (plus
`drive_url`, which is `NOT NULL` so always gets set as a fallback). That's
what [`r2.ts`](../../src/lib/storage/r2.ts) expects, and what the
reader/download routes already resolve automatically.

## Hand-off between the two prompts

Prompt 2 never touches Backblaze and never guesses at object keys — it only
needs to find the `library_resources` row prompt 1 already created (by exact
`title`) and attach questions to it. So the only thing that needs to survive
between the two sessions is prompt 1's end-of-batch summary table (title +
`library_resources.id` per file) and the original PDFs themselves, re-attached
in the web chat.
