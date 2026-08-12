# MASTER PROMPT — School & College Total Separation + Full Management System
### Paste this whole file into Claude Code, inside the `studyverse-ai` project root.

---

## 0. CONTEXT — READ FIRST, DO NOT SKIP

This is the existing **StudyVerse AI / Ilm AI** app (Next.js App Router + Supabase).
It already has a partially-built "School ERP" bolted **inside** the same student/consumer
app, sharing auth, sharing the `/dashboard`, and sharing `profiles`. Relevant existing code:

- `docs/SCHOOL_ERP_IMPLEMENTATION.md` — read this file fully before touching anything. It documents
  29 tenant tables, 65 RLS policies, and every existing school-erp route/action.
- `supabase/migrations/20260727100000_school_erp_core.sql` — the current school schema.
- `src/app/school-admin/*` — current school admin portal (principal-ish).
- `src/app/school/*` — current student/parent school portal.
- `src/app/college-admin/*`, `src/app/college/*`, `src/app/colleges/*` — the (separate, older) college tenancy system.
- `src/app/principal/[slug]/*` — a principal-facing public/portal route that already exists — **investigate
  what this currently does before assuming it needs to be built from scratch**.
- `src/middleware.ts` — route protection + role redirects. `PROTECTED_PREFIXES`, `SCHOOL_ADMIN_PREFIXES`,
  `COLLEGE_ADMIN_PREFIXES` are defined here.
- `src/app/(dashboard)/dashboard/page.tsx` — currently redirects `role === 'parent'` to `/parent`. This is
  the pattern to extend for principal/teacher/school-student role-based hard redirects.
- `src/app/api/institution-plan-inquiry/route.ts` and `src/lib/payments/*` — current institution pricing
  inquiry flow (Paddle/PayPro-based). This is NOT what the client wants long-term (see Part 5) but do not
  delete Paddle/PayPro support for the individual consumer app — only add the new manual-payment flow
  for institutions alongside it.
- `src/components/features/parent/ParentQrScanner`, `src/app/api/vision/scan/route.ts`, `src/app/api/ocr/route.ts`
  — existing vision/OCR scanning infrastructure. **Reuse this for the handwritten attendance register scanner
  in Part 4 — do not build a new OCR pipeline from scratch.**
- `messages/en.json`, `messages/ur.json`, `messages/hi.json`, `messages/roman-ur.json` — i18n. Any new
  user-facing string must be added to all four locale files.

**Do not run a full `npm run typecheck` across the whole repo in one shot — the existing docs note it
exceeds command time ceilings. Use the scoped configs (`tsconfig.school-erp.json` pattern) — create an
equivalent `tsconfig.college-erp.json` if needed — and typecheck only the files you touched per phase.**

**Work in small, verifiable phases (below). After each phase: run the scoped typecheck, run any existing
relevant vitest file, and summarize exactly what changed and what is still stubbed/TODO before moving on.
Do not silently skip a requirement — if something is out of scope for this session, write it explicitly
into `docs/SCHOOL_COLLEGE_SEPARATION_TODO.md` instead of pretending it's done.**

---

## 1. THE CORE ASK (in plain English)

The owner wants school and college turned into **two fully independent management systems**, no shared
"institution" abstraction bleeding between them anymore. Concretely:

1. Anything currently generic/shared between "school" and "college" gets split into two parallel,
   independent implementations — **separate auth resolution, separate dashboards, separate data scoping,
   separate everything** — even if that means duplicating some code. Do not try to unify them under one
   umbrella "institution" concept going forward; that's exactly what's being undone.
2. A full **school management system**: principal portal, teacher portal, student portal, and a **trimmed
   parent portal** — each fully separate UI/routes, not variations of one dashboard component. The parent
   portal is kept (see point 13 below) but stripped down to only the linked student's tracks/graphs — not
   a copy of the student app's full navbar.
3. A full **college management system**, same separation principle, built in parallel (mirroring the school
   system's shape, since colleges have a similar-but-distinct hierarchy — departments/semesters instead of
   classes/sections).
4. Role-locked login: once an email is registered **as** a principal/teacher/student **of** a specific
   school, that email always lands on that role's portal — never on the generic consumer `/dashboard`.
