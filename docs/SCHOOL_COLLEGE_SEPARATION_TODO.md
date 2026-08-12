# School ↔ College Separation — Audit & Plan (Phase 1 + Phase 2)

Status: **Phase 1 (audit + schema plan) complete. Phase 2 (role-locked login & routing) complete.**
Nothing below has shipped to production (no migration applied to a live database, nothing committed) —
this is the checklist and decisions record the rest of `CLAUDE_CODE_MASTER_PROMPT.md`'s phases build
against. Update this file's checkboxes as later phases land; do not delete completed context, since
Phase 9 needs the full trail.

## Owner clarifications (2026-08-12)

Two corrections from the owner, recorded here so later phases don't miss them:

1. **"School" in the master prompt means school + college together, not school only.** Every place the
   master prompt says "school" as a general/collective term (role-locking, plan inheritance, attendance,
   white-labeling, etc.) applies equally to college — this was already the intended parallel-systems design
   (Parts 3 and 5 mirror each other), but is now explicit: don't read "school" narrowly when a requirement
   is clearly generic to "an institution the platform serves," even though the two stay data/route-separate
   per Part 1.
2. **New requirement — cross-institution principal-to-principal messaging with campus selection**: a
   principal must be able to search for *any other* school's or college's principal by institution name,
   pick a specific campus if that institution has more than one, and send them a direct message through the
   in-app chat/communication system (not email/WhatsApp — the existing in-app messaging surface). This is
   additive to Part 4.1's Communication scope and explicitly cross-tenant (unlike the existing
   `school_contact_messages`/`college_contact_messages` tables, which are intra-organization only — sender
   and recipient share one `organization_id`). **Not built in Phase 2** — no existing generic
   chat/conversation infrastructure was found in the codebase to extend (confirmed via migration search),
   so this needs its own schema (a cross-org message table with no single-table FK target, since the
   sender/recipient's organization can be either a `school_organizations` or `college_organizations` row —
   validated at the RLS/app layer instead of via a plain FK) and a directory-search API. Queued for
   **Phase 3/4.1** (Communication) rather than bolted on mid-routing-phase, per the master prompt's own
   "write it into this doc instead of pretending it's done" instruction. Design sketch for Phase 3 to pick
   up: `institution_directory_messages(sender_institution_type, sender_organization_id, sender_campus_id,
   sender_profile_id, recipient_institution_type, recipient_organization_id, recipient_campus_id,
   recipient_profile_id, subject, body, status, created_at, read_at)`, with a security-definer
   `is_institution_principal(institution_type, organization_id, profile_id)` helper (wrapping
   `school_has_role`/`college_has_role`) so RLS can validate an arbitrary target profile is actually that
   institution's owner/admin before a message is allowed to reach them, plus a directory search endpoint
   over `school_organizations`/`college_organizations` (+ their campuses) filtered by name.

---

## 1. What's already separate (no action needed)

- `school_*` (29 tables, `20260727100000_school_erp_core.sql`) vs the legacy `college_*` portal tables
  (`colleges`, `college_admins`, `college_departments`, `college_lectures`, etc. across
  `20260710121300_college_portal_base_and_expansion.sql` + `20260711130000_college_portal.sql`) —
  no shared base "institutions" table; tenant data already lives in separate tables.
- `src/lib/school-erp/*` vs `src/lib/college/*` — independent access/queries/actions/types, no shared
  `resolveInstitutionRole()` helper.
- `src/components/features/school-erp/*` — confirmed zero imports from any `/college-admin`/`/colleges`
  route.
- `src/app/school-admin/*` vs `src/app/college-admin/*`, `src/app/school/*` vs `src/app/college/*` vs
  `src/app/colleges/*` — confirmed **zero cross-tree imports** either direction (grepped both ways).
- `src/middleware.ts` — `SCHOOL_ADMIN_PREFIXES` / `COLLEGE_ADMIN_PREFIXES` are already separate
  constants with separate `if` blocks (no shared "institution admin" branch).
- `src/app/principal/[slug]/route.ts` — school-only convenience redirect (looks up
  `school_principal_links`/`school_organizations`, sets `ACTIVE_SCHOOL_COOKIE`, redirects to
  `/school-admin`). No college equivalent exists; nothing to split here.

## 2. Genuinely shared "institution" conflation — needs splitting

Ordered roughly by how much it blocks later phases.

- [ ] **`src/components/features/auth/RegisterForm/index.tsx`** — the institutional-signup step
  (`SCHOOL_SEARCH_STEP`) is hard-wired to the school-only pipeline (`/api/schools/search` →
  `school_organizations`, `school_join_requests` via `src/lib/school-erp/join-requests.ts`) regardless
  of whether the user picked "college" as their `EducationLevel`. There is no college-search/join-request
  step. **Decision needed from owner/product**: build a parallel college self-serve join flow against the
  new `college_memberships`/`college_organizations` (Phase 2/3), or explicitly gate institutional signup
  to schools only for now and say so in the UI copy. Do not silently route college signups through school
  tables.
- [ ] **Legacy "sponsored institution" concept** — `profiles.sponsored_institution_name` /
  `sponsored_institution_type` (`'school'|'college'`), consumed by `InstitutionUsageTable`,
  `UserManagementTable`, `api/admin/institution-usage`. This is an admin-assigned bulk-plan label, distinct
  from real tenant membership. Out of scope to unwind in Phase 1–3 (it's an orthogonal legacy sponsor
  concept, not the school/college split itself) — flagged here so it isn't confused with the new
  `school_memberships`/`college_memberships` plan-inheritance model in Part 4.3/5 of the master prompt.
  Revisit after the new plan-inheritance resolver (`resolveEffectivePlan`) ships, since it may make this
  legacy column redundant.
- [ ] **Legacy "academic institution" concept** — `profiles.academic_institution_name` /
  `academic_institution_type` (`'school'|'college'|'university'`) — a **second, differently-named**
  generic field (self-reported study level, not a sponsor). Same note as above: not part of the
  school/college ERP split, don't conflate the two `profiles` columns during later phases.
