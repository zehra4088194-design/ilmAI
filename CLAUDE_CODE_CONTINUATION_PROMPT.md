# CONTINUATION PROMPT — School/College Separation, Remaining Work
### Paste this whole file into a new Claude Code session, inside the `studyverse-ai` project root.

---

## 0. CONTEXT — READ FIRST, DO NOT SKIP

This continues work started from `CLAUDE_CODE_MASTER_PROMPT.md` (still in the repo root — read it for
the original full scope). That work is **substantially done**. Before touching anything, read, in order:

1. `docs/SCHOOL_COLLEGE_SEPARATION_TODO.md` — the full audit + build log from every prior phase. It
   documents exactly what shipped, what was explicitly deferred and why, and the reasoning behind every
   non-obvious decision (e.g. why college-admin has an "OR-gate" between old and new schema, why PTM/
   payroll weren't ported). **This is the single most important file to read before writing any code.**
2. `docs/COLLEGE_ERP_IMPLEMENTATION.md` — the college schema plan (mirrors `docs/SCHOOL_ERP_IMPLEMENTATION.md`).
3. `supabase/migrations/20260812*.sql` (6 files, already **applied to the live database** — verified via
   `list_tables`, all `college_*`/`institution_directory_messages`/`*_pending_student_additions` tables
   exist with RLS enabled) — read these to understand the actual current schema, don't re-derive it.
4. `src/lib/school-erp/*` and `src/lib/college-erp/*` — the school ERP is the reference implementation;
   college-erp mirrors it function-for-function wherever it was ported. When extending college, match
   the school-erp pattern in the same file (same helper names, same `mutationContext`/`audit`/`done`/
   `failure` shape) rather than inventing a new one.

**Do not re-run a full `npm run typecheck` across the whole repo — it exceeds command time ceilings.**
Use `tsconfig.school-erp.json` and `tsconfig.college-erp.json` (scoped configs, already set up with the
right `include` globs) and typecheck only what you touch. Both currently pass with 0 errors — keep them
that way after every change.

**Work in small, verifiable phases.** After each phase: run the relevant scoped typecheck, summarize
exactly what changed and what's still stubbed, and update `docs/SCHOOL_COLLEGE_SEPARATION_TODO.md` (add
to it, don't replace it — it's the project's memory across sessions). Do not silently skip a requirement.

---

## 1. PRIORITY 0 — BLOCKS EVERYTHING ELSE: college organization provisioning

**The entire new `/college-admin` system built in the last session is currently unreachable.** There is
no admin page to create a `college_organizations` row (+ an owner `college_memberships` row for whoever
should run it). `/admin/colleges` and `/admin/colleges/new` already exist in the repo but operate on the
**legacy** schema (`colleges`/`college_admins` tables via `src/lib/college/*`) — confirmed by grep, they
never reference `college_organizations`.

Build this **first**, mirroring `/admin/schools` and `/admin/schools/new` exactly (read those files —
`src/app/(admin)/admin/schools/page.tsx`, `src/app/(admin)/admin/schools/actions.ts` — before starting):

1. A new provisioning action (e.g. in a new `src/lib/college-erp/admin-actions.ts`, or extend
   `src/app/(admin)/admin/colleges/actions.ts` if one exists) that:
   - Requires platform-admin (mirror however `/admin/schools/actions.ts` checks this — likely
     `ADMIN_EMAILS` or `profiles.role = 'admin'`, same pattern `college_is_platform_admin()` already
     checks in SQL).
   - Creates a `college_organizations` row (name, slug, timezone, currency, organization_type).
   - Creates the first `college_memberships` row with `member_role = 'owner'` for a given email (must
     already have an ilm AI account — same constraint every other member-add action in this codebase
     enforces).
   - Consider whether to also call `syncOrganizationCollegeGrants`/`isCollegeOrganizationBillingActive`
     wiring here or leave billing_status at its default `'trial'` — trial is almost certainly correct for
     a freshly provisioned tenant to match school's pattern (`school_organizations` also defaults to
     `'trial'` via `college_organization_plan_settings`'s default `billing_status`).
2. A new UI page — either extend the **existing** `/admin/colleges`/`/admin/colleges/new` to have a
   toggle/tab between "legacy" and "new schema" provisioning (safer, keeps one URL, matches how
   `/college-admin`'s layout already OR-gates old vs. new), or add a clearly-separate
   `/admin/colleges-v2` style route if extending the existing page risks confusing the legacy flow.
   **Decide based on how `/admin/colleges/page.tsx` is currently structured** — read it first, then pick
   whichever is less risky to the existing legacy provisioning flow.
3. After this ships: actually create one test college organization end-to-end (owner email = your own
   dev/test account) and confirm you land on the new `/college-admin` dashboard after login (Phase 2's
   `resolveCollegeRole`/`post-login-destination` routing should already handle this — verify it does).

**This unblocks real testing of everything else** — do this before any of Priority 1/2/3 below.

---

## 2. PRIORITY 1 — VERIFICATION DEBT (nothing below has been tested live)

Everything from the prior session was built and scoped-typechecked but **never run in a browser and
never exercised against real data**. Before adding new features, verify what already exists actually
works:

1. **Regenerate Supabase TypeScript types** (`src/lib/supabase/database.types.ts`) now that the new
   tables are live in the database. All the new college-erp/school-erp-new-feature code currently uses
   `as any` casts specifically because these types were never regenerated — this is technical debt, not
   a permanent design choice. Regenerating properly typed access may surface latent bugs the `any` casts
   were hiding.
2. **End-to-end click-through** (after Priority 0 unblocks it), for both school and college:
   - Login as principal → land on `/school-admin` or `/college-admin` correctly.
   - People page: search works, phone column shows, add member / enroll student forms actually submit.
   - Attendance: manual register saves; scan a real handwritten photo through the OCR pipeline (or a
     clearly-legible test image) and confirm the review table + confirm flow actually writes rows.
   - Exams: create exam → date-sheet wizard → marks entry → publish → report card templates render and
     print/PDF correctly (test all 4 templates, not just the default).
   - Communication: principal directory search finds another institution, campus picker shows only when
     >1 campus, message send + notification delivery actually happens.
   - White-labeling: upload a logo, confirm it shows on `/dashboard` sidebar AND `/school` or `/college`
     portal header for a member of that institution.
   - Kids Zone: create a school class with `grade_level` set to something ≤5 (e.g. "Grade 3"), enroll a
     test student, confirm the Kids Zone banner appears on `/school` and the 4 games are playable.
   - QR scanner: **this was never verified against a real camera/QR code** (flagged explicitly in the
     TODO doc as unverified) — test on an actual mobile device. If still unreliable after the fixes
     already made, implement the manual-code fallback described in the master prompt Part 4.5 point 2
     (remove QR from both `ParentQrScanner` and the student/school "show QR" screen, replace with a
     typed linking code on both sides).
3. **Run a full production build** (`npm run build`) at least once end-to-end (previously never done —
   only scoped `tsc --noEmit` checks were run). Fix anything the scoped typechecks missed (e.g. issues in
   files outside both scoped tsconfig's `include` globs, or Next.js-specific build errors like invalid
   `generateMetadata`/route conflicts that `tsc` alone wouldn't catch).
4. Add at least a handful of focused vitest tests for the new action functions (mirror
   `tests/unit/school-erp.test.ts` if one exists — check first) — none were written for any code from
   the last session.

---

## 3. PRIORITY 2 — explicitly deferred college-parity items

Each of these is real, scoped, standalone work. Pick based on what the owner actually needs next; don't
build all of them speculatively.

- **Payroll for college** — new migration mirroring `20260806110000_institution_limits_payroll_resources.sql`'s
  `school_staff_compensation`/`school_payroll_runs`/`school_payroll_items` (as `college_*`), then port
  `upsertStaffCompensation`/`createPayrollRun`/`updatePayrollItem` from `school-erp/actions.ts` and
  `getSchoolPayroll` from `school-erp/queries.ts`, then a `/college-admin/payroll` page mirroring whatever
  school's payroll UI looks like (check if `/school-admin/payroll` page exists — grep for it, wasn't
  reviewed in the prior session).
- **PTM (parent-teacher meetings) for college** — new migration mirroring
  `20260807100000_school_ptm.sql`'s `school_ptm_requests`/`school_ptm_slots`/`school_ptm_notes` (as
  `college_*`), then port `createPtmSlot`/`closePtmSlot`/`requestPtm`/`respondPtmRequest`/
  `updatePtmOutcome`/`cancelPtmRequest`/`addPtmNote` and `getSchoolPtm`/`getSchoolPtmNotes`, then wire
  into `/college-admin` (needs its own page — check if school has a dedicated `/school-admin/ptm` page)
  and back into `/college`'s portal page (the PTM section was stripped out of `/college/page.tsx` — this
  is where it'd need to be re-added once the college PTM backend exists).
- **AI insights for college** (report-card AI remarks, principal AI summary) — mirror
  `school-erp/ai-insights.ts`'s `generateReportCardRemarks`/`generatePrincipalSummary` as
  college-erp equivalents. Requires adding `ai_comment`/`ai_comment_generated_at` columns to
  `college_report_cards` first (school has them via `20260810120000_school_modules_reminders_ai.sql`,
  college doesn't yet).
- **Public self-serve admission form for college** — mirror `/schools/[slug]/admissions`,
  `POST /api/school/admissions`, and the admission-document upload/signed-URL API
  (`GET /api/school-admin/admission-document`) for college. Needs a public `college_principal_links`-style
  slug resolution too if you want a clean public URL (school has `school_principal_links` from
  `20260806110000...`; no college equivalent exists yet).
- **CSV bulk people import for college** — mirror `school-erp/import-actions.ts` and
  `/school-admin/people/import`.
- **Staff attendance marking UI for college** — mirror `StaffAttendanceRegister.tsx`
  (`src/components/features/school-erp/StaffAttendanceRegister.tsx`), point it at
  `saveCollegeStaffAttendance` (doesn't exist yet — mirror `saveStaffAttendance` from
  `school-erp/actions.ts`) and wire into `/college-admin/attendance` (currently shows a placeholder
  message there instead of a real marking UI — see that page's "Staff attendance" card).
- **Self-serve college join-requests** — needs a new `college_join_requests` table (new-schema shape,
  not the legacy one) mirroring `school_join_requests` from `20260811090000_school_join_requests.sql`,
  plus `join-requests.ts`/`join-request-notify.ts`/`join-request-signup.ts` equivalents, plus wiring the
  institutional-signup step in `RegisterForm` to actually support "college" as a real search target (see
  Priority 3 below — same underlying fix).
- **Legacy → new schema data bridge** — a one-time (or repeatable) tool that takes an existing `colleges`
  row + its `college_admins` rows and provisions the equivalent `college_organizations` +
  `college_memberships` rows, so existing legacy-provisioned colleges can move onto the new feature set
  without the owner manually re-entering everything through the new admin UI. **This is real production
  data manipulation — get explicit owner sign-off on the exact mapping (which legacy fields map to which
  new fields, what happens to existing `college_lectures`/`college_resources` content) before writing it,
  don't improvise the mapping.**

---

## 4. PRIORITY 3 — original master prompt items never started

These were in `CLAUDE_CODE_MASTER_PROMPT.md`'s original scope (Parts 5, 6, 8, and the Phase 1 audit's
own flagged cleanup items) and were **not touched at all** in any session so far:

- **ZKTeco biometric teacher attendance** (master prompt Part 8) — `node-zklib` integration,
  `school_teacher_biometric_devices`/`school_teacher_biometric_mappings` tables, sync cron job, admin UI
  tab on `/school-admin/attendance`. Flag the LAN-reachability deployment constraint from the master
  prompt (point 5 of that section) to the owner before assuming the cloud cron job can actually reach a
  campus-local device IP.
- **Manual/local payment system** (master prompt Part 6) — admin-controlled pricing (base price +
  discount %, computed not hand-entered, extending `PlatformSettings` per the Phase 1 audit's
  recommendation), JazzCash/Easypaisa/Bank/Card checkout UI with QR codes (`react-qr-code`, already
  installed) + WhatsApp deep link, `institution_payment_verifications` table + admin review queue, and
  wiring verified payments into `syncOrganizationSchoolGrants`/`syncOrganizationCollegeGrants` (both
  already exist and are ready to be called from here). Needs real payment-method phone numbers from the
  owner as env vars (`SCHOOL_PAYMENT_JAZZCASH_NUMBER` etc. per the master prompt's exact naming) —
  don't hardcode placeholders.
- **`RegisterForm` institutional-signup fix** — still hardwired to the school-only search/join-request
  pipeline regardless of whether the user picks "college" as their education level (flagged in Phase 1
  audit, never fixed). Fix requires the college join-requests table from Priority 2 above to exist first.
- **`school_organizations.organization_type` still allows `'college'`** as a valid value in its CHECK
  constraint, and `/admin/schools`'s create-org dropdown still offers "College" as an option — this was
  flagged as the clearest "college treated as a school variant" schema smell in the Phase 1 audit and
  never fixed. Now that Priority 0 above gives colleges their own real provisioning path, this can
  finally be tightened: drop `'college'` from the constraint, remove it from the dropdown. **Do this only
  after Priority 0 ships** (don't remove the only working college-provisioning path before the
  replacement exists).
- **Legacy `sponsored_institution_type`/`academic_institution_type` cleanup** on `profiles` — two
  different legacy "institution" concepts flagged in the Phase 1 audit as confusing/overlapping with the
  real membership-based model. Revisit once the plan-inheritance resolvers
  (`subscription-cascade.ts` for both school and college) have been in production use for a while and
  it's clear these legacy columns are truly redundant, not before.

---

## 5. EXECUTION ORDER (do not reorder)

1. Priority 0 (college provisioning) — nothing else can be verified without this.
2. Priority 1 (verification debt) — confirm what's already built actually works before adding more.
3. Priority 2 items — pick based on what the owner actually asks for next; each is independent of the
   others (payroll doesn't block PTM doesn't block the data bridge, etc.) except:
   - Self-serve join-requests should come before the `RegisterForm` fix in Priority 3 (the fix needs
     somewhere real to route to).
4. Priority 3 items — the schema-tightening ones (`organization_type` CHECK) should come last, after
   their replacements are proven in production, not preemptively.

At the end of each numbered item above, stop, summarize what was actually built vs. stubbed, update
`docs/SCHOOL_COLLEGE_SEPARATION_TODO.md`, list any new env var that needs a real value from the owner,
and wait for confirmation before continuing to the next item.