5. Attendance system (student + teacher) with a nice UI, plus a whole biometric hardware integration
   (ZKTeco) for teacher attendance (Part 6).
6. Young-kids games section, new and separate from the existing `/games`.
7. White-labeling: a student added by a school shows that school's logo + name ("X · Ilm AI") instead of
   the Ilm AI logo, on their dashboard.
8. Plan inheritance: whatever plan (PRO/ELITE) the principal selects for the institution automatically
   applies to every teacher and student under that institution — no separate per-user subscription needed.
9. A brand-new **manual/local payment checkout** (JazzCash, Easypaisa, bank transfer, card) replacing the
   plan-inquiry-only flow for institutions, with admin-controlled pricing/discounts (Part 5).
10. QR/photo-based **handwritten attendance register scanning** for teachers, with AI-assisted verification,
    new-student detection + principal approval workflow (Part 4).
11. Principal absence-alert workflow: student absent → alert on principal dashboard → click phone number →
    "WhatsApp or Call?" prompt → opens accordingly (Part 4).
12. Free full access for any **parent linked to an enrolled student** — no plan required for parents ever,
    regardless of school (Part 7), but the parent's navbar/portal is trimmed to just their linked student's
    performance tracks and graphs — remove every other page that currently exists in the parent nav that
    isn't specifically about the linked student's academic tracking.
13. Parent-linking QR auto-scan must be genuinely reliable (camera opens and decodes on its own without the
    user fumbling) or it gets removed entirely in favor of a manual "enter linking code" flow — see Part 7.1.
    This applies symmetrically: if QR goes, it goes from both the parent-side scan flow and the
    student/school-side "generate QR to link" flow, replaced by the manual code on both ends.
14. Principal-only, teacher-only navbar scoping: each portal's navigation must contain *only* pages relevant
    to that role (see Part 4.1 and 4.2 detail below) — not a shared/generic nav reused across roles.
15. Name-search must be added to every list/table view where a person needs to be found by name (student
    lists, teacher lists, attendance registers, fee records, etc.) — not just the one place it was
    originally scoped to.
16. Plan-expiry access control: when an institution's paid plan lapses, every member (teacher/student) under
    it loses paid-tier access immediately, but **no data is ever deleted** — attendance history, results,
    fee records, everything stays intact and instantly resumes the moment the institution's plan is renewed.
17. Principal-generated result cards: multiple selectable design templates (not just one fixed layout).
18. Principal-generated date-sheets (exam schedules): a guided, question-by-question flow where the system
    asks the principal exam-by-exam (date, subject, class, etc.) and assembles the date-sheet from those
    answers, rather than a freeform table the principal has to build unaided.

Everything below is broken into ordered, independently shippable phases. **Follow the order** — later
phases depend on earlier ones (e.g., role-routing depends on the split schema existing first).

---

## 2. PHASE 1 — AUDIT & SEPARATION PLAN (do this before writing any code)

1. Enumerate every file/table/route that currently treats "school" and "college" as variants of the same
   thing (shared components, shared types, shared `institution_type` columns, shared middleware prefixes,
   shared `SchoolActionForm`/`SchoolOrganizationSwitcher` used for both, etc). Produce a checklist in
   `docs/SCHOOL_COLLEGE_SEPARATION_TODO.md`.
2. Decide and document the new schema shape:
   - `school_organizations`, `school_campuses`, `school_academic_years`, `school_classes`, `school_sections`,
     `school_memberships` (principal/teacher/student/parent roles scoped to a school), plus all the existing
     school_* tables — keep these, this is the school side, already mostly correct per the ERP doc.
   - New parallel: `college_organizations`, `college_departments`, `college_semesters`,
     `college_memberships`, `college_admissions`, `college_attendance`, `college_exams`, `college_fees`,
     `college_timetables`, `college_announcements`, etc. — mirror the school_erp migration structure
     but rename every table/prefix to `college_*` and adapt hierarchy (department/semester instead of
     class/section, course/credit-hours instead of subject-offering where appropriate). Check whether
     `src/app/college-admin` / `src/app/college` already has a college schema in
     `database/migrations/*college*` or similar — **do not duplicate an existing college schema if one
     already covers this; extend it instead.**
   - `profiles` (or a new `school_profile_role` / `college_profile_role` resolution table) must let one
     Supabase auth user resolve to **at most one** hard role context: platform consumer, school member
     (with school_id + role), or college member (with college_id + role). Login-time resolution (Phase 3)
     depends on this being unambiguous.