- [ ] **`public.institution_plan_inquiries`** (+ `api/institution-plan-inquiry/route.ts`, its
  `InstitutionUsageTable`/`InstitutionInquiryTable` UI) — single shared lead-capture table/route for both
  school and college enterprise inquiries, with a hardcoded 50% institutional discount baked into the route
  instead of reading `platform_settings`. Part 6.1 of the master prompt replaces the *pricing* half of this
  (admin-controlled base price + discount %, computed not hand-entered) — extend `PlatformSettings`
  (`src/lib/platform-settings/shared.ts`) with an `institutionPricing` block rather than building a new
  config table (see §5 below). Keep the inquiry table shared (backend-only plumbing, not user-facing
  separation) per the master prompt's explicit allowance in Part 6.2.
- [ ] **`public.institution_plan_tiers`** (`20260806110000_institution_limits_payroll_resources.sql`) —
  seeds both `school_*` and `college_*` tier rows, but only `school_organization_plan_settings` /
  `/admin/schools` actually reads it — the college rows are **dead/unused**. When Phase 5 (college system)
  wires up plan tiers for `college_organizations`, either activate these seeded rows against the new
  `college_organizations` table or replace them; don't leave two dead seed rows lying around.
- [ ] **`school_organizations.organization_type` allows `'college'`** — the clearest literal "college
  treated as a school variant" schema smell: `check (organization_type in ('school','academy','college'))`,
  and `/admin/schools`'s create-org `<select>` offers a "College" option that would create a *school_organizations*
  row for a college. **Decision needed**: once `/admin/colleges` (or equivalent, Phase 5) exists to
  provision `college_organizations` rows, remove `'college'` from `school_organizations.organization_type`'s
  check constraint and from the `/admin/schools` create-org dropdown, so a college can no longer
  accidentally be provisioned as a school tenant. Tracked as a follow-up migration, not done in Phase 1
  since `school_organizations` already has (or may have) real rows using it.
- [ ] **Five duplicated local `type InstitutionType = 'school' | 'college'` unions** —
  `UserManagementTable`, `SubscriptionPlans`, `PricingSection`, `api/institution-plan-inquiry/route.ts`
  (plus the `institution_plan_inquiries`/`institution_plan_tiers` CHECK constraints). Low-risk, cosmetic —
  fine to leave duplicated since the master prompt doesn't require unifying the enterprise-inquiry UI; just
  don't add a *sixth* copy when touching this code later.
- [ ] **`SubscriptionPlans`/`PricingSection`** enterprise-inquiry UI is intentionally shared per master
  prompt Part 6.2 ("backend-only plumbing... shared table is fine") — no action needed beyond wiring the
  new admin-controlled pricing into it (§6.1).

## 3. School ERP schema/RLS pattern (reference for everything college builds on)

`supabase/migrations/20260727100000_school_erp_core.sql` (29 tables) uses:

- `organization_id` as the primary tenant-scoping column on almost every table, `campus_id` for
  campus-scoped tables, plus composite `(id, organization_id)` unique indexes + composite FKs so a child
  row can never point cross-tenant (independent of RLS).
- `school_memberships` as the single role-resolution table: one row = one `profile_id` + one
  `member_role` (`owner|admin|admissions|teacher|staff|accountant|parent|student`) in one organization
  (+ optional `campus_id`). **Not currently unique-constrained to one active role per profile** — see §4.
- Security-definer RLS helpers: `school_is_platform_admin()`, `school_has_role(org, roles[])`,
  `school_is_member(org)`, `school_can_view_student(org, student_id)`,
  `school_teacher_can_manage_section/student(...)`.
- Broad org-wide tables → `select using (school_is_member(org))`, mutate via
  `school_has_role(org, ['owner','admin'])`. Relationship-scoped tables (attendance, marks, invoices) →
  `school_can_view_student(...)` (self, guardian link, assigned teacher, or admin).
- Owner-only mutation guard on `school_memberships` itself to prevent privilege escalation (admins can only
  touch non-owner rows).

**This pattern is now mirrored for college** — see §4.

## 4. College schema — decision + what shipped in Phase 1

The pre-existing "college portal" (`colleges`, `college_admins`, `college_departments`,
`college_lectures`, `college_resources`, `college_faculty`, `college_notices`, `college_discussions`,
`college_discussion_replies`, `college_placements`, `college_events`, `college_timetable_entries`,
`college_join_requests`) is **shallow and not a mirror of the school ERP**: single flat tenant (no
campuses/multi-org), free-text `semester`/`course_name` fields instead of real tables, no
`college_memberships`/attendance/exams/fees/academic-years at all. It also has a confirmed **schema-drift
bug**: `20260710121300_college_portal_base_and_expansion.sql` creates `college_admins` with a `user_id`
column; `20260711130000_college_portal.sql` re-declares the same table (a no-op since it already exists)
but the app code in `src/lib/college/access.ts` queries `college_admins.profile_id`, which does not exist
on the table that actually got created. **Flagging, not fixing in Phase 1** — this is existing-code
breakage independent of the ERP split; worth its own bug ticket.

