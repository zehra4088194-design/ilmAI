# CONTINUATION PROMPT 2 — School-Admin Routing, Test Studio PDF, Security Settings, Nav Cleanup
### Paste this whole file into a new Claude Code session, inside the `studyverse-ai` project root.

---

## 0. CONTEXT — READ FIRST

This continues work from `CLAUDE_CODE_MASTER_PROMPT.md` and `CLAUDE_CODE_CONTINUATION_PROMPT.md` (both
still in the repo root — read them for full history). The prior session shipped, in order: college
provisioning, an AI-provider routing bug fix, exchange-rate cron, a mobile popup-clipping fix, a real
login-redirect bug fix (3 separate broken paths), invite-before-signup for principals/teachers, an
Elite/Pro + trial-days billing system, Pakistan school/college/university signup suggestions, a full
University Hub content system, university/teacher nav splits, a Kids Dashboard (under-8), a live Quran
Class video/voice-calling module (LiveKit), an age-first signup branch for young children, and a Class
Library (Class 1+) content system mirroring University Hub. **All of that shipped and is committed —
this file is NOT about redoing any of it.** It's about bugs and gaps the owner found while live-testing
that session's work, reported in one dense burst at the very end of the previous session. Read each
item below carefully — several are genuine confirmed bugs (root-caused already), a few need verification
before you touch anything, and a few are net-new small features.

**Do not re-run a full `npm run typecheck` across the whole repo — it exceeds command time ceilings.**
Use `tsconfig.school-erp.json` / `tsconfig.college-erp.json` (scoped configs) where a file is already
covered; for anything else, write a throwaway `tsconfig.<name>check.json` (extends `./tsconfig.json`,
narrow `include`), run `npx tsc --noEmit -p` against it, then delete it — this was the working pattern
the prior session used successfully for every file outside those two configs' scope. **PowerShell, not
Bash, was the reliable tool for running `npx tsc` in that session** — Bash intermittently lost its PATH
mid-session (grep/npx/ls all started failing with "command not found" for stretches) while PowerShell
never did. If Bash misbehaves, switch to the PowerShell tool immediately rather than retrying Bash.

