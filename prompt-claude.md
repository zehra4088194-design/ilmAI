# Claude Follow-up Prompt: Prompt 5 Implementation Verification + Supabase/Vercel Sync

You are Claude working with connected Supabase, Vercel, Google Drive, and Resend tools for the `ilmAI / studyverse-ai` project.

Codex has now implemented **CODEX PROMPT 5 of 5** locally in the project. Your job is to inspect the latest project files, run/apply the required Supabase changes safely, regenerate Supabase types, deploy/verify on Vercel, and fix only the small integration gaps needed to make the live app pass build.

Do not delete production data. Do not run destructive SQL. If an object already exists, inspect and continue safely.

## New Prompt 5 Features Implemented In Code

### AI Vision: Scan & Solve

Added:

- `src/app/api/vision/scan/route.ts`
- `src/app/(dashboard)/scan/page.tsx`
- `src/components/features/vision/VisionScanClient/index.tsx`

Behavior:

- Student uploads/captures image.
- API stores image in private Supabase Storage bucket `vision-scans`.
- Reuses existing OCR pipeline from `src/lib/ocr/index.ts`.
- Sends OCR text/context through existing AI gateway from `src/lib/ai/gateway.ts`.
- Saves scan record in `vision_scans`.
- Free users have monthly limited scans via count query; Pro/Elite unlimited.
- AI Tutor and Doubt Board now link into Scan & Solve.

### AI Voice Tutor: Speaking Practice

Added:

- `src/app/api/voice/practice/route.ts`
- `src/app/(dashboard)/tutor/speaking-practice/page.tsx`
- `src/components/features/voice/SpeakingPracticeClient/index.tsx`

Behavior:

- Pro/Elite feature.
- Student picks language/difficulty.
- AI generates speaking prompt.
- Browser MediaRecorder records audio.
- Student transcript is submitted with audio.
- Audio is stored in private Supabase Storage bucket `speaking-practice-audio`.
- Feedback/score is generated through existing AI gateway.
- Saved in `speaking_practice_sessions`.

Note: This extends existing Live Voice Call; it does not replace Gemini Live.

### AI Research Assistant Workspace

Added:

- `src/app/api/research/projects/route.ts`
- `src/app/api/research/sources/route.ts`
- `src/app/(dashboard)/university/research/[projectId]/page.tsx`
- `src/components/features/university/ResearchWorkspaceClient/index.tsx`
- `src/components/features/university/ResearchProjectStarter/index.tsx`

Updated:

- `src/app/(dashboard)/university/research-helper/page.tsx`

Behavior:

- Research Helper can create a research workspace.
- Workspace supports verified-source workflow, source strategy, PDF summary notes, APA/MLA citation generation via existing citation API, and source saving.
- Plagiarism section is clearly labeled as guidance only, not a detector.

### AI Project Builder

Added:

- `src/app/api/ai/project-builder/route.ts`
- `src/app/(dashboard)/university/project-builder/page.tsx`
- `src/components/features/university/ProjectBuilderClient/index.tsx`

Updated:

- `src/lib/constants/university.ts`
- `src/components/layout/DashboardSidebar/index.tsx`

Behavior:

- Pro/Elite feature.
- Free users see locked preview.
- Pro/Elite users enter one-line idea.
- AI gateway generates structured JSON:
  - proposal
  - executive_summary
  - business_model
  - timeline
  - flowchart_mermaid
  - architecture
  - budget_estimation
  - risk_analysis
  - report
  - poster_copy
  - pitch_script
- Sections render as editable cards.
- PDF/print export works through `window.print`.
- PPTX shows clean Coming Soon state.

### Offline Learning

Added:

- `public/sw.js`
- `src/components/features/offline/ServiceWorkerRegister/index.tsx`
- `src/app/(dashboard)/downloads/page.tsx`
- `src/components/features/offline/DownloadsClient/index.tsx`
- `src/app/api/offline/download-log/route.ts`

Updated:

- `src/providers/index.tsx`
- `src/components/features/library/GoogleDriveResourceCard/index.tsx`
- `src/components/layout/DashboardSidebar/index.tsx`

Behavior:

- Service worker caches selected static/doc resources.
- Resource cards have `Download for offline`.
- Download page lists locally saved resources and cache usage.
- Server logs downloads in `offline_download_log`.
- No automatic background download.