**Decision**: per the master prompt ("mirror the school_erp migration structure... check whether a college
schema already exists; do not duplicate if one already covers this — extend it instead"), the existing
`colleges`/`college_admins`/etc. tables do **not** cover the target design (no membership model, no
academic hierarchy beyond a flat department, no attendance/exam/fee tenant scoping) — so a genuinely new,
parallel tenant schema was added rather than bolted onto the old one, using table names that don't collide
with the legacy portal tables (e.g. `college_academic_departments` not `college_departments`,
`college_timetable_slots` not `college_timetable_entries`, `college_calendar_events` not `college_events`).
The old lightweight portal tables are left untouched and working for now.

- [ ] **Follow-up decision needed from owner**: once the new `college_organizations`-rooted schema is
  wired into `/college-admin`/`/college` (Phase 5), decide whether to (a) migrate/retire the old
  `colleges`/`college_admins`/`college_lectures`/etc. tables into the new schema, or (b) keep them running
  in parallel for existing users while new tenants are provisioned on the new schema. Not decided in
  Phase 1 — flagging so Phase 5 doesn't have to rediscover this.

**Shipped**: `supabase/migrations/20260812090000_college_erp_core.sql` — schema only, no data, mirrors
`20260727100000_school_erp_core.sql`'s structure/RLS pattern table-for-table, with hierarchy adapted per
the master prompt ("departments/semesters instead of classes/sections, course/credit-hours instead of
subject-offering"):

| School concept | College concept | Notes |
|---|---|---|
| `school_organizations` | `college_organizations` | `organization_type` check is `college\|university\|institute` (not `school\|academy\|college` — closes the smell in §2) |
| `school_campuses` | `college_campuses` | same shape |
| — (none) | `college_academic_departments` **(new layer)** | school has no department concept; college needs org→campus→**department**→semester |
| `school_memberships` | `college_memberships` | same roles, same `unique(org, profile, role)` |
| `school_academic_years` | `college_academic_years` | same shape |
| `school_classes` | `college_semesters` | `grade_level` → `semester_number`; scoped to `department_id` + `academic_year_id` instead of just `campus_id` + `academic_year_id` |
| `school_sections` | `college_sections` | `class_id`→`semester_id`, `homeroom_teacher_id`→`advisor_id`, default capacity 40→60 |
| `school_subject_offerings` | `college_course_offerings` | `subject_name`→`course_name` (+ `course_code`), `weekly_periods`→`credit_hours numeric(4,1)` |
| `school_enrollments` | `college_enrollments` | `admission_number`→`registration_number` |
| `school_guardians` | `college_guardians` | identical (colleges keep guardian/parent linking per master prompt §1.12) |
| `school_admissions` | `college_admissions` | `applying_for_class`→`applying_for_program` |
| everything else (documents, attendance, staff attendance, leave, exams, exam schedules/marks, report cards, fee structures/invoices/payments, timetable, homework→**assignments**, lesson plans, calendar events, announcements, notification deliveries, audit logs, contact messages) | `college_*` equivalents | 1:1 mirror, tenant-scoped the same way |

Also mirrored: all 11 security-definer functions (`college_is_platform_admin`, `college_has_role`,
`college_is_member`, `college_can_view_student`, `college_teacher_can_manage_section/student`,
`college_update_organization_profile`, the 4 notification/reconciliation trigger functions), all 30
RLS-enabled tables with role/relationship-scoped policies, composite tenant FKs, tenant-first indexes, and
a private `college-admissions` storage bucket (mirrors `school-admissions`).

**Not yet done** (explicitly deferred past Phase 1, schema-only scope):
- [ ] No data/backfill — table is empty until Phase 5 UI writes to it.
- [ ] `src/lib/college-erp/*` (access layer, actions, queries, types) mirroring `src/lib/school-erp/*` —
  Phase 5.
- [ ] `tsconfig.college-erp.json` scoped typecheck config — create when Phase 5 adds
  `src/lib/college-erp`/`src/components/features/college-erp` source files to scope it against; no
  college-ERP application code exists yet to typecheck.
- [ ] Regenerate Supabase TypeScript types (`database.types.ts`) after this migration is actually applied
  to a real database — not run in Phase 1 since the migration hasn't been pushed anywhere yet.

## 5. Login / role resolution — what exists vs. what Phase 2 must build

- `getSchoolContext()` (`src/lib/school-erp/access.ts`) already resolves `school_memberships` → picks the
  highest-priority active role (`owner > admin > admissions > accountant > teacher > staff > parent >
  student`) and is wired into `/api/auth/post-login-destination` → `LoginForm.finishLogin()`.
- **It does not strictly enforce "at most one role"** — it tolerates multiple active memberships per
  profile and silently picks the best one, rather than the master prompt's stated requirement (§1 point 4,
  §2 point 2) that one auth user resolve to *at most one* hard role context. No unique constraint prevents
  a profile from having two `school_memberships` rows in different roles today. **Phase 2 decision needed**:
  either add a partial-unique constraint (one active membership per profile across the whole table, not
  just per org+role) and reject ambiguous signups, or explicitly keep the "pick highest priority" fallback
  and update the master prompt's requirement wording to match reality. Flagging, not deciding, in Phase 1.
- **College has no login-time resolution at all.** Nothing in `post-login-destination/route.ts` or
  `LoginForm` checks `college_memberships` (which didn't exist until this phase) or the old
  `college_admins`/`profiles.college_id`. College users today fall through to the generic `/dashboard`.
  Phase 2 must add `getCollegeContext()` (mirroring `getSchoolContext()`, reading the new
  `college_memberships` table) and extend `post-login-destination` with the priority order the master
  prompt specifies: `school_memberships → college_memberships → consumer fallback`.
- `src/app/(dashboard)/dashboard/page.tsx` only knows about `profile.role === 'parent'` and
  `profile.education_level === 'university'` — no membership-table awareness at all. This is downstream of
  `post-login-destination`, so it only matters as a fallback path (Phase 2 shouldn't need to touch it
  directly, but should verify a school/college member never reaches it unresolved).

## 6. Attendance / OCR reuse (Part 4.2)

- `src/app/api/ocr/route.ts` is the right reuse base for handwritten attendance-register scanning — it's
  already a generic upload→OCR(handwritten mode, Gemini-backed)→return-text endpoint with no unrelated DB
  writes. **Gap**: neither this route nor `vision/scan/route.ts` does structured extraction (name + roll
  number + present/absent as JSON) — Phase 4 needs a new route/wrapper that runs `performOcr()` then a
  follow-up LLM call converting the OCR text into a structured attendance table, similar to `vision/scan`'s
  second Gemini call pattern. Not building this in Phase 1 (Phase 4 scope).

## 7. QR scanner reliability (Part 4.5 / 7.3)

`ParentQrScanner` uses `@zxing/browser`/`@zxing/library` (not native `BarcodeDetector`, not
`html5-qrcode`/`qr-scanner`/`jsQR`) with server-side decode verification via `src/lib/parent/qr-server.ts`.
Concrete reliability gaps found (detailed investigation, no fix attempted yet — that's Phase 4/7 scope):
- No `navigator.permissions.query({name:'camera'})` pre-check — a previously-denied user gets a generic
  retry loop with no way to distinguish "denied forever" from "not yet asked."
- `decodeFromConstraints` requests 1920×1080 "ideal" with no ROI cropping/downscale before decode — slow on
  low-end devices despite the cosmetic scan-box overlay (the whole frame is decoded, not just the box).
- A late-callback race: `controlsRef.current` can be repopulated by a stray decode callback after teardown
  (`active` became false but the callback fires anyway), risking a leaked camera stream.
- Purely CPU-bound JS decode — no `BarcodeDetector` hardware-acceleration fast path for supporting browsers.

**Recommendation carried into Phase 4**: attempt the real fix first (permissions pre-check,
`BarcodeDetector` feature-detect fast path, guard the teardown race) before falling back to the
manual-code replacement the master prompt allows. Base is solid enough (server-verified, not just
client-trust) that a rebuild-from-scratch is not warranted.

QR generation counterpart: `ParentDashboardClient/index.tsx`'s `InviteBox`, using `react-qr-code` (already
installed, no new dependency needed — also the pick for Part 6.2's payment-checkout QR codes).

## 8. Payments / pricing infra (Part 6)

- `src/lib/payments/paddle.ts` supports full subscription lifecycle (`getSubscription`,
  `cancelSubscription`, webhook-driven renewal) — the stronger fit for the Part 6.2 "Card + Auto-renewal"
  checkout option if a real recurring-card processor is needed.
- `src/lib/payments/paypro.ts` is checkout-redirect-only; `cancelSubscription()`/`getSubscription()` are
  both stubbed to fail — **cannot** currently confirm/manage auto-renewal from within the app. Flagged per
  the master prompt's explicit ask (§6.2) to call this out as a TODO if no real recurring-card processor is
  wired up.
- `src/lib/platform-settings/server.ts` + `shared.ts` already has a rich typed `PlatformSettings` JSON
  config (per-tier `price: {USD,PKR}{monthly,annual}`, `limits`, `access`, `exchangeRate`) — **reuse this
  directly** for Part 6.1's admin-controlled institution pricing (add an `institutionPricing` block) rather
  than building a new settings table.
- `react-qr-code` is already installed and is the pick for Part 6.2's payment-method QR codes (client-side
  SVG, no new dependency). A server-side QR generator (`qrcode` npm package) would only be needed if a PDF
  export or email embed of the QR is required later.

## 9. Parent portal trim (Part 4.4 / 7.1)

Parent-specific pages today are minimal: `src/app/(dashboard)/parent/page.tsx` (main dashboard) and
`src/app/(dashboard)/parent/analytics/page.tsx` (nested, not in the sidebar directly). The sidebar
(`src/components/layout/DashboardSidebar/index.tsx`) already renders exactly one parent-specific nav
section ("My Children" → `/parent`). **The actual trim work is auditing whether parent-role users also see
the shared `NAV_GROUPS` block** (rendered below the parent-specific section for all roles) — that's where
student-app tool pages (AI tutor, flashcards, practice, games, etc.) could be leaking into the parent nav
without role-gating. Not confirmed either way in Phase 1 — Phase 4/7 must grep `NAV_GROUPS`'s definition
and role-gating logic directly.

## 10. Execution order reminder

Per master prompt §9: Phase 2 (role-locked routing) is next, and depends on `college_memberships`
existing — it now does (empty, schema-only, from this phase). Phase 2 should build `getCollegeContext()` +
extend `post-login-destination`, decide the "at most one role" enforcement question from §5 above, and
extend `src/middleware.ts` with `resolveCollegeRole`/`resolveSchoolRole` helpers per the master prompt's
explicit "no single generic `resolveInstitutionRole`" instruction.

---

**Phase 1 touched no runtime code, no RLS on existing tables, and nothing was applied to any live
database.** The only new artifacts were this document, `COLLEGE_ERP_IMPLEMENTATION.md`, and the
schema-only migration file.

## 11. Phase 2 — role-locked login & routing (complete)

What shipped (all new/changed files, nothing committed):

- **`src/lib/college-erp/types.ts`** + **`src/lib/college-erp/access.ts`** (new) — a college-side mirror
  of `src/lib/school-erp/{types,access}.ts`: `CollegeRole`/`CollegePermission`/`CollegeContext` types,
  `getCollegeContext()` (reads `college_memberships`, same highest-priority-role-wins resolution as
  school's `getSchoolContext()`), `getCollegeContexts()`, `requireCollegeContext()`,
  `collegeAdminHomeForRole()`, and `ACTIVE_COLLEGE_COOKIE`. Deliberately **not** sharing implementation
  with `school-erp/access.ts` beyond the one shared low-level helper below — per the master prompt's "code
  reuse is fine, but the data and portals themselves stay separate" instruction. One known gap: college has
  no module/plan-tier gating table yet (see `COLLEGE_ERP_IMPLEMENTATION.md` §4), so `enabledModules` is
  hardcoded `null` ("everything on") — fine for now since no college-ERP UI reads it yet.
- **`src/lib/auth/resolveMembershipRedirect.ts`** (new) — the single shared low-level helper the master
  prompt asked for (§3 point 3): tries `getSchoolContext()` first, then `getCollegeContext()`, then falls
  back to `/dashboard`. This is the *only* piece of logic school and college share for routing — everything
  else (the two access.ts files, the two middleware blocks) stays independent.
- **`src/app/api/auth/post-login-destination/route.ts`** (changed) — now calls
  `resolveMembershipRedirect()` instead of only checking school. A college owner/admin now lands on
  `/college-admin`, a college teacher/staff/admissions/accountant also on `/college-admin` (role-detail
  gating is a page-level concern, same as school), and a college student/parent lands on
  `/college/dashboard` (see below for why not `/college`).
- **`src/middleware.ts`** (changed) — added `resolveSchoolRole`/`resolveCollegeRole` (new lightweight
  exports on each access.ts, distinct named helpers per the master prompt's explicit "not a single generic
  `resolveInstitutionRole`" instruction) and used them in both the `SCHOOL_ADMIN_PREFIXES` and
  `COLLEGE_ADMIN_PREFIXES` blocks:
  - A school member with role `student`/`parent` hitting `/school-admin/*` is redirected to their own
    portal (`/school`) instead of being let through to the page component.
  - A **college** member (any role) hitting `/school-admin/*` is redirected to their own portal
    (`/college-admin` or `/college/dashboard`) — and vice versa for a school member hitting
    `/college-admin/*`. Each mismatch logs a `console.warn` server-side per the master prompt's "log a
    warning server-side on mismatched access attempts" instruction.
  - A user with **no** membership on either side still falls through unchanged (page component does the
    definitive check) — this preserves existing behavior for flows like the `/admin/schools` bootstrap path
    where an org can exist before its first membership row does.
- **`tsconfig.college-erp.json`** (new) — scoped typecheck config mirroring `tsconfig.school-erp.json`,
  covering `src/lib/college-erp/**`, `src/lib/auth/resolveMembershipRedirect.ts`, `src/app/college*/**`,
  `post-login-destination`, and `src/middleware.ts`. Both `tsconfig.school-erp.json` and
  `tsconfig.college-erp.json` pass clean (`npx tsc --noEmit`) against every file this phase touched.

**Bug caught and fixed during this phase**: `collegeAdminHomeForRole()` initially pointed student/parent
roles at `/college` (mirroring school's `/school`), but no `page.tsx` exists at the `/college` root today —
only `/college/dashboard`. Fixed to point at `/college/dashboard` with a comment flagging it as a stopgap
until Phase 5 builds a real `/college` student/parent portal mirroring `/school`.

**Explicitly not done in Phase 2** (per §5 above, still open decisions, not silently resolved):
- [ ] The "at most one active role" enforcement question — both `getSchoolContext()` and the new
  `getCollegeContext()` still tolerate multiple active memberships and pick the highest-priority one,
  rather than rejecting ambiguity outright. No unique constraint added.
- [ ] What happens when a profile has active memberships in **both** a school and a college —
  `resolveMembershipRedirect()` prioritizes school unconditionally (per master prompt §3's stated order),
  the college membership is simply never surfaced at login. Not flagged to the user in any way today.
- [ ] `/school/teacher`, `/school/student`, `/college/teacher` dedicated sub-portals from Part 4/5 don't
  exist yet — role-detail gating below the top-level `/school-admin` vs `/school` (or `/college-admin` vs
  `/college/dashboard`) split remains a page-component concern, same as before this phase. That's Phase 3/5
  scope, not Phase 2.

## 12. Phase 3 — in progress (tracked task list, nothing silently skipped)

Started per owner instruction ("start, don't miss anything"). Tracked as 14 tasks in the session task
list so scope isn't lost across a multi-session build. Status as of this update:

**Done, typechecked, verified:**
- Plan inheritance: **discovered already fully built for school** —
  `src/lib/school-erp/subscription-cascade.ts` grants/revokes a PRO-tier row in the existing
  `subscriptions` table per membership, wired into `/admin/schools` billing-status toggle and
  `enrollStudent`/`addSchoolMember`. Satisfies the master prompt's expiry/renewal/no-data-loss
  requirements already — a live `resolveEffectivePlan()` resolver was not needed since the cascade
  writes `profiles.subscription_tier` directly and every AI-gating check already reads that column.
  **Built the college mirror**: `supabase/migrations/20260812093000_college_plan_settings_and_grants.sql`
  (new `college_organization_plan_settings` table, finally activating the previously-dead
  `institution_plan_tiers` college rows from §2) + `src/lib/college-erp/subscription-cascade.ts` +
  `src/lib/college-erp/modules.ts` + wired `college_enabled_modules` RPC into `getCollegeContext()`.
  Not yet called from anywhere (no `/admin/colleges` billing UI exists — Phase 5), but ready to wire up
  the same way `/admin/schools/actions.ts` does today.
- `src/lib/hooks/useNameSearch.ts` + `src/components/features/school-erp/PersonSearchInput.tsx` — the
  shared name-search primitive from point 15. Adopted in `/school-admin/people`
  (`PeopleDirectoryTable.tsx`, also adds the previously-missing phone-number column). **Not yet rolled
  out** to admissions, attendance registers, fee-defaulters, or parent-linking approval lists — same
  component, straightforward follow-up, just not done yet.
- Principal nav audit: `SchoolAdminSidebar.tsx` and the legacy `college-admin` nav were **already clean**
  — no consumer-app pages leaked in. Teacher-role permission filtering on the same sidebar already scopes
  correctly too (Overview/Launchpad/People/Attendance/Exams/Test Studio/Academics/PTM/Communication/
  Reports — no AI tutor/flashcards/games).
- Absence alert widget: new `getTodayAbsences()` query (`src/lib/school-erp/queries.ts`) + new
  `AbsenceAlertWidget.tsx` (Call/WhatsApp modal, E.164-normalized `wa.me` link) wired into
  `/school-admin`'s dashboard.
- **Parent nav bug found and fixed**: `DashboardSidebar` was rendering the *entire* consumer
  `NAV_GROUPS` (AI tutor, flashcards, games, university tools, everything) for parent-role users
  underneath the "My Children" section — the audit in Phase 1 flagged this as unconfirmed; it's now
  confirmed and fixed. Parents now see only "My Children" + a new "Performance & Reports"
  (`/parent/analytics`) link; the full consumer nav no longer renders for `role === 'parent'`.
  **Not done**: a deeper audit of `getUserPlan()`/quota-check call sites within the parent flow itself
  (point 12's "free access, always" — no plan gating) was not performed this pass; flagging as a
  follow-up, not confirmed either way.

**Queued, not started** (still tracked, nothing dropped):
- Teacher portal deepening: test/manage-tests page confirmation, student-info roster with phone +
  name-search wired in (people page now has both, needs teacher-role-specific verification).
- Handwritten attendance OCR scan + new-student-detection approval flow.
- Result card template gallery (3-4 layouts) + export.
- Guided date-sheet builder wizard.
- White-labeling (school/college logo replacing Ilm AI branding on enrolled members' dashboards).
- Young-kids games section (≤ grade 5), separate route from `/games`.
- QR scanner reliability fix or manual-code replacement (`ParentQrScanner`).
- Principal directory + cross-institution messaging (new feature, design sketch in §"Owner
  clarifications" above).
- College-side parity pass for every item above once its school-side version ships (per owner's "school
  = school + college" clarification).

**Also done since the above:**
- White-labeling (task #9): `resolveInstitutionBranding()` (school membership → college membership →
  null), wired server-side into `(dashboard)/layout.tsx` → `DashboardShell` → `DashboardSidebar`. Enrolled
  members now see "`<Institution name>` · ilm AI" + the institution's logo instead of the plain Ilm AI
  mark. Added the missing upload path too: `school_update_organization_logo` RPC (owner/admin-gated,
  mirrors `school_update_organization_profile`), a public `school-logos` storage bucket + RLS (and the
  matching `college-logos` bucket/RPC for parity), `uploadSchoolLogo()`, and a Branding card on
  `/school-admin/settings`. College-side logo *upload* UI doesn't exist yet (no `/college-admin/settings`
  branding section) — the RPC/bucket/resolver all support it, just no UI wired up yet, since college-admin
  still runs on the legacy portal (see `COLLEGE_ERP_IMPLEMENTATION.md` §4).
- QR scanner reliability (task #12): attempted the real fix first, per the master prompt's explicit
  preference over the manual-code fallback. Three concrete fixes landed in `ParentQrScanner/index.tsx`:
  (1) a `navigator.permissions.query` pre-check so a previously-denied user gets an accurate message
  instead of a generic retry loop; (2) a native `BarcodeDetector` fast path for browsers that support it
  (most Chromium/Android), skipping the CPU-bound ZXing decode entirely when available; (3) the
  late-callback teardown race is fixed — the ZXing result callback now no-ops entirely once `active` is
  false, instead of unconditionally reassigning `controlsRef.current` and risking a leaked stream. Also
  lowered the requested camera resolution from 1920×1080 to 1280×720 (faster constraint negotiation on
  low-end devices, no real QR-readability cost). **Not verified against a real camera/QR code** — this
  is inherently hard to test headlessly; typecheck is clean but a real-device smoke test is still owed
  before calling this fully done. If it turns out still unreliable in practice, the manual-code fallback
  (removing QR from both the parent-scan and student/school "show QR" screens per Part 4.5 point 2) is
  the documented next step.

- Teacher portal (task #4): reviewed and confirmed already solid — `/school-admin/tests` (AI Test
  Studio), `/school-admin/attendance` (manual register), and `/school-admin/people` (now searchable
  with phone numbers, from task #2) together cover the "tests, attendance, student-info" requirement.
  Also added name-search to `AttendanceRegister.tsx` itself (search box narrows the displayed rows;
  submission still covers the whole section regardless of the filter, so a filtered-out student's
  mark is never silently dropped).
- **Handwritten attendance register OCR scan + new-student detection (task #6) — done, full pipeline:**
  - `POST /api/school-admin/attendance/scan` — reuses `performOcr()` (handwritten/Gemini mode, same
    pipeline `api/ocr/route.ts` uses) for the OCR pass, then a `gatewayChat` follow-up (mirrors
    `school-erp/ai-insights.ts`'s report-card-remarks pattern) to turn freeform OCR text into
    structured `{name, rollNumber, status, confidence}` rows. Billed to the institution's plan via
    `checkDailyLimit`, **not** the teacher's personal OCR credits (same policy as every other
    school-ERP AI action). Matches each row to `school_enrollments` by roll number first, then
    normalized name.
  - `AttendanceScanUploader.tsx` — new card above the manual register on `/school-admin/attendance`:
    upload/photograph → editable table (status toggle per matched row, low-confidence rows flagged,
    unmatched rows show "New student detected — add to class?") → Confirm calls the existing
    `saveAttendance` action directly (no parallel write path).
  - New-student detection: `school_pending_student_additions` table (checked `school_admissions`
    first per the master prompt's explicit instruction — doesn't fit, its `guardian_name`/
    `guardian_phone` are `NOT NULL` and a scan has neither). Insert trigger notifies every
    owner/admin via the existing generic `notifications` table (same delivery mechanism as
    `school_notify_attendance`). Approval queue added to `/school-admin/requests` alongside the
    existing join-requests list (`PendingStudentAdditionsList.tsx`).
  - **Deliberate scope boundary**: approving a pending addition does **not** auto-create an
    enrollment — there's no linked account or real guardian contact info to enroll with yet. Approval
    marks it "go ahead" and the admissions/people team completes it via the existing Enroll Student
    form once the family provides an account. Documented in the action's own comment, not silently
    implied to be a full auto-enrollment.
  - Manual attendance entry is untouched — the scanner is an additional fast path, exactly as
    required.

**Task list note**: the session task tracker reset mid-session (tool returned "no tasks found" after
task #6 was marked complete) — this doc is the durable record instead. A fresh tracker was created for
the remaining items (result cards, date-sheet wizard, kids games, principal messaging, college parity).

- **Result card templates — done.** 4 selectable visual templates (`src/components/features/school-erp/report-card-templates/`: Classic table, Modern card, Grade-focused, GPA-focused), all rendering the same `ReportCardData` shape sourced from the existing `school_report_cards` table (nothing new to compute — `publishExamResults` already populates it). New page
  `/school-admin/exams/report-cards/[examId]` — template picker + bulk render of every published
  card for that exam, reusing the existing `PrintReportButton` (browser print-to-PDF, no new PDF
  renderer built, per the master prompt's explicit "check for an existing PDF-export utility first").
  Linked from the Exams page's "Report cards" button on any published exam. The original single-card
  view at `/school/report-card/[id]` is untouched — its template logic was extracted into
  `ClassicTable.tsx` for reuse, not duplicated.

- **Date-sheet guided builder — done.** `DateSheetWizard.tsx` asks one question at a time (section →
  subject → date → time → room/invigilator), loops on "Add another exam?", then bulk-saves the whole
  compiled date sheet in one submission via a new `createExamScheduleBatch` action (same
  `school_exam_schedules` table/constraint as the existing single-row `createExamSchedule`, just
  batched). Added as a new card on `/school-admin/exams`, additive to — not a replacement of — the
  existing single-subject quick-add form (relabeled "Quick add" so both stay discoverable). No
  `invigilator` column exists in the schema; folded into the existing free-text `room` field
  ("Room / invigilator") rather than a migration for one extra column.

- **Principal directory + cross-institution messaging — done** (owner-requested feature, not in the
  original master prompt; see chat for the ask: search any other school/college by name, pick a
  campus if it has more than one, send a direct in-app message). Design:
  - `institution_directory_messages` — the one deliberately **shared** table in this whole effort
    (not `school_*`/`college_*` split), because a school principal must be able to message a college
    principal and vice versa; a split-table design can't do that without a shared parent or
    duplicated rows. `organization_id` is intentionally not a real FK (school_organizations and
    college_organizations are different tables) — authorization runs entirely through a new
    `is_institution_principal(type, org_id)` security-definer dispatcher, not referential integrity.
  - `GET /api/school-admin/directory/search?q=` — owner/admin-only, searches both
    `school_organizations` and `college_organizations` by name, returns name/slug/logo/campuses only
    (same public-column allowlist discipline as the existing signup search).
  - Campus step: `PrincipalDirectoryMessenger.tsx` shows a campus `<select>` only when the picked
    institution has more than one campus — auto-selects (or skips entirely) for single-campus
    institutions, per the owner's exact ask.
  - `sendPrincipalMessage` (`src/lib/institution-directory/actions.ts`) — a small neutral module
    (not inside school-erp or college-erp) since this is genuinely shared plumbing; resolves the
    caller's own principal context (school first, then college) rather than assuming one side.
  - Insert trigger notifies every owner/admin of the recipient institution (and recipient campus, if
    one was chosen) via the existing generic `notifications` table — same delivery mechanism as
    every other school-ERP notification trigger.
  - UI: new "Message another school or college" card on `/school-admin/communication`, alongside the
    existing within-org "School inbox" (untouched). **College-admin side has no equivalent UI yet**
    — the backend (table, RLS, action, notification trigger) already fully supports a college
    principal sending/receiving, just no `/college-admin/communication` page exists to surface it
    (college-admin still runs the legacy portal — see task list item "Apply school-parity items to
    college portals").

- **Young-kids games section — done.** New `/school/kids-zone` route, fully separate from `/games`
  (different components, different rendering shell — the existing `games`/`game_sessions` tables and
  `GameRoomClient` multiplayer-room engine are untouched; these are simple, local-state-only games
  with no backend writes, matching the master prompt's "3-5 simple educational games initially"
  scope). 4 games shipped (covers all 3 example categories from the master prompt plus one extra):
  Letter Match, Count & Tap, Simple Math, Spelling Pop — all in
  `src/components/features/school-erp/kids-zone/`.
  - **Eligibility gate**: `school_classes.grade_level` is free text (no enum — schools type "Grade 3",
    "KG", "Nursery", etc.), and `profiles.grade_level`'s enum only covers `GRADE_9`–`GRADE_12`/O-A
    levels, so it **cannot** identify a primary-grade student at all. Eligibility is instead resolved
    from the student's active `school_enrollments → school_sections → school_classes.grade_level`
    via a small heuristic parser (`src/lib/school-erp/kids-zone.ts`): pre-primary labels
    (Nursery/KG/Prep/Montessori/…) rank as eligible, numeric grades ≤5 are eligible, anything else or
    unparseable text is **not** eligible — conservative by design, since showing this to an
    unidentified/older student is worse than a school just needing to fill in `grade_level`.
  - Visually distinct per the master prompt (brighter gradient backgrounds, large tap targets, no
    shared app chrome) — the KidJo-style reference the owner shared (bright cards, playful icons,
    "Play & Learn") shaped the look; scoped strictly to ≤ grade 5 per the owner's explicit follow-up
    clarification, not applied anywhere else in the app.
  - Entry point: a banner on `/school` (student portal home), shown only when eligible — computed
    server-side, not hidden-but-reachable.
  - **College-side**: not built. College has no equivalent young-grade population in the same way
    (colleges are post-secondary), so this wasn't mirrored — flagging the decision rather than
    silently skipping it.

## 13. Task #5 — apply school-parity items to college portals: status

Per the owner's clarification ("school" throughout this effort means school **and** college), every
item above should eventually exist for college too. What actually blocks that today, concretely:

- **`/college-admin` still runs on the legacy portal** (`src/lib/college/*`, the shallow `colleges`/
  `college_admins`/etc. tables from before this effort — see `COLLEGE_ERP_IMPLEMENTATION.md` §1), not
  the new `college_*` ERP schema built in Phase 1. Every school-side UI shipped in this phase
  (People directory with search+phone, absence alerts, attendance scan, result-card templates,
  date-sheet wizard, kids zone) reads from `school_*` tables via `school-erp/queries.ts` — none of it
  can be pointed at college data until `src/lib/college-erp/*` (queries, actions, UI components) is
  built out against the new schema and `/college-admin` is migrated onto it. That is the master
  prompt's own Phase 5, explicitly sequenced *after* Phase 3 (§9: "College system... mirror Phase 3's
  shape once school is solid and patterns are proven") — building it now would mean re-doing it once
  Phase 5 properly wires `/college-admin` to the real schema, not skipping ahead productively.
- **What already has college-side parity, because it didn't depend on `/college-admin` existing:**
  - Plan inheritance cascade (`college-erp/subscription-cascade.ts` + `college_organization_plan_settings`
    migration) — ready, just unused until a billing UI calls it.
  - White-labeling resolver (`resolveInstitutionBranding()`) — already checks `college_memberships`
    before falling back to no-branding; a college-enrolled student would see their college's logo on
    the generic `/dashboard` sidebar today, if `college_organizations.logo_url` were populated. No
    upload UI exists yet (same reason: no `/college-admin/settings` page to put it on).
  - Principal directory messaging — the shared table, RLS, action, and notification trigger all
    already support a college principal on either side of a conversation; only the
    `/college-admin/communication` page to surface it is missing.
  - Role-locked login routing (Phase 2) — `getCollegeContext()`/`resolveCollegeRole()` already resolve
    college members to `/college-admin`/`/college` correctly, independent of what those routes render.
- **What has no college equivalent at all yet**: teacher/student portal depth, attendance
  (manual or scanned), exams/results/report cards, date-sheets, name-search rollout, kids-zone
  (not applicable to colleges), absence alerts, parent-trim (college's parent-linking model doesn't
  exist yet either).

**Update — Phase 5 (college parity) was done in full this session, per explicit owner instruction
("complete everything, don't miss anything").** What shipped:

### Core college-erp library (mirrors school-erp exactly, verified clean under `tsconfig.college-erp.json`)
- `src/lib/college-erp/queries.ts` — full mirror of `school-erp/queries.ts`'s core surface: overview,
  today's-absences, academic setup, people, admissions, attendance, exam report cards, exams, fees,
  academics, communication, reports, portal data, pending-student-additions.
- `src/lib/college-erp/actions.ts` — full mirror of `school-erp/actions.ts`'s core surface: org
  profile/logo, campus/department/academic-year/semester/section/course-offering creation, member
  add/enroll/guardian-link, admissions, attendance (+ new-student detection), exams (+ date-sheet
  batch, marks, publish/report-card generation), fees, academics (assignments/lesson-plans/timetable/
  calendar), announcements, contact messages.
- `src/lib/college-erp/storage.ts` — logo upload, mirrors school's.
- New migration `20260812140000_college_erp_core_gap_fill.sql` — `college_pending_student_additions`
  (new-student-detection table), since that table didn't exist from the Phase 1 schema (only school's
  did).

### College-admin UI (new routes; existing legacy routes untouched — see the "OR-gate" note below)
- `/college-admin` (overview + absence alerts), `/college-admin/people` (searchable, phone column —
  reuses `PeopleDirectoryTable` directly, it was already generic), `/college-admin/admissions`,
  `/college-admin/attendance` (manual + handwritten-register scan, mirrors school's pipeline exactly
  including `POST /api/college-admin/attendance/scan`), `/college-admin/exams` (+ guided date-sheet
  wizard + marks register) with `/college-admin/exams/report-cards/[examId]` (reuses the **same**
  `report-card-templates` module school uses — zero duplication needed, it was already
  data-shape-generic), `/college-admin/fees`, `/college-admin/academics`, `/college-admin/communication`
  (+ principal directory messenger — reuses `PrincipalDirectoryMessenger` directly, also already
  generic), `/college-admin/reports`, `/college-admin/settings` (org profile + branding + structural
  setup forms), `/college-admin/requests` (pending student additions).
- `/college` (student/parent portal) and `/college/report-card/[id]` — mirror `/school`'s shape minus
  the PTM section.
- New `CollegeAdminSidebar` (mirrors `SchoolAdminSidebar`'s permission-filtered nav pattern).

### The "OR-gate" compatibility decision (important — read before touching `/college-admin` again)
`/college-admin/layout.tsx`, `/college-admin/page.tsx`, `/college-admin/requests/page.tsx`, and
`/college-admin/settings/page.tsx` each check the **new** `college_memberships`-based context first;
if that resolves, they render the new schema's UI. If it doesn't, they fall through to the **old**
`college_admins`-based context (`src/lib/college/access.ts`) and render the original legacy UI,
completely unchanged. This was deliberate, not a shortcut: the old `colleges`/`college_admins` schema
and the new `college_organizations`/`college_memberships` schema have **no data bridge between them**
— an admin provisioned under the old system has no row in the new `college_memberships` table, and
vice versa. Replacing the legacy check outright would have logged out every existing college admin the
moment this shipped. The OR-gate means: existing legacy colleges keep working exactly as before with
zero regression, and any *newly provisioned* `college_organizations` row gets the full new feature set
immediately. `/college-admin/lectures`, `/resources`, `/students` were left as pure legacy pages
(no new-schema equivalent built) since they're legacy-schema-specific and out of scope for this pass.
- **Open follow-up, not attempted this session**: an actual data-migration/bridge tool (turn an
  existing `colleges` row into a `college_organizations` row + turn `college_admins` rows into
  `college_memberships` rows) so existing college admins can move onto the new feature set without
  manual re-provisioning. This is real production data manipulation — deliberately not improvised
  without the owner's explicit review of the mapping.

### What was explicitly NOT ported for college (documented, not silently dropped)
- **Payroll** (`school_staff_compensation`/`school_payroll_runs`/`school_payroll_items` and their
  actions/queries/UI) — no college schema for this exists; would need its own migration.
- **PTM (parent-teacher meetings)** (`school_ptm_requests`/`school_ptm_slots`/`school_ptm_notes` and
  all associated actions/queries/UI) — same, no college schema exists.
- **AI insights** (`school-erp/ai-insights.ts`: AI-generated report-card remarks, `PrincipalAiSummary`)
  — not ported; `college_report_cards` doesn't even have the `ai_comment` column those features write
  to (it's added to `school_report_cards` by a school-only later migration). The college report-card
  view/templates handle a missing `ai_comment` gracefully (renders nothing), so this isn't a crash risk,
  just a missing feature.
- **Public self-serve admission form** (`/schools/[slug]/admissions`, `POST /api/school/admissions`,
  admission-document upload/signed-URL API) — colleges don't have an equivalent public page or
  document-upload pipeline; admissions are entered manually by staff for now.
- **Bulk CSV people import** (`school-erp/import-actions.ts`, `/school-admin/people/import`) — not
  ported; college's People page links to it but shows it as visibly disabled/unavailable rather than a
  silently broken link.
- **Staff attendance marking UI** (`StaffAttendanceRegister.tsx`) — school-specific component;
  college's attendance page shows the staff count but no marking UI yet.
- **Self-serve college join-requests** (a student searching for and requesting to join a college
  directly, the way `school_join_requests` works) — no `college_join_requests` table exists for the
  new schema; admins add members manually via People instead. Said explicitly in the college
  `/requests` page UI copy, not left unexplained.
- **CSV report export / AI monthly principal summary** on the Reports page — same reasons as above
  (school-only routes/components).

All of the above are real, scoped, and each is its own follow-up-sized unit of work — not vague
hand-waving. Nothing was silently skipped; every gap above is called out exactly where a user of the
new college-admin would notice it missing.

Both `tsconfig.school-erp.json` and `tsconfig.college-erp.json` typecheck clean (0 errors) as of this
update, covering all school and college ERP code written this session.