**One tooling trap from the prior session, worth knowing up front:** the `Grep` tool's `-A`/`-B` context
output rendered some `//` comments and `/` path characters as literal backslashes (`\`) in at least two
separate cases, which looked exactly like real file corruption on first glance and wasted real time
investigating a non-bug twice. **Always re-`Read` the actual file directly before concluding there's a
syntax/corruption issue** — don't trust `Grep`'s context rendering for exact-character verification.

**Also worth knowing:** the Supabase `execute_sql` MCP tool, when given multiple `select` statements in
one call separated by `;`, only reliably surfaced the **last** statement's result in at least one
observed case in the prior session (looked like earlier queries returned nothing, when they'd actually
have returned rows). **Run one query per `execute_sql` call** when the result actually matters, rather
than batching multiple selects together.

---

## 1. PRIORITY 0 — School/college member routing: VERIFY the fix actually landed, don't re-diagnose

The prior session found and fixed a real, confirmed bug in `src/app/api/auth/callback/route.ts` (the
Google OAuth / magic-link callback route): an institution member (school/college owner, admin, teacher,
staff — anyone with an active `school_memberships`/`college_memberships` row) who signed in via **Google**
was being sent through the generic consumer onboarding flow (`/onboarding/complete-profile`, asking for
gender/board/grade — none of which an institution member needs) **instead of** `/school-admin` or
`/college-admin`, because:

1. The membership-redirect check only overrode the *final* "nothing else applies" fallback in the
   destination ternary — every onboarding branch ran first and won.
2. A stray `?role=` URL query hint was overwriting an *existing* profile's real role (e.g. resetting an
   invited school owner's `role` from `'teacher'` back to `'student'`) on every single Google login.

Both are fixed in the current code (see the file's own comments for the exact reasoning — they're
detailed). Confirmed against a real test account's live Supabase data (`salman1fsfgjh@gmail.com` — its
`profiles.role` was manually corrected back to `'teacher'` in the database as part of that fix). **This
was never re-tested end-to-end after the fix, because the owner moved on to reporting a pile of other
issues in the same message.**

**Do this first:**
1. Read `src/app/api/auth/callback/route.ts` in full (the `destination` ternary near the bottom of the
   `if (code)` block) and confirm the fix is intact — `membershipRedirect?.institutionType` should be
   checked immediately after `isParentLinkRedirect`, before any `/onboarding/*` branch.
2. Ask the owner to log in as `salman1fsfgjh@gmail.com` via Google **right now** and confirm they land on
   `/school-admin`, not `/dashboard`, `/teacher/tests`, `/settings`, or anywhere else. If it still fails,
   the bug is not what the prior session thought it was — re-diagnose from scratch using the same method
   (check `auth_logs` via `query_logs`, check the actual `profiles`/`school_memberships` rows via
   `execute_sql`, one query at a time) rather than assuming the existing fix is wrong.
3. Also verify `resolveMembershipRedirect` (`src/lib/auth/resolveMembershipRedirect.ts`) is unchanged from
   what's described above — it's the shared low-level resolver both the callback route and
   `post-login-destination` route call.

---

## 2. A genuinely confusing UX gap the owner hit — clarify or fix

While testing, the owner navigated to generic consumer routes (`/teacher/tests`, `/settings`, `/quran`)
while logged in as a school owner (`salman1fsfgjh@gmail.com`, `profiles.role = 'teacher'`) and saw the
**generic consumer "Teacher Portal" sidebar trim** (Test Paper Studio / Resource Library / Quran Class /
Subscription / Settings — built in `src/components/layout/DashboardSidebar/index.tsx` for any account
with `profiles.role === 'teacher'`, regardless of institution membership) instead of the real School ERP
admin UI (`SchoolAdminSidebar`, with People/Attendance/Exams/Fees/etc.). This is what triggered
**"principal ka alag dashboard kahan hai" (where's the separate principal dashboard) — the owner believed
it was never actually built**, when in fact `/school-admin` already exists and is the real, separate
School ERP dashboard (built in earlier phases, documented in
`docs/SCHOOL_COLLEGE_SEPARATION_TODO.md`) — the owner just never landed on it because of the routing bug
in §1, and instead kept ending up on generic `/dashboard`-family pages where the confusing teacher-trim
nav appears.

**Two things to actually do here, once §1 is confirmed fixed:**

1. **Re-demo to the owner**: once Google login correctly lands on `/school-admin`, walk through it with
   them (or ask them to) so they can see the real ERP dashboard exists and is separate. This may resolve
   the complaint entirely without any code change.
2. **Still worth fixing regardless**: an institution member's `profiles.role` gets set to `'teacher'` by
   design (see `src/lib/auth/mapInstitutionRoleToProfileRole.ts` — deliberately never `'admin'`, for
   security reasons explained in that file's header comment). This means **any** school/college member who
   ends up on a generic consumer route (by directly typing a URL, an old bookmark, browser back-button,
   etc.) sees the "Teacher Portal" consumer trim, which was designed for an *individual* consumer-app
   teacher persona, not an institution member. Decide with the owner: either (a) redirect institution
   members away from generic consumer routes back to their portal at the `(dashboard)/layout.tsx` level
   (stronger, more invasive), or (b) leave it as a low-priority fallback UX (a member should rarely end up
   there once §1's routing is solid) and just fix the specific complaints in §3 below. Don't silently pick
   one — this is a real design decision, ask first if unsure.

---

## 3. Settings tabs shown to a "teacher"-role institution member don't make sense

The owner asked: *"teacher ke dashboard mein Parent Link aur ye Settings ka kya kaam hai"* (why do Parent
Link and [University Mode] Settings tabs make sense on a teacher's dashboard). Looking at
`src/components/features/settings/SettingsTabs/index.tsx`'s `TABS` array: `Profile`, `University Mode`,
`Parent Link`, `Notifications`, `Security`, `Appearance`, `Downloads`, `Language` — all shown
unconditionally regardless of role. `University Mode` (degree/semester self-tagging) and `Parent Link`
(student-to-parent invite code) are both purely consumer-student concepts and make no sense for a
`role === 'teacher'` account (whether that's a real individual teacher or an institution owner/staff
member mapped to `'teacher'`).

**Fix**: filter `TABS` by role — hide `University Mode` and `Parent Link` when `localProfile?.role ===
'teacher'` (mirroring the same kind of role-based UI filtering already used elsewhere in this codebase,
e.g. `DashboardSidebar`'s parent/teacher nav trims). Keep `Profile`, `Notifications`, `Security`,
`Appearance`, `Downloads`, `Language` for everyone.

---

## 4. Password change is missing from Settings entirely

Checked `src/components/features/settings/SettingsTabs/index.tsx`'s Security tab
(`SecuritySettings` component, handles MFA enroll/disable only) — **there is no password-change form
anywhere in Settings.** The only place a user can set a password today is the recovery flow
(`/reset-password`, reached via "Forgot password" or an invite email).

**Build this**: a "Change password" card in the Security tab (or its own sub-section) with current
password + new password + confirm fields, using `supabase.auth.updateUser({ password })` (same call
`/reset-password` already uses — see `src/app/(auth)/reset-password/page.tsx` for the exact pattern).
Supabase's `updateUser` doesn't require re-entering the current password by default (the session is
already authenticated) — decide with the owner whether to add an explicit current-password re-check
(re-authenticate via `signInWithPassword` first) as a stronger UX pattern, since they specifically asked
for extra friction here.

**Also explicitly requested**: if the account has MFA/TOTP enabled (`SecuritySettings` already supports
enroll/disable), **changing the password should require entering the current authenticator code first**,
not just be gated by session auth. This needs a small custom flow: before calling
`supabase.auth.updateUser({ password })` for an MFA-enrolled user, first call
`supabase.auth.mfa.challengeAndVerify(...)` (or equivalent) so the password change can't happen with a
stolen session alone. Check `supabase.auth.mfa`'s API surface in the installed `@supabase/supabase-js`
version before building this — `startMfaEnrollment`/`verifyMfaEnrollment`/`disableMfa` already exist
somewhere in `SettingsTabs/index.tsx` (search for them) as a reference for the exact client calls already
in use in this codebase.

---

## 5. Offer 2-step verification (MFA) at signup time, not just buried in Settings later

Explicitly requested: *"sign-up ke time hi 2-step verification poochh liya karo, recommended ka option
bhi rakho"* — ask about enabling 2FA/TOTP during the signup wizard itself (`RegisterForm`), with a
"Recommended" label, rather than only being discoverable later in Settings → Security.

**Scope this carefully** — TOTP enrollment normally requires showing a QR code and verifying a 6-digit
code, which needs a fully authenticated session to call `supabase.auth.mfa.enroll()`. During the
`RegisterForm` wizard, no session exists yet until the final submit. Two viable approaches:
- **(a)** Add an MFA-offer step immediately **after** `supabase.auth.signUp()` succeeds and a session
  exists (i.e., between account creation and the final redirect) — a "Secure your account" screen with
  "Set up 2-step verification (Recommended)" / "Skip for now" before routing to the normal post-signup
  destination.
- **(b)** A lighter-touch version: just a checkbox during signup ("Enable 2-step verification after
  signup — recommended") that, if checked, redirects to `/settings?tab=security&mfa=start` immediately
  after account creation instead of the normal destination, reusing the existing Settings MFA flow rather
  than building a parallel one in the signup wizard.

(b) is very likely the lower-risk, higher-reuse option — recommend it to the owner but confirm before
building, since it changes the post-signup redirect behavior for anyone who checks the box.

---

## 6. Quran Class nav placement + missing pieces

Three distinct points from the owner, don't conflate them:

1. **"Quran Class ke liye alag se dashboard ho"** — the owner wants Quran Class to feel like its own
   separate section, not lumped into the generic "Teacher Portal" trim
   (`src/components/layout/DashboardSidebar/index.tsx`, the `user?.role === 'teacher'` block — Quran
   Class was added there alongside Test Paper Studio/Resource Library/Subscription/Settings). Consider
   pulling it out into its own labeled sidebar section (e.g. a "Quran Class" heading of its own, same
   visual treatment as the "Teacher Portal"/"Parent Portal" section headers already used in that file)
   rather than being one more link inside "Teacher Portal".
2. **"Jin emails ko main class-teacher ke liye add karoon wo bhi teacher hi hon"** — already correct:
   `addQuranTeacher` (`src/lib/quran/admin-actions.ts`) calls `inviteOrFindProfileId(email, { profileRole:
   'teacher' })`, so a Quran teacher's `profiles.role` is already `'teacher'`. No change needed here —
   just confirmed for the next session so it isn't re-investigated.
3. **"Student ke liye to Quran-class add hi nahi ki"** — checked: `Quran Class` **is** present in the
   student-facing nav (`NAV_GROUPS`'s `Study` section in `DashboardSidebar/index.tsx`, confirmed at the
   line with `{ icon: BookOpenText, label: 'Quran Class', href: '/quran' }`) and in the university-student
   nav variant too. This may have been a caching issue on the owner's end, or they didn't scroll to see
   it, or (less likely) something reverted the edit after the prior session ended. **Verify it's still
   there** before assuming it needs to be re-added — grep `DashboardSidebar/index.tsx` for `Quran Class`
   and confirm all three expected occurrences (`NAV_GROUPS`, `UNIVERSITY_NAV_GROUPS`, teacher-trim) are
   intact.

**Also fixed already, FYI**: `/admin/quran` and `/admin/class-library` had no entries in
`src/components/layout/AdminSidebar/index.tsx` at all — the pages existed but were only reachable by
typing the URL directly. Both were added to `ADMIN_NAV` at the very end of the prior session — verify
they're still there (grep for `'Quran Class'` and `'Class Library'` in that file) rather than re-adding.

---

## 7. Test Paper Studio — PDF/print output has real bugs, needs redesign

`src/components/features/teacher/TeacherTestStudio/TestPaper.tsx` is the component to open first (the
`teacher/tests` page renders it — `src/app/(dashboard)/teacher/tests/page.tsx` →
`TeacherTestStudio/index.tsx` → `TestPaper.tsx`). Four distinct, explicit requests:

1. **"Saare test light theme hi hon, dark theme koi bhi na bane"** — the generated/printed test paper
   must always render in a light theme, regardless of the user's app-wide dark/light preference. Check
   how `TestPaper.tsx` currently themes itself (likely inherits CSS variables from the app shell) and
   force light-mode styling specifically for this component's print/PDF output — same kind of
   `data-theme` override pattern likely already used elsewhere for themed PDF exports in this codebase
   (search for `resolvePdfThemeMode` in `src/lib/platform-settings/shared.ts` — mentioned in the
   platform-settings code the prior session touched, this may already be the right primitive to reuse
   rather than building a new one).
2. **Real bug — content gets cut off**: *"jo test ban raha hai bohot bada hai aur jab save karte hain to
   ek page par jitna aata hai utna hi, baaki cut jaata hai"* — when the test paper is long enough to need
   multiple pages, saving/printing only captures what fits on ONE page; the rest is silently truncated
   instead of flowing onto additional A4 pages. This is very likely a CSS issue — no `page-break-inside:
   avoid` / `break-after` rules, or a fixed-height container with `overflow: hidden` somewhere in
   `TestPaper.tsx`'s print stylesheet, or (if this exports via a headless-browser PDF renderer rather than
   the browser's native print-to-PDF) a renderer viewport/page-size misconfiguration. **Find out first**
   whether this uses the browser's native print (`window.print()` / a `PrintReportButton`-style component
   — search for how `PrintReportButton` works, it's referenced in `docs/SCHOOL_COLLEGE_SEPARATION_TODO.md`
   as the existing reused PDF pattern for report cards) or a server-side PDF generation library, since the
   fix differs completely depending on which.
3. **"Utne pages banaye jitne A4 size ke saath fit aayein"** — the fix for #2: proper multi-page A4
   pagination, not truncation. If this is native browser print, this is mostly a CSS fix (`@page { size:
   A4; }`, removing any fixed/overflow-hidden container, adding sensible `page-break-inside: avoid` on
   individual questions so a question never splits mid-way across a page boundary).
4. **"Designs hon 2-3"** — offer 2-3 selectable visual templates for the test paper, the same pattern
   already built for report cards (`src/components/features/school-erp/report-card-templates/` — 4
   templates: Classic table, Modern card, Grade-focused, GPA-focused, with a template-picker page at
   `/school-admin/exams/report-cards/[examId]`). Mirror that exact pattern for `TestPaper.tsx`: extract
   the current layout into one "Classic" template, add 1-2 more, add a picker.

---

## 8. PDF viewer flicker — full-screen ↔ small-screen rapid toggle

Reported but never diagnosed in the prior session (the owner interrupted themselves to report the routing
bug instead, then never circled back): *"pdf ka full screen aur choti screen hoti hai baar baar, 1 second
mein 5-6 baar"* — a PDF viewer is rapidly toggling between full-screen and a smaller size, many times per
second.

**Start here**: `git status` at the end of the prior session showed
`src/components/features/resources/ProtectedResourceReader/index.tsx` as a locally-modified-but-uncommitted
file (modified by the owner or some other process, not by the prior Claude session) — this is very
likely the component in question, or its sibling `src/components/features/resources/ProtectedPdfViewer/`
(also referenced in earlier git status output that session). Read both. A rapid 5-6-times-per-second
toggle strongly suggests either:
- A `ResizeObserver` callback that itself triggers a state change causing a re-render that changes size
  again (a classic ResizeObserver feedback loop) — look for one in either component.
- A CSS class toggle driven by a `useEffect` with a dependency that changes every render (missing/wrong
  dependency array, or a non-memoized object/function in the deps list causing the effect to refire every
  frame).
- Fullscreen API (`document.fullscreenElement`/`requestFullscreen`) being called inside a render path or
  an effect that re-triggers itself via its own `fullscreenchange` event listener without a guard.

Reproduce it first (open any PDF resource in the app, in the browser preview) before guessing further —
this is a live, reproducible visual bug, not a logic-only one; watch the DOM/class changes in DevTools
while it's flickering to pin down the exact trigger before editing.

---

## 9. Execution order

1. §1 first — verify the routing fix, don't rebuild it blind.
2. §2 — talk to the owner once §1 is confirmed; may not need code changes.
3. §8 (PDF flicker) — independent, reproducible, do this early since it's a pure bug fix with no design
   decisions attached.
4. §3, §6 (nav placement + verify-not-rebuild items) — small, low-risk.
5. §7 (Test Paper Studio) — the largest chunk of new work; confirm the render mechanism (native print vs.
   server PDF) before writing any code, per the note in §7.2.
6. §4, §5 (password change, signup-time MFA offer) — confirm the UX approach with the owner before
   building, per the explicit "confirm before building" notes in each section.

At the end of each numbered section, stop, summarize what was actually built vs. what still needs the
owner's input, and update this file or `docs/SCHOOL_COLLEGE_SEPARATION_TODO.md` — don't let this session's
findings get lost the way it almost happened to the PDF flicker report in the prior one.