### Unified Analytics Dashboards

Added:

- `src/components/features/analytics/RoleAnalyticsClient/index.tsx`
- `src/app/(dashboard)/dashboard/analytics/page.tsx`
- `src/app/(dashboard)/teacher/classes/[id]/analytics/page.tsx`
- `src/app/(dashboard)/parent/analytics/page.tsx`

Updated:

- `src/app/(admin)/admin/analytics/page.tsx`

Behavior:

- Student analytics at `/dashboard/analytics`.
- Teacher class analytics at `/teacher/classes/[id]/analytics`.
- Parent analytics at `/parent/analytics`.
- Admin analytics extended with PostHog readiness, tier split, adoption, feature-detect notes.
- Uses `recharts`.
- Missing data/tables are treated as gracefully omitted sections.

### i18n Keys Added

Updated:

- `messages/en.json`
- `messages/ur.json`
- `messages/hi.json`

Added namespaces:

- `vision.*`
- `voicePractice.*`
- `research.*`
- `projectBuilder.*`
- `offline.*`
- `analytics.*`

## New Supabase Migration To Run

Run this migration safely:

`supabase/migrations/20260711110000_prompt5_ai_vision_voice_research_project_offline.sql`

It creates:

- Storage bucket `vision-scans`, private.
- Storage bucket `speaking-practice-audio`, private.
- `vision_scans`
- `speaking_practice_sessions`
- `research_projects`
- `research_sources`
- `ai_projects`
- `offline_download_log`
- RLS policies for user-owned records.
- Storage policies for per-user folder access.

If storage bucket creation via SQL fails due Supabase permissions, create the buckets manually in Supabase Storage with `public = false`, then rerun/adjust policies safely.

## Important Current Blocker

Codex ran:

```bash
npm run typecheck
npm run build
```

Result:

- Next.js compile step succeeded.
- Typecheck/build failed because `src/lib/supabase/database.types.ts` is stale and/or Supabase migrations from earlier batches are not reflected in generated types.
- First blocking error:
  - `src/app/(dashboard)/achievements/page.tsx`
  - `profiles.coins`, `profiles.streak`, `profiles.xp` missing according to generated types.

Many errors reference missing/generated type entries for:

- `profiles.coins`
- `profiles.streak`
- `profiles.college_id`
- `student_chat_requests`
- avatar tables
- career tables
- planner tables
- teacher/class tables
- portfolio tables
- prediction/insight tables

This is likely because earlier SQL migrations were applied in Supabase but `database.types.ts` was not regenerated, or migrations are still missing in Supabase.

## Required Claude Actions

1. Inspect Supabase schema.
2. Confirm whether all previous migrations from the project have already been applied.
3. Apply missing migrations safely, especially:
   - all existing `database/migrations/*.sql`
   - all existing `supabase/migrations/*.sql`
   - the new Prompt 5 migration above.
4. Confirm private Storage buckets:
   - `vision-scans`
   - `speaking-practice-audio`
5. Regenerate Supabase TypeScript types into the exact file used by the app:

```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > src/lib/supabase/database.types.ts
```

Important: Do not generate to `src/lib/supabase/types.ts`; the app imports `database.types.ts`.

6. Run:

```bash
npm run typecheck
npm run build
```

7. If build still fails after types are regenerated, fix only the small TypeScript integration issues. Do not remove features.

8. Deploy to Vercel only after build passes.

## Manual Verification Checklist

Verify on local or Vercel:

1. `/scan`
   - Upload image.
   - OCR runs.
   - AI explanation appears.
   - Row appears in `vision_scans`.
   - File appears in private `vision-scans` bucket.

2. `/tutor/speaking-practice`
   - Free user sees Pro/Elite lock from API.
   - Pro/Elite can generate prompt, record audio, submit transcript.
   - Row appears in `speaking_practice_sessions`.
   - Audio appears in private `speaking-practice-audio`.

3. `/university/research-helper`
   - Create workspace.
   - Redirects to `/university/research/[projectId]`.
   - Citation generation saves source.
   - UI clearly says plagiarism guidance is not a detector.

4. `/university/project-builder`
   - Free user sees locked preview.
   - Pro/Elite can generate project pack.
   - Editable sections render.
   - Print/PDF works.