3. Confirm with existing RLS patterns (`database/rls/001_rls_policies.sql`, the school_erp migration RLS)
   before designing college RLS — reuse the same tenant-isolation approach (composite tenant foreign keys,
   `organization_id`-scoped policies) for consistency and security review speed.

**Output of this phase:** `docs/SCHOOL_COLLEGE_SEPARATION_TODO.md` + a new migration file
`supabase/migrations/<timestamp>_college_erp_core.sql` (schema only, no data yet) + updated
`docs/SCHOOL_ERP_IMPLEMENTATION.md` split into two docs: `docs/SCHOOL_ERP_IMPLEMENTATION.md` and
`docs/COLLEGE_ERP_IMPLEMENTATION.md`.

---

## 3. PHASE 2 — ROLE-LOCKED LOGIN & ROUTING

**Requirement:** once an email is registered as a principal, teacher, or student of a specific school (or
college), that email **always** lands on that role's dedicated portal on login — never the generic
`/dashboard` — and never another school's/college's portal.

1. In the Supabase login/auth callback flow (`src/lib/supabase/*`, `src/app/(auth)/login/*`), after
   session is established, resolve role via the membership tables from Phase 1 (school_memberships /
   college_memberships), in that priority order:
   - `school_memberships` role = `principal` → redirect `/school-admin` (school-scoped, this principal's
     school only).
   - `school_memberships` role = `teacher` → redirect `/school/teacher` (new dedicated route, see Phase 4 —
     do not reuse the generic `/teacher` used by non-school tutoring teachers unless confirmed they're the
     same concept; check `src/app/(dashboard)/teacher` first to see if it's already school-agnostic and
     safe to reuse — if unsure, build the school-teacher portal as its own route).
   - `school_memberships` role = `student` → redirect `/school/student` dashboard (branded per Phase 7,
     built on top of existing `/school` portal — extend, don't duplicate, since `/school` already exists
     for this purpose per the ERP doc).
   - Same three for `college_memberships` → `/college-admin`, `/college/teacher`, `/college/student`
     respectively — separate route tree from school's.
   - No membership in either → normal consumer flow (existing `/dashboard`, `/onboarding`, etc. — untouched).
2. Update `src/middleware.ts`:
   - Add `SCHOOL_TEACHER_PREFIXES`, `SCHOOL_STUDENT_PREFIXES` (or reuse `/school` prefix with sub-role
     checks) and equivalent `COLLEGE_*` prefixes, each independently protected (own auth + own role check
     via a `resolveSchoolRole` / `resolveCollegeRole` helper — do not reuse a single generic
     `resolveInstitutionRole` given the "totally separate" requirement).
   - Ensure a school principal cannot access `/college-admin` and vice versa (403 or redirect to their own
     portal — pick redirect-to-own-portal for better UX, log a warning server-side on mismatched access
     attempts).
   - Ensure a parent (Phase 7) is never redirected into a paid-role portal — parents keep landing on
     `/parent` (existing behavior in `dashboard/page.tsx`) regardless of which school/college their linked
     child belongs to.
3. Write this as a single shared low-level helper (e.g. `resolveMembershipRedirect(user, supabase)`) that
   both school and college call with different table names, rather than fully copy-pasting SQL — code reuse
   is fine, but the **data and portals themselves stay separate** (that's the actual requirement — separate
   dashboards/data, not necessarily zero shared utility code).

---

## 4. PHASE 3 — SCHOOL MANAGEMENT SYSTEM (build first, full depth)

Build out (or finish, since much already exists per the ERP doc) these fully separate portals:

### 4.1 Principal portal (`/school-admin`)
- Extend existing `/school-admin/*` routes. Add if missing:
  - **Absence alert widget** on the main `/school-admin` dashboard: any student marked absent today shows
    as a card/row with student name, class, and a tappable phone number (guardian phone from
    `school_guardians`/enrollment record). Tapping first shows a small choice prompt:
    **"WhatsApp" or "Call"** (use `ask_user_input`-style in-app modal, not a native browser confirm).
    - "Call" → `tel:` link.
    - "WhatsApp" → `https://wa.me/<E.164 number>` link.
  - **New-student-detected notifications**: surfaced from the attendance-scan pipeline (4.2) — see below.
  - Plan/pricing controls per Part 5 live under `/school-admin/settings` or `/admin` (platform-level — see
    Part 5 for exactly which admin layer owns pricing configuration).
- Teacher management, class/section management (already exists — verify and only patch gaps).
- **Result card generation**: a `/school-admin/exams` (or a new `/school-admin/results/report-cards`)
  screen where the principal picks a **result-card design template** from a gallery of several selectable
  layouts (e.g. classic table, modern card, grade-focused, GPA-focused — build at least 3-4 distinct
  visual templates to start), then picks class/section/exam, and the system renders every student's card
  in that template, ready to export/print (check for an existing PDF-export utility in the codebase, e.g.
  the `pdf` skill or an existing print-report component referenced in `docs/SCHOOL_ERP_IMPLEMENTATION.md`
  ("printable reports", "print-to-PDF report cards") before building a new PDF renderer).
- **Date-sheet (exam schedule) builder**: a guided, step-by-step flow (reuse the app's existing stepper/
  wizard UI pattern if one exists, e.g. onboarding flow under `src/app/onboarding`) that asks the principal,
  one exam slot at a time: which class/section, which subject, which date, which time, which room/invigilator
  (if applicable) — "Add another exam?" until they're done — then compiles all answers into a structured
  date-sheet record and renders/exports it. Do not build this as a single freeform table the principal has
  to fill in unaided; the guided Q&A is the explicit requirement.
- **Principal navbar must be scoped to principal-relevant pages only**: attendance, fee-management/payments,
  people/staff-students, admissions, exams/results/date-sheets/report-cards, academics (timetable/homework),
  communication, reports, settings. Do NOT include any of the student-app's own pages (AI tutor, flashcards,
  practice, games, etc.) in the principal nav — audit `SchoolAdminSidebar.tsx` for anything that leaked in
  from the generic dashboard nav and remove it.

### 4.2 Teacher portal — attendance with photo/QR register scanning
New route, e.g. `/school-admin/attendance/scan` or a teacher-specific `/school/teacher/attendance`:
1. Teacher uploads/photographs the physical handwritten attendance register page (reuse
   `src/components/features/ocr/ServerPdfOcrUploader` and `src/app/api/vision/scan/route.ts` /
   `src/app/api/ocr/route.ts` — these already do handwriting-capable OCR per the codebase).
2. The vision pipeline extracts student names/roll numbers marked present/absent from the image and
   returns a structured table: student, status (present/absent), confidence.
3. Render this as an **editable table** for the teacher to review — present/absent toggle per row,
   pre-filled from AI extraction, with low-confidence rows visually flagged.
4. On teacher clicking "Confirm/Verify", write to `school_student_attendance` (existing table per the ERP
   migration) for every recognized, matched student.
5. **New-student detection**: if the OCR finds a name/roll number that does not match any enrolled student
   in that class/section, do NOT silently discard it. Show the teacher an inline prompt: *"New student
   detected: '<name>'. Add to your class?"* If teacher taps Yes:
   - Create a pending record (`school_admission_requests` or a new lightweight
     `school_pending_student_additions` table — check if an existing admissions/pending table fits before
     adding a new one) with status `pending_principal_approval`.
   - Send an in-app + push notification to the principal (reuse the existing notification delivery system —
     `src/app/api/cron/school-notifications` and the notification tables from the ERP migration).
   - Principal gets an approve/reject action on `/school-admin` (or `/school-admin/requests`, which already
     exists — check `SchoolJoinRequestList.tsx`, likely the right place to extend).
   - On approval: create the enrollment properly (organization_id, class_id, section_id) and the student
     becomes a normal enrolled member from then on.
