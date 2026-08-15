# Handoff: PDF reader rebuild + Paddle checkout bug

Paste this whole file as the first message to the new Claude Code session.

## Task 1 — Rebuild the library PDF reader

The current PDF reader (used on `/library/...` resource pages) has recurring,
previously-reported bugs the user wants fixed properly this time — rebuild it
from scratch rather than patch further:
- **Fullscreen doesn't work.**
- **A "vibration"/jitter glitch** happens repeatedly while reading.
- **PDFs intermittently fail to load** ("Stored PDF file is missing." or "The
  PDF could not be loaded" / "Signed object fetch failed"). Some of this was
  B2 bandwidth-cap exhaustion (transient, unrelated to the reader itself —
  check Backblaze B2 → Caps & Alerts if it recurs), but the user also wants
  the actual PDF loading path re-verified end to end once the reader is
  rebuilt, since it's failed intermittently even with caps healthy.

Find the reader component (likely under `src/components/features/library/` —
search for "PDF reader" / the fullscreen and dark/light toggle UI) and start
from there. Confirm current file-serving path: resources are stored in B2
(`ilmai-storage-b2` bucket, `library/` prefix) via `src/lib/storage/r2.ts`
(`getR2SignedUrl` / `getR2Object`), referenced from `library_resources` rows'
`light_file_url` / `dark_file_url` (format `r2://ilmai-storage-b2/<key>`).

## Task 2 — Paddle checkout only creates a session for Pro Monthly

User-reported: of the 4 subscription tiers/billing-cycles (Pro Monthly, Pro
Annual, Elite Monthly, Elite Annual), **only Pro Monthly** actually creates a
Paddle checkout session. The other three (Pro Annual, Elite Monthly, Elite
Annual) do not. Not yet investigated this session — start by finding the
Paddle checkout/price-ID wiring (likely `src/lib/billing/` or
`src/app/api/billing/`) and comparing how each tier+cycle combination maps to
a Paddle price ID — the bug is very likely a missing/wrong price ID for 3 of
the 4 combinations, or a hardcoded Pro-Monthly-only code path.

## Context from the previous session (library data rollout — for reference only)

9th–12th grade library resources (notes + textbooks) were bulk re-uploaded to
B2 this session after the user deleted everything except `pairing-schemes/`
and `presentation-backgrounds/` from the bucket. Re-upload was driven by the
existing `scripts/bulk-upload-{9th,10th,11th,12th}-library-resources.ts` and
`scripts/bulk-upload-{9th,10th,11th,12th}-textbooks.ts` (same deterministic
B2 keys as before, so no Supabase `library_resources` changes were needed).
A one-off `scripts/restore-9th-biology.ts` also restored 33 pre-existing
grade-9 Biology rows that predate those scripts and had no manifest.

If any resource still shows "Stored PDF file is missing" after this session's
re-uploads finished, spot-check with `scripts/verify-b2-keys.ts <manifest.json...>`
(compares manifest keys against what's actually in B2 via HeadObject) — but
note HeadObject may itself fail with permission errors unrelated to whether
the file exists (seen this session); PUT/GET worked fine even when HEAD didn't,
so don't trust a HEAD failure alone as proof of a missing file.

`resource_mcq_sets` question-bank seeding (via web-Claude sessions, prompts
already sent to the user for grades 9/10/11/12) is separate, ongoing, and not
this session's concern.
