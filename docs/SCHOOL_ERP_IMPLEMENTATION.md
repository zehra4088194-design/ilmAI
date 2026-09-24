# School ERP Implementation

## 1. Missing Features List

The project already had Supabase authentication, student learning dashboards, AI tools and quotas, teacher classes/assignments, parent linking and reports, college tenancy, notifications, subscription payments, super-admin screens, reusable UI, and responsive dark/light themes.

The school-specific gaps were:

- No school/academy tenant, campus, academic year, class, or section hierarchy.
- No institutional memberships or school-scoped RBAC.
- No online admission pipeline, document storage, approval, waiting list, or enrollment workflow.
- No school attendance, staff attendance, leave, examination, report-card, or fee ledger.
- No school timetable, lesson-plan, homework, calendar, or role-targeted announcement system.
- No school-level parent/student portal, contact inbox, operational reports, or school provisioning screen.

## 2. Recommended Improvements

Implemented additions are isolated under `school_*` tables and `/school*` routes. Existing consumer learning, college, teacher, parent, AI, and subscription behavior remains intact.

Institutional records do not consume FREE/PRO/ELITE AI credits. AI-powered analysis continues to use the existing AI gateway and plan limits so a school ERP action cannot silently spend a student's free quota.

## 3. Database Changes

Migration: `supabase/migrations/20260727100000_school_erp_core.sql`

The migration adds 29 tenant tables covering:

- Organizations, campuses, memberships, academic years, classes, sections, and subject offerings.
- Enrollments, guardians, admissions, and private admission documents.
- Student/staff attendance and leave requests.
- Exams, date sheets, marks, GPA/grades/positions, and report cards.
- Fee structures, vouchers, discounts, scholarships, fines, payments, and receipts.
- Timetables, homework, lesson plans, calendar events, announcements, delivery queues, contact messages, and audit logs.

It also adds:

- 20 tenant-first operational indexes plus composite tenant key indexes.
- 65 RLS policies.
- Composite foreign keys that reject cross-school references.
- A single-main-campus and single-current-year rule.
- Controlled organization-profile RPC.
- Attendance, fee, and report-card notification triggers.
- Fee payment reconciliation trigger.
- Private `school-admissions` storage bucket.

## 4. API Changes

- `POST /api/school/admissions`: public multipart admission form with Zod validation, IP rate limit, file allowlist, 5 MB/file and 3-file caps, and rollback on upload failure.
- `GET /api/school-admin/admission-document?id=...`: authorized 60-second signed document URL.
- `GET /api/school-admin/reports/export?type=...`: RLS-scoped attendance, fee, result, and admission CSV exports.
- `GET /api/cron/school-notifications`: authenticated queue worker, retries, stale-job recovery, overdue fee updates, in-app/email/push/SMS/WhatsApp delivery.

Operational writes use typed server actions in `src/lib/school-erp/actions.ts`. They authenticate the user, resolve the selected tenant, check permissions, apply an independent abuse limit, rely on RLS, and append audit records.

## 5. UI Changes

- `/school-admin`: role-aware operational dashboard.
- `/school-admin/people`: staff, teachers, students, parents, enrollments, and guardian links.
- `/school-admin/admissions`: applications, documents, approval, waiting list, and public form link.
- `/school-admin/attendance`: student register, staff register, and leave decisions.
- `/school-admin/exams`: exams, date sheets, marks entry, publishing, GPA, and positions.
- `/school-admin/fees`: structures, vouchers, discounts, scholarships, fines, payments, and defaulters.
- `/school-admin/academics`: homework, timetable, lesson plans, and calendar.
- `/school-admin/communication`: announcements, delivery status, draft publishing, and school inbox.
- `/school-admin/reports`: charts, CSV exports, and audit log.
- `/school-admin/settings`: organization, campuses, years, classes, sections, and subjects.
- `/school`: student/parent/member portal for attendance, results, printable reports, fees, homework, timetable, alerts, leave, and school messages.
- `/schools/[slug]/admissions`: public responsive admission form.
- `/admin/schools`: platform-admin tenant provisioning.

## 6. Components Required

Reusable additions are in `src/components/features/school-erp`:

- Action form with pending/success/error states.
- School sidebar and organization switchers.
- Metric, page-header, attendance, staff-attendance, and marks-register components.
- Reports dashboard, public admission form, and print-report control.

## 7. Folder Changes

No existing folder was renamed or removed. Additions use:

- `src/lib/school-erp`
- `src/components/features/school-erp`
- `src/app/school`
- `src/app/school-admin`
- `src/app/schools/[slug]/admissions`
- `src/app/api/school*`
- `src/app/(admin)/admin/schools`

`tsconfig.school-erp.json` provides a repeatable scoped typecheck for this feature.