5. `/library`
   - Resource card has `Download for offline`.
   - `/downloads` lists saved resource.
   - `offline_download_log` records action.

6. Analytics:
   - `/dashboard/analytics`
   - `/teacher/classes/[id]/analytics`
   - `/parent/analytics`
   - `/admin/analytics`

7. AI Tutor and Doubt Board:
   - Camera OCR still works.
   - `Scan & Solve` link opens `/scan`.

## Report Back

Report:

1. Which migrations were applied.
2. Whether buckets are private and policies work.
3. Whether `database.types.ts` was regenerated.
4. Final `npm run typecheck` result.
5. Final `npm run build` result.
6. Vercel deployment URL.
7. Any remaining manual steps for the user.

---

# Latest Addendum: College Portal Replacement + Remaining Live-Fix Work

Codex later integrated the new standalone college portal module from:

`college-portal-new/college-portal`

This addendum supersedes any older college portal implementation notes. Your job is to inspect the latest repo state, run the required Supabase work safely, regenerate types, fix the remaining build blockers, deploy to Vercel, and verify the live flows.

Do not delete production data. Do not run destructive SQL. If old college tables/routes/migrations already exist in Supabase, inspect first and migrate forward safely instead of dropping data.

## College Portal Code Already Integrated Locally

Codex has already copied/integrated the new module into the actual app:

- `src/lib/college/**`
- `src/hooks/useCollegeStatus.ts`
- `src/components/college/**`
- `src/app/colleges/page.tsx`
- `src/app/colleges/[slug]/page.tsx`
- `src/app/college/dashboard/page.tsx`
- `src/app/college-admin/**`
- `src/app/(admin)/admin/colleges/**`
- `supabase/migrations/20260711130000_college_portal.sql`

Codex also removed/replaced the old app-level college routes:

- old `src/app/college-admin` was replaced with the new module version
- old `src/app/(dashboard)/college` was removed/replaced by `src/app/college/dashboard`

Codex wired:

- Student sidebar: `CollegeSidebarNavItem` appears in `src/components/layout/DashboardSidebar/index.tsx`.
- Admin sidebar: `Colleges` nav item appears in `src/components/layout/AdminSidebar/index.tsx`.
- Middleware: `/colleges` stays public, `/college/dashboard` is protected, `/college-admin` is login-gated and deeper authorization happens in the college-admin layout/actions.
- i18n: module college labels merged into `messages/en.json`, `messages/ur.json`, `messages/hi.json`.
- `tsconfig.json`: excludes the source folder `college-portal-new` so it is not typechecked as duplicate app code.

## New College Portal Supabase Work To Run

Run this migration safely:

`supabase/migrations/20260711130000_college_portal.sql`

It creates/updates:

- `colleges`
- `college_admins`
- `college_join_requests`
- `college_lectures`
- `college_resources`
- `profiles.college_id`
- approval trigger that sets `profiles.college_id` when a request is approved
- RLS policies for public browse, student requests, college admin management, and super-admin/service-role operations

Important: There is an older local migration:

`supabase/migrations/20260710121300_college_portal_base_and_expansion.sql`

Do not blindly drop anything from that older schema if it was already applied. Inspect Supabase. If old tables exist, keep existing data safe and ensure the new module schema exists and works. The current app code uses the new module tables listed above.

## College Portal Storage Buckets

Create/verify these Supabase Storage buckets as PUBLIC buckets, because `src/lib/college/storage.ts` uses `getPublicUrl()` for these files:

- `college-logos`
- `college-covers`
- `college-resources`

Recommended limits/conventions from code:

- images: max 5MB
- resources: max 25MB
- paths are stored as `<collegeId>/<timestamp>-<safeFileName>`

If you decide to make resources private instead, you must also update `src/lib/college/storage.ts` and every reader to use signed URLs. Do not silently switch to private without code changes.

## Other Migrations That May Still Be Pending

Inspect Supabase migration history and apply any missing project migrations safely. Especially check these recent local migrations:

- `supabase/migrations/20260711110000_prompt5_ai_vision_voice_research_project_offline.sql`
- `supabase/migrations/20260711123000_platform_settings.sql`
- `supabase/migrations/20260711124500_demo_test.sql`
- `supabase/migrations/20260711130000_college_portal.sql`
- all `database/migrations/*.sql`
- all remaining `supabase/migrations/*.sql`