6. This whole scan flow must be genuinely optional/parallel to manual entry — don't remove any existing
   manual attendance UI, just add the scanner as an additional fast-path.

**Teacher navbar/portal scope** — keep it strictly to what a teacher actually needs:
- **Create/manage tests** page (question setting, assigning to a class/section, due dates — check if
  `src/app/(dashboard)/teacher` or existing school-erp exam/marks entry components already cover this
  before building new).
- **Attendance** page (manual + the photo-scan flow above).
- **Student-info page**: a searchable roster of the teacher's students — every student's name, roll number,
  and **phone number saved and visible**, with a **name-search box** to filter/find a student instantly
  (see the name-search requirement below — this page is the canonical example of where it's needed).
- Do not include AI-tutor/flashcards/practice/games or any other consumer-app page in the teacher nav —
  same audit approach as the principal nav above, applied to whatever sidebar component teachers use.

**Name-search, applied everywhere it's needed** — not just the teacher's student-info page. Add a
consistent, reusable search-by-name input (debounced, case-insensitive, matches partial names) to every
list/table view across the school and college systems where a person needs to be found: principal's
people/staff list, admissions list, fee-defaulters list, attendance registers, parent-linking approval
list, etc. Build one shared `PersonSearchInput`/`useNameSearch` pattern and reuse it rather than
implementing ad hoc search per page.

### 4.3 Student portal (`/school`) — white-labeled + attendance + young-kids games
- **White-labeling**: wherever the app currently shows the "Ilm AI" logo on a school-enrolled student's
  dashboard/header, replace with: the school's uploaded logo (add a `logo_url` column to
  `school_organizations` if not present, with an upload UI in `/school-admin/settings`) + text
  `"<School Name> · Ilm AI"` next to it. Non-school-enrolled consumer users see the logo unchanged. Locate
  the shared header/logo component (likely under `src/components/layout` or similar) and make it accept
  an optional branding override resolved server-side from the user's school membership.
- **Attendance view**: student/parent-visible attendance history, present/absent calendar, matching the
  "pyara sa interface" (cute/friendly) request — check `frontend-design` skill for styling direction before
  building any new UI, and follow the app's existing dark/light theme tokens.
- **Young-kids games**: new, separate section — not the existing `/games`. Scope: only shown/available to
  students whose `grade_level` (or class level) is **class 5 and below** (≤ Grade 5). Route suggestion:
  `/school/kids-zone` or `/school/games`. Distinct visual style from the main app (brighter, larger touch
  targets, simpler navigation, mascot-driven if existing avatar system in `src/app/(dashboard)/avatar`
  fits). Build 3-5 simple educational games initially (e.g., letter/number matching, simple math, spelling)
  as a starting set — check `src/app/(dashboard)/games/[slug]` for the existing game architecture/pattern
  and reuse the rendering shell, but content and route stay separate as required.
- **Plan inheritance + expiry behavior**: any student/teacher enrolled under a school automatically gets
  that school's purchased plan tier (PRO/ELITE) applied to their account for as long as enrollment is
  active — implement as a resolution function (e.g. `resolveEffectivePlan(userId)`) that checks: (1) does
  this user have an active school/college membership with an org that has an active paid plan? If yes, that
  tier overrides their personal plan for AI-tool/quota gating purposes. If no, fall back to their individual
  subscription status as today. Do not literally copy a plan value onto every user row — resolve it live so
  a plan change/expiry by the principal instantly reflects for all members.
  - **On plan expiry**: every member's effective plan drops to free/no-access tier immediately (feature
    gating only) — **never delete or archive any of their data** (attendance history, test results, fee
    records, everything stays exactly as-is in the database, just inaccessible/read-limited per the free
    tier's normal rules).
  - **On renewal**: the moment the institution's plan is marked active again (via the manual-payment
    verification flow in Part 6, or an admin action), every member's effective plan resolves back to paid
    automatically, with zero data migration needed since nothing was ever removed — this is why the
    live-resolution approach above (not copying plan values) matters.