## 8. Security Improvements

- Middleware protects `/school` and `/school-admin`.
- School context is resolved from authenticated memberships.
- A validated HttpOnly, SameSite cookie selects the active organization.
- Role permissions and relationship checks limit student, guardian, teacher, finance, and admissions records.
- Admins cannot create, update, or delete owner memberships; owners retain that authority.
- Every tenant table has RLS and all operational queries include `organization_id`.
- Composite tenant foreign keys prevent UUID-based cross-tenant corruption.
- Public uploads use private storage, sanitized names, MIME/size/count limits, short signed URLs, and service-side validation.
- Public admissions are capped at 10 submissions per network/day; signed-in operational actions are capped at 500/user/action/day without consuming plan or AI quotas.
- Cron routes require `CRON_SECRET`.

## 9. Performance Improvements

- Tenant-first indexes cover memberships, enrollments, attendance, admissions, results, fees, timetables, queues, messages, and audits.
- Dashboard count queries use `head: true`.
- Operational lists are bounded and reports export at most 10,000 rows per request.
- Delivery work is batched to 100 jobs with three attempts and backoff.
- Charts aggregate already bounded server results.
- Large-scale production should add cursor pagination and async object-storage exports for reports beyond 10,000 rows.

## 10. Complete Implementation Plan

Completed:

1. Existing module audit and gap mapping.
2. Additive multi-tenant schema and RLS.
3. Server access layer, actions, queries, and audit trail.
4. Admin, teacher/staff, parent/student, and super-admin surfaces.
5. Public admissions, documents, reports, communications, and free-tier controls.
6. Scoped compilation, focused tests, and route compilation checks.

Provider/infrastructure follow-up:

- Select and configure actual SMS and WhatsApp providers.
- Select a school-fee checkout provider and implement its signed webhook contract. The ledger already stores `provider` and `provider_reference`; no insecure fake checkout was added.
- Run load tests with production-like tenant and attendance volumes before claiming one-million-user throughput.
- Route institutional AI insights through the existing AI credit gateway only after product limits are defined.

## 11. Production Ready Code

The implemented code uses existing Supabase, server-action, UI, email, push, Redis/memory rate-limit, notification, and middleware patterns. New database access currently uses local ERP interfaces plus narrow `any` boundaries until generated Supabase types are refreshed after the migration.

## 12. Migration Instructions

1. Back up the production database and apply the migration in staging.
2. Run `supabase db push` with the intended Supabase project linked.
3. Regenerate Supabase TypeScript types using the project's normal type-generation command.
4. Set `CRON_SECRET` and schedule `GET /api/cron/school-notifications` every 5-10 minutes.
5. Keep existing SMTP/Firebase variables for email and push.
6. Optional SMS variables: `SCHOOL_SMS_WEBHOOK_URL`, `SCHOOL_SMS_WEBHOOK_TOKEN`.
7. Optional WhatsApp variables: `SCHOOL_WHATSAPP_WEBHOOK_URL`, `SCHOOL_WHATSAPP_WEBHOOK_TOKEN`.
8. Create the first school from `/admin/schools`; its owner must already have an ilm AI account.
9. Configure campus, academic year, classes, sections, members, and enrollments in `/school-admin`.

## 13. Testing Strategy

Automated:

- `npx tsc --noEmit -p tsconfig.school-erp.json --pretty false`
- `npx vitest run tests/unit/school-erp.test.ts --reporter=verbose`

The focused tests cover public admission validation, file caps/name sanitization, RLS on every new table, composite tenant constraints, and owner-escalation protection.

Staging checks should cover each role, cross-tenant negative tests, admission uploads, attendance alerts, result publication, partial/over payments, exports, and delivery retries.

## 14. Build Verification

Verified:

- Scoped ERP TypeScript check: passed.
- ERP unit/security tests: 5/5 passed.
- Next dev middleware/route compilation: passed.
- `/school-admin` without a session: `307` to login.
- Malformed public admission request: `400`.

The repository-wide `npm run typecheck` exceeded the 124-second command ceiling without emitting errors. Two isolated production build attempts and an app-only compile attempt exceeded the 10-minute ceiling without a diagnostic error or `BUILD_ID`. This remains a repository-wide build-duration/resource issue and is not reported as a pass.

## 15. Deployment Verification

No production deployment or remote database migration was performed because no deployment target or database-change approval was supplied. Deployment is ready for staging after the migration and environment steps above. Verify:

- Tenant provisioning and active-school switching.
- RLS with two schools and every role.
- Private document access and signed URL expiry.
- Cron execution and configured external providers.
- Report exports and print-to-PDF report cards.
- Existing FREE plan AI/game/download limits remain unchanged.
