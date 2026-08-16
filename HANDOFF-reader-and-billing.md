# Handoff: 11th/12th upload check + Parent-connect QR removal

Paste this whole file as the first message to the new Claude Code session
(same repo, same Supabase MCP + B2 env already configured in `.env.local`).

## Task 0 — Finish the 11th/12th grade notes upload to B2

The last few attempts at this failed part-way through with B2 connection
errors (`ETIMEDOUT`) — not a code bug, just flaky connectivity. Re-run:
```
npx tsx --env-file=.env.local scripts/bulk-upload-11th-library-resources.ts
npx tsx --env-file=.env.local scripts/bulk-upload-12th-library-resources.ts
```
Both are idempotent (same B2 key = overwrite, no duplicates) — safe to
re-run as many times as needed until they complete without error. Confirm
by running to completion (11th: 286 resources, 12th: 267 resources expected
— see console output "Discovered N resources").

## Task 1 — Parent-connect: remove QR code, code-only on both sides

The parent-connect flow currently offers two ways to link a parent to a
student: a phone **number** field and a **QR code**. Remove the QR code
option entirely — keep the phone number field, and replace the QR code with
a **connect code** (text/numeric code) shown on both the parent side and the
student side, so linking happens by exchanging that code instead of scanning
a QR.

Not yet investigated. Start by finding the parent-connect UI (likely under
`src/components/features/parent/` or similar) and whatever currently
generates/reads the QR code, to see what backs it before changing anything.