### 4.4 Parent portal (`/parent`) — trimmed, tracks-only
The existing `/parent` route/dashboard stays, but gets cleaned up per the owner's correction: **remove every
navbar page that isn't specifically about the linked student's academic tracking**, and replace that space
with the student's performance tracks/graphs.
- Audit the current `/parent` navigation (check `src/app/(dashboard)/parent` and whatever sidebar/nav
  component it uses) and strip out anything that duplicates the student app's own tools (AI tutor,
  flashcards, practice, games, library, etc.) — a parent should not see a shrunk copy of the student's app.
- What stays / gets built: a focused nav with just the linked student's **attendance history, test/exam
  results, performance graphs and trends over time, fee status, and report cards** — reuse existing graph
  components from `src/components/features/dashboard` / `src/app/(dashboard)/insights` (per the ERP doc's
  "performance graphs" note) rather than building new charting from scratch.
- Any parent linked+approved to a school-enrolled student (`parent_student_links`, status `approved`) gets
  **full, free** access to all of the above — no plan/subscription required at all, regardless of the
  parent's own individual plan status or the institution's plan status (a lapsed institutional plan affects
  teacher/student paid-feature access per 4.3's expiry rule, but a parent's read access to their own
  child's tracking data is never gated by any plan, ever). Audit current gating logic (`getUserPlan()`/quota
  checks) anywhere in the parent flow and remove any check that blocks this.

### 4.5 Parent-linking: QR auto-scan reliability, or manual code fallback
The existing `ParentQrScanner` (`src/components/features/parent/ParentQrScanner`) auto-opens the camera to
scan a linking QR code, but this currently does not work reliably.
1. **First, attempt a real fix**: investigate why the camera auto-open/auto-detect is failing (check
   browser permissions handling, whether it's using a maintained QR-decoding library — e.g. compare against
   well-supported options like `html5-qrcode`, `qr-scanner`, or the browser's native
   `BarcodeDetector` API with a polyfill fallback — versus whatever is currently wired up). Fix the
   underlying scan reliability if a clear, tractable bug is found (wrong camera constraints, missing
   `playsinline`/autoplay handling on mobile Safari, torn-down video stream, etc.).
2. **If a genuinely reliable (effectively 100%, auto-detecting without the user fumbling) fix is not
   achievable** within this session's investigation, do not ship a half-working camera scanner. Instead:
   - Remove the auto-camera QR scanning UI entirely from the parent-linking flow.
   - Replace it with a simple **"Enter linking code"** manual text-input flow: the student/school side
     generates a short alphanumeric code (instead of/in addition to rendering a QR image) that the parent
     types in to link. Reuse whatever backend linking logic already exists (`parent_student_links` creation)
     — only the input method changes, not the underlying approval/linking data model.
   - Apply this symmetrically: if QR is removed, remove it from **both** ends — the parent's scan-to-link
     screen AND the student/school-side "show my QR code to link a parent" screen — replaced by the same
     manual code on both sides, so there's no dangling half-QR, half-code experience.
3. Document which path was taken (fixed vs. replaced) in `docs/SCHOOL_COLLEGE_SEPARATION_TODO.md`.

---

## 5. COLLEGE MANAGEMENT SYSTEM

Build the same shape as Phase 3, under the separate `/college-admin`, `/college` (student/parent), and a
new `/college/teacher` (or reuse existing college-admin lecturer flows if `college-admin` already covers
faculty — check `src/app/college-admin/*` first). Adjust hierarchy terms: departments/semesters/courses
instead of classes/sections/subjects. Attendance scanning (4.2 pattern), white-labeling (4.3 pattern),
plan inheritance (4.3 pattern), and absence alerts (4.1 pattern) all apply equally to college — reuse the
*shape* of the school implementation but keep college's own tables, own routes, own components, per the
"totally separate" requirement in Part 1.

---

## 6. PRICING & MANUAL PAYMENT SYSTEM

### 6.1 Admin-controlled pricing
New (or extended) super-admin screen, likely under `/admin` (check existing `src/app/(admin)/admin/schools`
and `src/app/api/platform-settings` — this is probably the right place to extend rather than build fresh):
- Admin sets **base USD/PKR price** for institution PRO and institution ELITE plans — monthly only, as the
  source of truth.