If a migration is partially already applied, make an idempotent/safe adjustment. Do not duplicate policies/indexes blindly if Supabase reports they already exist.

## Regenerate Supabase Types

After migrations are applied, regenerate the exact generated types file used by this app:

```bash
npx supabase gen types typescript --project-id <PROJECT_ID> > src/lib/supabase/database.types.ts
```

The app imports `src/lib/supabase/database.types.ts`. Do not only update `src/types/database.types.ts`.

After regenerated types are in place, inspect whether the temporary `as any` compatibility casts in these college files can be removed cleanly:

- `src/hooks/useCollegeStatus.ts`
- `src/lib/college/access.ts`
- `src/lib/college/queries.ts`
- `src/lib/college/actions/*.ts`

Removing them is optional if it risks churn, but final build/typecheck must pass.

## Current Verification Results From Codex

Codex ran:

```bash
npm run typecheck
npm run build
```

Latest result:

- Next production compile succeeded.
- College module TypeScript errors were cleared.
- `npm run typecheck` still fails because generated Supabase types are stale/missing many previous migrations.
- `npm run build` reaches lint/type validation, then fails on existing lint errors outside the college module.

The most immediate non-college build errors are in:

`src/components/features/parent/ParentDashboardClient/index.tsx`

Next.js reports:

- line around 308: `<a>` navigates to `/subscription/`
- line around 332: `<a>` navigates to `/subscription/`
- line around 346: `<a>` navigates to `/subscription/`
- line around 381: `<a>` navigates to `/subscription/`

Fix these by importing `Link` from `next/link` and replacing internal subscription anchors with `<Link href="/subscription">...</Link>`. Preserve styling and behavior.

There are many `no-explicit-any` warnings across the project. Warnings alone are not the current hard build blocker unless your Vercel config treats them as fatal. Fix only what is needed to pass build unless a small local cleanup is obvious.

## College Portal Manual Verification Checklist

After Supabase work and deploy, verify these flows:

1. Public college browsing:
   - `/colleges` loads without login.
   - Search by name/city works.
   - `/colleges/[slug]` shows public profile with locked preview counts.

2. Super admin:
   - `/admin/colleges` appears in admin sidebar.
   - Super admin can create college.
   - Super admin can edit name, slug, city, description, logo, cover.
   - Super admin can activate/deactivate college.
   - Super admin can assign/reassign/remove a college admin by existing user email.

3. Student request:
   - Logged-in student can request to join a college.
   - Student cannot hold multiple pending/approved college requests.
   - Student sidebar shows pending college state when relevant.

4. College admin:
   - Assigned college admin can open `/college-admin`.
   - Non-assigned users cannot manage a college.
   - Admin can see pending requests.
   - Admin can approve/decline requests.
   - Approving sets the student's `profiles.college_id`.

5. Student dashboard:
   - Approved student can open `/college/dashboard`.
   - Student sees only their approved college's lectures/resources.
   - Sidebar "My College" points to `/college/dashboard`.

6. Lectures/resources:
   - College admin can add/edit/delete lecture links.
   - Lecture video URL validation allows YouTube and Google Drive.
   - College admin can upload notes/past papers/slides/other resources.
   - Uploaded resources render through the public `college-resources` URL.

7. Realtime behavior:
   - When admin approves a request, the student's college status updates without needing a manual refresh if the student session is open.

## Final Required Claude Actions

1. Pull/inspect the latest project code from Google Drive/Vercel source if needed.
2. Apply all missing migrations safely.
3. Create/verify all required Storage buckets:
   - private: `vision-scans`, `speaking-practice-audio`
   - public: `college-logos`, `college-covers`, `college-resources`
4. Regenerate `src/lib/supabase/database.types.ts`.
5. Fix the known parent dashboard internal `<a>` to `<Link>` build errors.
6. Run:

```bash
npm run typecheck
npm run build
```

7. Fix only remaining integration/build errors needed to pass.
8. Deploy to Vercel.
9. Report:
   - migrations applied
   - buckets created/verified with public/private status
   - whether `database.types.ts` was regenerated
   - final typecheck result
   - final build result
   - Vercel deployment URL
   - any remaining manual steps
