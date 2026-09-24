# College ERP Implementation

> **Status: schema plan only (Phase 1 of `CLAUDE_CODE_MASTER_PROMPT.md`).** The migration below has been
> written and reviewed but not applied to any live database, and no application code
> (`src/lib/college-erp/*`, UI routes, RLS-consuming server actions) exists yet. This document mirrors the
> structure of `docs/SCHOOL_ERP_IMPLEMENTATION.md` so the two stay comparable as college's own phases
> (mirroring school's Phase 3 build-out) land. See `docs/SCHOOL_COLLEGE_SEPARATION_TODO.md` for the audit
> this plan was built from and the open decisions it depends on.

## 1. Context — why a new schema instead of extending the existing one

A "college portal" already exists (`colleges`, `college_admins`, `college_departments`,
`college_lectures`, `college_resources`, `college_faculty`, `college_notices`, `college_discussions`,
`college_discussion_replies`, `college_placements`, `college_events`, `college_timetable_entries`,
`college_join_requests` — `supabase/migrations/20260710121300_college_portal_base_and_expansion.sql` +
`20260711130000_college_portal.sql`). It is intentionally left running as-is; nothing below removes it.

It does not cover the target design from the master prompt: no campuses, no membership/role model
(`college_admins` is a flat admin-assignment table, not a `member_role`-scoped membership table), no
academic-year concept, `semester`/`course_name` as free-text columns instead of real tables, and no
attendance/exam/fee tenant scoping at all. It also has a known schema-drift bug
(`college_admins.user_id` vs the app code's `college_admins.profile_id` — see the TODO doc §4) that Phase 1
did not attempt to fix, since it's a pre-existing bug independent of this split.

Per the master prompt's own instruction to extend rather than duplicate *only if the existing schema
already covers what's needed* — it doesn't — a new, parallel tenant schema was added instead, following
the same shape as the school ERP (`school_erp_core.sql`), with table names chosen to avoid colliding with
the legacy portal tables (e.g. `college_academic_departments` not `college_departments`).

## 2. Database Changes

Migration: `supabase/migrations/20260812090000_college_erp_core.sql`

The migration adds **30 tenant tables** — a table-for-table mirror of the school ERP's 29, plus one new
layer (`college_academic_departments`) since college's hierarchy needs a department level that school's
class/section hierarchy doesn't:

- Organizations, campuses, **academic departments**, memberships, academic years, semesters, sections, and
  course offerings.
- Enrollments, guardians, admissions, and private admission documents.
- Student/staff attendance and leave requests.
- Exams, exam schedules, marks, and report cards.
- Fee structures, invoices, payments.
- Timetable slots, assignments, lesson plans, calendar events, announcements, delivery queues, contact
  messages, and audit logs.

Hierarchy mapping vs. the school ERP (full table in `docs/SCHOOL_COLLEGE_SEPARATION_TODO.md` §4):

```
school:  organization → campus → academic_year → class            → section → subject_offering
college: organization → campus → department → academic_year → semester → section → course_offering
```

Key naming differences from a literal copy-paste (chosen to read correctly for a college domain, not just
find-and-replace "school"→"college"):

- `school_classes` → `college_semesters` (`grade_level` → `semester_number`, scoped to `department_id` +
  `academic_year_id`).
- `school_sections` → `college_sections` (`homeroom_teacher_id` → `advisor_id`, default capacity 40 → 60).
- `school_subject_offerings` → `college_course_offerings` (`subject_name` → `course_name` + new
  `course_code`, `weekly_periods integer` → `credit_hours numeric(4,1)`).
- `school_enrollments.admission_number` → `college_enrollments.registration_number`.
- `school_admissions.applying_for_class` → `college_admissions.applying_for_program`.
- `school_homework` → `college_assignments` (same shape, college-appropriate name).
- `school_organizations.organization_type` check (`school|academy|college`) →
  `college_organizations.organization_type` check (`college|university|institute`) — deliberately does
  **not** include `'school'`, closing the inverse of the smell noted in the TODO doc §2 where
  `school_organizations` currently allows `'college'` as a type.

Also mirrored 1:1 from the school ERP:

- 30 tenant-first operational indexes plus composite tenant-key `(id, organization_id)` indexes.
- Composite foreign keys that reject cross-college references (same technique as school: child rows FK
  against a composite `(id, organization_id)` unique index, so a UUID from another tenant can never be
  attached even if RLS were misconfigured).
- A single-main-campus and single-current-academic-year rule.
- `college_update_organization_profile` RPC (owner/admin-gated).
- Attendance, fee-invoice, and report-card notification triggers (insert into the existing
  `public.notifications` table, link to `/college` routes).
- Fee-payment reconciliation trigger (`college_apply_fee_payment`).
- Private `college-admissions` storage bucket (mirrors `school-admissions`: 5 MB/file,
  PDF/JPEG/PNG/WebP only, signed-URL access gated by `college_has_role(...)`).

## 3. RLS

29 of the 30 tables carry RLS (the 30th, `college_academic_departments`, was added as the new layer and
also has RLS enabled + policies — 30/30). Same security-definer helper pattern as school:

- `college_is_platform_admin()` — `profiles.role = 'admin'` bypass.
- `college_has_role(organization_id, roles[])` — membership + role + active-status check.
- `college_is_member(organization_id)` — any active role.
- `college_can_view_student(organization_id, student_id)` — self, guardian link, assigned
  teacher/advisor, or admin/admissions/accountant role.
- `college_teacher_can_manage_section/student(...)` — advisor or course-offering teacher, or admin.

Broad org-wide tables → visible to any member, mutable by `owner|admin`. Relationship-scoped tables
(attendance, marks, invoices) → `college_can_view_student(...)`. `college_memberships` itself has the same
owner-only mutation guard as `school_memberships` (admins cannot create/update/delete owner rows).

## 4. What is NOT done yet (explicitly out of Phase 1 scope)

- No `src/lib/college-erp/*` access layer, actions, queries, or types — this phase is schema-only. The
  existing `src/lib/college/*` (built against the old shallow schema) is untouched and still serves
  `/college-admin`/`/college` as before; it does not yet read from any of the new `college_*` ERP tables.
- No UI routes read/write the new tables yet. `/college-admin`, `/college`, `/colleges` continue to run
  against the legacy schema until a later phase wires them up (or replaces them — see the TODO doc §4's
  open decision on migrate-vs-parallel-run).
- No `getCollegeContext()` login-resolution function — `college_memberships` exists but nothing in
  `post-login-destination` reads it yet (Phase 2 scope, see TODO doc §5).
- No `tsconfig.college-erp.json` — nothing to scope a typecheck against until Phase 5 adds
  `src/lib/college-erp`/`src/components/features/college-erp` source files.
- Migration has not been applied to any database (local or remote) and `database.types.ts` has not been
  regenerated against it.
- `institution_plan_tiers`' seeded `college_*` rows (from
  `20260806110000_institution_limits_payroll_resources.sql`) are not yet wired to
  `college_organizations` — still dead/unused, same as before this phase (see TODO doc §2).

## 5. Migration instructions (when a later phase is ready to apply this)

1. Back up the target database and apply in staging first: `supabase db push` (or the project's normal
   migration-apply command) with `20260812090000_college_erp_core.sql` included.
2. Regenerate Supabase TypeScript types.
3. Verify RLS with two colleges and every role (owner/admin/admissions/teacher/staff/accountant/parent/
   student) before any production UI reads/writes the new tables — same staging checklist the school ERP
   doc used in its §15.
4. Do **not** point `/college-admin`/`/college` at the new tables until the corresponding phase (mirroring
   school's Phase 3) actually builds `src/lib/college-erp/*` against them — applying the migration alone is
   safe (additive, empty tables) but wiring routes to it prematurely would leave the legacy portal and the
   new ERP schema both partially live.