- Admin sets a **single discount percentage** for annual billing (e.g. "15% off if paid yearly") — the
  actual annual $ price is then computed automatically (`monthly * 12 * (1 - discount%)`), never entered
  manually.
- Same pattern for **per-student/per-institution volume discount**: admin enters a discount % (e.g. by
  student-count tier, or a flat institution discount %), and the final $ amount charged is computed, never
  hand-entered.
- Store these in the existing `platform_settings` mechanism (`src/lib/platform-settings/server.ts`) if it
  already supports structured JSON config — extend its schema rather than building a new settings table.
- These computed prices are what the school/college checkout page (6.2) reads and displays per selected
  plan/class/student-count — do not hardcode prices anywhere in the checkout UI.

### 6.2 Checkout: manual payment methods
Build a new checkout flow for institution plan purchase AND for parent/student fee payment (see 6.3),
**separate from the existing Paddle/PayPro consumer checkout** (`src/app/checkout`) — do not touch that
flow, individual consumer subscriptions keep working exactly as today.
- On checkout, present method options: **JazzCash, Easypaisa, Bank Transfer, Card**.
- Card option shows an "Auto-renewal" toggle/label next to it (informational — actual auto-charging via
  card still requires a real payment gateway integration; if none is connected, implement this as
  "requested" state requiring the same manual verification below, and clearly log/flag it as a TODO in
  `docs/SCHOOL_COLLEGE_SEPARATION_TODO.md` if a real recurring-card processor isn't already configured in
  this repo — check `src/lib/payments/paddle.ts` / `paypro.ts` for whether either already supports
  recurring card charges suitable for reuse here before building a new one).
- For each selected method, display the **phone number placeholder** (owner will supply exact numbers —
  add these as environment variables, e.g. `SCHOOL_PAYMENT_JAZZCASH_NUMBER`, `SCHOOL_PAYMENT_EASYPAISA_NUMBER`,
  `SCHOOL_PAYMENT_BANK_DETAILS`, sourced from `.env` — do not hardcode literal numbers in source) plus a
  **QR code** (generate via an existing/lightweight QR library — check `package.json` for one already
  installed, e.g. something already used by `ParentQrScanner`'s counterpart QR generator, before adding a
  new dependency).
