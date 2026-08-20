# Continuation Prompt — Role-Based Signup, Navigation & Pricing Separation

Paste this whole file as your first message in the new Claude Code session.

## Context (read first)

This is "ilm AI" (studyverse-ai), a Next.js/Supabase AI study platform for
Pakistani/Indian students. Repo root: `E:\studyverse-ai - Copy`. Deployed via
Coolify to ilmai.study.

The signup flow already has partial infrastructure for this work — **do not
rebuild from scratch, extend what exists**:

- `src/components/features/auth/RegisterForm/index.tsx` — the signup wizard.
  Already has `membershipMode` (`'individual' | 'institutional'`),
  `accountType` (`'student' | 'parent'` for individual signups),
  `institutionalRole` (`'student' | 'teacher'` for institutional signups),
  `educationLevel` (`'school' | 'college' | 'university'`), and a
  `getSignupSteps()` function that already branches the step list by these
  values (see lines ~180-210). A young-child (<8) branch already exists too
  (`isYoungChild`, `BIRTHDATE_STEP`).
- `src/components/layout/DashboardSidebar/index.tsx` — already has separate
  `NAV_GROUPS` vs `UNIVERSITY_NAV_GROUPS`, chosen by
  `user?.educationLevel === 'university'` (line ~351), and a trimmed
  "Teacher Portal" section gated on `user?.role === 'teacher'` (line ~296).
- `src/lib/auth/mapInstitutionRoleToProfileRole.ts` — maps institutional
  membership roles (`teacher`/`principal`/etc.) to a profile role, currently
  `'teacher' | 'student' | 'parent'` — **does not yet have `'principal'`**.
- `src/app/(dashboard)/parent/pricing/page.tsx` +
  `src/app/(dashboard)/parent/pricing/[tier]/page.tsx` — parent-specific
  pricing already exists, backed by `parentPlans` in
  `src/lib/platform-settings/shared.ts` (`ParentPlanSettings`,
  `DEFAULT_PLATFORM_SETTINGS.parentPlans`, admin-configurable).