- Below the QR/number, embed a WhatsApp deep link using the number `03480049900` formatted to E.164
  (`+92 348 0049900`) as `https://wa.me/923480049900`, with pre-filled text if useful (e.g. "Hi, I want to
  confirm my institution plan payment"). Store this number as an env var too
  (`SCHOOL_PAYMENT_WHATSAPP_NUMBER`), not hardcoded, so it's easy to change later.
- Below that: instructional text **"Send the screenshot of the transaction with your email"** (localize
  into `messages/*.json`).
- On submission, create a `school_payment_verifications` (or `institution_payment_verifications`, shared
  by both school and college — this is backend-only plumbing, not user-facing "separation", so a shared
  table is fine here) row: institution_id, plan, billing_cycle, amount, method, status = `pending_review`,
  submitted_at, contact_email. This is what the admin later confirms manually (no automatic reconciliation
  since there's no real payment webhook for cash-style methods) to activate the plan — build a simple
  `/admin` review queue to mark a submission `verified` → this then activates/extends the institution's
  plan (feeding Phase 4.3's plan inheritance).

### 6.3 Student/parent fee payment page
On the existing fee payment page (`/school-admin/fees` is admin-side; find or build the
student/parent-facing fee payment page under `/school`) show:
- The fee amount pulled from that student's **school's selected plan + selected class fee structure**
  (existing `school_fee_structures` table per the ERP doc — verify and wire up if not already reading live
  values).
- The same JazzCash/Easypaisa/Bank/Card + QR + WhatsApp-number + "send screenshot with your email"
  instructions from 6.2, reusing the same checkout component rather than duplicating markup.

---

## 7. PARENT PORTAL — FULL SPEC (trimmed nav, free access, linking method)

This consolidates the parent-related requirements referenced above into one place to implement against:

1. **Trimmed navbar** — see 4.4. Only linked-student tracking pages remain; every student-app tool page is
   removed from the parent nav.
2. **Free access, always** — see 4.4. No plan required for a parent, ever, regardless of the student's
   school's plan status.
3. **Linking method** — see 4.5. Fix the QR auto-scan properly, or replace with manual code entry on both
   sides if a reliable fix isn't achievable this session. Do not leave a flaky QR scanner shipped as-is.

---

## 8. ZKTECO BIOMETRIC TEACHER ATTENDANCE (hardware integration)

Implement per the owner's stated architecture — do not deviate into a paid third-party SaaS:

1. **Library**: use `node-zklib` (or `rats/zkteco` if `node-zklib` proves unmaintained/incompatible —
   check npm registry availability first) to talk to the ZKTeco K40/K50 device over its network SDK.
2. **No fingerprint images stored** — only the device's own numeric templates/punch logs
   (`User_ID`, `Timestamp`) are read; nothing biometric is stored in this app's database beyond that
   `User_ID`↔`teacher_id` mapping.
3. **New table**: `school_teacher_biometric_devices` (device IP, port, comm_key, school_id, campus_id,
   last_synced_at) and `school_teacher_biometric_mappings` (device `User_ID` ↔ internal teacher/staff id).
   Add corresponding RLS scoped to school-admin roles only.
4. **Sync job**: a cron/background job (mirror the existing `src/app/api/cron/school-notifications` pattern
   — same `CRON_SECRET` auth convention) that runs every ~2 minutes, connects to each registered device's
   IP, pulls new punch logs since `last_synced_at`, matches `User_ID` to a teacher via the mapping table,
   and writes/updates that teacher's row in `school_staff_attendance` (existing table per the ERP doc) as
   Present for that day, with the punch timestamp. Idempotent — re-running must not create duplicate
   attendance rows (upsert on `teacher_id + date`).
5. Since ZKTeco devices are LAN-local hardware and this app likely runs on a cloud server, the cron job
   needs network reachability to the device's local IP — implement this to run from wherever the deployment
   actually has LAN access (this may require a small always-on local bridge/agent process on school
   premises rather than the public cloud server directly, if the device isn't port-forwarded/publicly
   reachable — **flag this deployment constraint clearly in the docs rather than silently assuming public
   reachability**, since it materially affects whether the "cloud server pings the device IP" plan works
   as-is).
6. Admin UI: `/school-admin/attendance` (existing page, extend it) gets a "Biometric Devices" tab to
   register a device (IP/port), map device User_IDs to teachers, and see last-sync status/health.
7. This is additive to, not a replacement for, the photo-scan attendance system in Part 4.2, which was
   scoped to *student* attendance from handwritten registers — biometric is specifically for *teacher*
   attendance per the owner's message.

---

## 9. EXECUTION ORDER (do not reorder)

1. Phase 1 (audit + schema plan + docs) — must ship first, everything else depends on the schema being decided.
2. Phase 2 (role-locked routing) — needs Phase 1's membership tables to exist (even if empty/migrated but
   not yet fully populated by UI).
3. Phase 3 (school system full build: principal/teacher/student portals, nav scoping, name-search, result
   cards, date-sheets, plan-expiry behavior) — the deepest, most-requested part; do this thoroughly before
   starting college.
4. Parent portal trim + QR fix-or-replace (Section 7 / 4.4 / 4.5) — do this right after Phase 3 while the
   student-tracking components you just built are fresh, since the parent portal reuses them directly.
5. College system (Section 5) — mirror Phase 3 + step 4's shape once school is solid and patterns are proven.
6. Pricing/manual payment (Section 6) — can be built in parallel with 3/4/5 once Phase 1's schema is settled,
   since it's mostly independent plumbing (env vars, admin settings, a checkout component).
7. ZKTeco biometric integration (Section 8) — last, since it's the most infrastructure-heavy/hardware-
   dependent piece and least likely to block anything else.

At the end of each numbered phase, stop, summarize what was actually built vs. stubbed, list every new env
var that needs a real value from the owner (payment numbers, ZKTeco device IPs, etc.), and wait for
confirmation before continuing to the next phase.