- `src/app/(marketing)/pricing/page.tsx` — the general/individual-student
  pricing page (currently shown to everyone who isn't a parent).
- `src/lib/university-hub/*`, `src/app/(dashboard)/university-hub/*` — the
  full University Hub content system (already gated correctly on
  `educationLevel === 'university'` in the nav, per above — verify this
  still holds, don't assume it's fully wired everywhere it needs to be,
  e.g. also check middleware/route guards, not just the sidebar).
- `src/lib/school-erp/*` and `src/lib/college-erp/*` — deliberately SEPARATE
  modules per project convention ("data and portals stay separate, code
  reuse via shared low-level helpers is fine"). Principal/teacher/school-admin
  portal logic lives here.

## What the user wants (verbatim intent, translated from Roman Urdu)

Build a clean, fully-separated **first-step signup chooser** and make sure
every downstream surface (signup wizard steps, navbar/sidebar, pricing) stays
correctly scoped to the choice made — no cross-bleed between roles.

### 1. Signup: first question is "who are you?"

At the very start of individual (non-institutional-invite) signup, before
anything else, ask the user to pick ONE of:

- **Parent** (managing children's accounts)
- **University Student**
- **School / College Student** (one combined choice — school vs college is
  asked as a follow-up detail within this branch, same as today's
  `educationLevel` picker, NOT a separate top-level identity)
- **Institution / Institutional signup** (this is the existing
  `membershipMode = 'institutional'` path) — when chosen, ask a SECOND
  question: **Teacher** or **Principal**? (today only `Teacher`/`Student`
  exists in `institutionalRole` — **Principal must be added** as a distinct
  institutional role, separate from Teacher, with its own downstream
  treatment — see §4 below.)

Note: this is a **restructuring of the existing MODE_STEP + ACCOUNT_STEP /
ROLE_STEP flow**, not a brand new parallel flow. Keep `membershipMode` as
the individual-vs-institutional split, but change what individual mode asks:
instead of (or in addition to) today's `accountType` (`student`/`parent`),
the top-level individual choice should effectively be Parent / University
Student / School-College Student, with School-College Student still leading
into the existing `educationLevel` (`school`/`college`) sub-picker.

### 2. Strict content/step separation by choice

- If **University Student** chosen at signup: skip the K-12-only steps
  entirely — no grade level, no board (Federal/Punjab/etc.), no
  school/college-name autocomplete. Keep whatever university-specific steps
  already exist (program/year selection if any — check
  `src/lib/university-hub/types.ts` for what a university profile needs).
- If **School/College Student** chosen: ask grade/board/institution-name as
  today. University should never be offered as an option to this branch —
  audit `getSignupSteps()` and the education-level picker UI (~line 987-999
  in RegisterForm) to make sure a school/college student can never reach a
  university-only step, and vice versa.
- If **Parent** chosen: keep today's parent flow (no grade/board/institution
  questions — parents link children after signup, not at signup).

### 3. Post-signup navigation must match the chosen identity, permanently

- **University Hub** nav item/section must show ONLY for
  `educationLevel === 'university'` students. Audit beyond just
  `DashboardSidebar` — check any other nav surfaces (mobile nav, command
  palette, dashboard quick-links/cards, search) for a stray University Hub
  link that isn't gated the same way. Grep the whole codebase for
  `university-hub` and `University Hub` link text to find every reference.
- **School/college students must never see University Hub**, anywhere,
  under any circumstance — this was reported as an actual bug before
  (university hub was leaking into a school-affiliated account's nav) so
  treat this as a regression to actively guard against, not just a new
  feature. Add an explicit test/checklist item: sign up as a school student,
  confirm University Hub is absent from every nav surface.
- **Parent** gets the existing parent dashboard nav (verify it's NOT sharing
  `NAV_GROUPS`/`UNIVERSITY_NAV_GROUPS` — parents should have their own nav
  set entirely, check `src/components/layout/DashboardSidebar/index.tsx` for
  how `user?.role === 'parent'` is or isn't currently handled there; if
  there's no dedicated parent nav branch yet in this component, add one).
- **Teacher** (institutional): keep today's trimmed "Teacher Portal" nav
  section (`role === 'teacher'` branch, ~line 296) — verify it does NOT show
  University Hub, parent-linking, or "In settings" items that don't apply to
  a teacher account (this was flagged before as a bug: "teacher ke dashboard
  mein parent link aur settings ka kya kaam hai" — audit
  `src/app/(dashboard)/settings/**` and `SettingsTabs` for role-based tab
  filtering; if it's not already role-filtered, filter it there instead of
  in the sidebar alone).
- **Principal** (institutional, NEW role): needs a nav section scoped to
  **their own school/college's data only** — i.e. whatever
  `school-erp`/`college-erp` admin views exist for viewing the institution's
  students/teachers/classes/activity, surfaced under the principal's own
  nav, not the platform-admin `/admin/*` nav (principal ≠ platform admin).
  Check `src/lib/school-erp/access.ts` and `src/lib/college-erp/access.ts`
  for existing role-based access helpers — extend them for `principal`
  rather than reusing `teacher`'s or `admin`'s access checks. If a principal
  dashboard/portal doesn't fully exist yet (earlier session notes suggest it
  was claimed done but wasn't fully wired), build it properly this time:
  a real distinct dashboard route (e.g. `/school-admin` or similar existing
  convention — check `src/app/(dashboard)/school-admin/**` /
  `college-admin/**` if present) showing that principal's institution's
  data only (their students, teachers, classes — via
  `school_erp`/`college_erp` queries scoped by the principal's
  `institution_id`, never platform-wide).

### 4. Role plumbing for Principal (new role)

- `src/lib/auth/mapInstitutionRoleToProfileRole.ts` — add `'principal'` to
  `InvitableProfileRole` and to the mapping logic (currently only handles
  teacher/student/parent-equivalents — check the actual institution-member
  role strings used in `school_memberships`/`college_memberships` tables,
  e.g. via `mcp__supabase__list_tables` or existing migration files, to see
  what raw role value principal invites already use — likely something
  already exists, e.g. `owner` or `admin`, that needs mapping to a new
  profile-level `principal` role, OR that raw value should just start being
  used consistently — investigate before assuming).
- `profiles.role` — confirm whether the DB/type already allows a
  `'principal'` value (check `src/types/**` for the profile role union type)
  or if it needs a migration + type update. If it doesn't exist, add it
  properly (type union + any DB check constraint via a new migration).
- `resolveMembershipRedirect.ts` (`src/lib/auth/resolveMembershipRedirect.ts`)
  — confirm principal-role users redirect to the principal dashboard on
  login, same pattern as the existing school/college owner redirect logic
  (this file already has `SCHOOL_PORTAL_PREFIXES`/`COLLEGE_PORTAL_PREFIXES`
  — extend as needed for a principal-specific destination if it differs
  from teacher's).

### 5. Pricing must be fully split by identity, with separate env vars

Four distinct pricing contexts, each independently configurable:

1. **University Student pricing** — NEW, does not exist yet. Create a
   dedicated pricing page (e.g. `src/app/(dashboard)/university-hub/pricing`
   or similar — follow the existing `(marketing)/pricing` /
   `(dashboard)/parent/pricing` conventions for where dashboard-scoped vs
   marketing-scoped pricing pages live) and its own platform-settings-backed
   plan config (mirror `ParentPlanSettings`'s pattern in
   `src/lib/platform-settings/shared.ts` — add a `universityPlans` section:
   default plan, paid tier(s), price, and env-var-driven values). The user
   explicitly asked for **separate environment variables** for university
   pricing — check how existing pricing env vars are wired (grep for
   `NEXT_PUBLIC_.*PRICE` or similar in `.env` references / platform-settings
   normalization) and add analogous `UNIVERSITY_*` env vars, documented in
   whatever `.env.example` file exists.
2. **School/College Student pricing** — this is today's existing
   `(marketing)/pricing` page — keep as-is, just confirm it is not shown to
   university students (they should be routed to the new university pricing
   instead) and not shown to parents (they already have their own).
3. **Teacher (institutional) pricing** — NEW, separate from Principal's.
   Same pattern as above: dedicated page + platform-settings section (e.g.
   `teacherPlans`) + its own env vars.
4. **Principal (institutional) pricing** — NEW, separate from Teacher's.
   This is likely closer to today's existing institution/school billing
   config (search for existing "Elite/Pro subscription tier + trial-days"
   institution billing work done earlier this session — grep
   `platform_settings` / admin settings for institution pricing fields
   already present) — a principal signing up an institution should hit
   THIS pricing, not the individual school/college student one. Verify
   whether this already effectively exists under a different name (likely
   yes, from earlier session work) before building a duplicate — if it
   exists, just make sure the new Principal role/signup path routes to it
   correctly, rather than creating a second redundant system.

For all four: after signup, each role must only ever be able to reach their
own pricing page — audit `middleware.ts` / route guards, not just links, so
a teacher can't manually navigate to `/parent/pricing` and see irrelevant
options (or if they can view it, it should redirect them to their correct
one).

### 6. Testing checklist (do this for real, not just code review)

After implementing, walk through each of these as an actual signup (use
Supabase test accounts / the dev environment, not guesses):

- [ ] Sign up as Parent → correct minimal signup steps, lands on parent
      dashboard, sees only parent nav, sees only parent pricing.
- [ ] Sign up as University Student → no grade/board/institution-autocomplete
      steps, lands on dashboard with University Hub visible, sees only
      university pricing.
- [ ] Sign up as School Student → grade/board/school-name steps present, NO
      university step ever offered, University Hub absent from every nav
      surface, sees the existing general pricing page.
- [ ] Sign up as College Student → same as School Student but
      college-name autocomplete, still no University Hub, same general
      pricing page (confirm this is the intended shared page for both
      school+college, per user's wording "school/college student").
- [ ] Institutional signup, choose Teacher → correct trimmed teacher nav (no
      University Hub, no parent-link settings), teacher-only pricing.
- [ ] Institutional signup, choose Principal → new principal dashboard shows
      ONLY their own institution's data, principal-only pricing, correct nav
      (not the platform `/admin/*` nav).

## Process notes carried over from prior sessions (do not skip)

- Use `tsconfig.<name>check.json` ad-hoc scoped configs
  (`npx tsc --noEmit -p tsconfig.<name>check.json`, extending
  `./tsconfig.json` with a narrow `include`, then delete the temp config)
  to typecheck new/changed files before considering a change done.
- Verify DB-level facts (roles, memberships) via
  `mcp__supabase__execute_sql` / `list_tables` rather than assuming from
  code — run ONE query per call (multi-statement calls have unreliably
  returned only the last statement's result before).
- The `Grep` tool's `-A`/`-B` context output has, more than once, rendered
  legitimate `//` or `/` characters as literal backslashes — if a file looks
  corrupted in Grep output, re-`Read` the actual file before concluding
  anything is broken.
- This repo has an external process making parallel "update" commits
  (visible in `git log`) — never revert changes you didn't make yourself
  without first understanding what they did; treat unfamiliar-but-coherent
  diffs as intentional unless proven otherwise.
- Commit in small, reviewable chunks as each numbered section above is
  completed and verified, not as one giant commit at the end.
