# ilm AI — Project Overview & Functional Walkthrough

> **Purpose:** a single reference so any AI assistant or developer can understand not just
> *where* code lives, but *how each major feature actually works end-to-end* — UI trigger → API
> route → lib functions → external services/DB → response. Keep this updated when a feature's
> real flow changes.

---

## PART A — Deployment, Stack & Repo Structure

### A1. What this project is

**ilm AI** (`studyverse-ai`) is an AI-powered study platform for Pakistani students
(Matric/Intermediate boards, university), plus parents, teachers, school principals/admins, and
college/university admins. Next.js 15 (App Router) + Supabase, self-hosted via **Coolify** on an
Oracle Cloud ARM64 VM, live at **ilmai.study**. Repo: `github.com/zehra4088194-design/ilmAI`.

UI supports `en`, `ur`, `hi`, `roman-ur` (`messages/*.json`, `src/lib/i18n/`). Core pillars: AI
tutor/chat, exam practice (MCQs, past papers, guess papers, full tests), flashcards, notes,
OCR-based question scanning, library of textbooks/resources, planner, gamification, and
institutional ERP modules (attendance, fees, classes) for schools/colleges/universities.
Monetization: **FREE/PRO/ELITE** tiers for individuals, plus per-student institutional billing.

### A2. Deployment topology (production)

```
ilmai.study → Traefik (Coolify-managed TLS/Let's Encrypt)
  └── Docker Compose stack on Oracle VM (217.142.188.213, ARM64, user `ubuntu`)
        ├── web         Next.js app, port 3000, only service with a public domain
        ├── ai-gateway   Node multi-provider AI router, port 8787 (internal only)
        ├── ocr          Python Tesseract OCR service, port 8000 (internal only, sandboxed)
        ├── valkey       Redis-compatible cache, port 6379 (internal only)
        └── cron         pings web's /api/cron/* routes on a timer (internal only)
Supabase (managed, external) — Postgres + Auth + Storage
Cloudflare R2 / Backblaze B2 (3 separate buckets) — object storage
Firebase Cloud Messaging — push notifications
```

- **Coolify** (self-hosted PaaS, its own `coolify` container + `coolify-db` Postgres) builds from
  the root `Dockerfile` + `docker-compose.oracle.yml` on every push to `main`.
- **Deployment log gotcha:** the web-UI-exported `error.txt` can strip the real exception message.
  When a deploy fails opaquely, query Coolify's own DB directly:
  `application_deployment_queues.logs` (JSON column) has the un-redacted log.
- **Docker BuildKit fix applied:** the default `docker` buildx driver allows only one gRPC
  connection to the daemon — under concurrent multi-service builds + Coolify's healthcheck
  polling this threw `"only one connection allowed"` and got BuildKit killed mid-build (exit code
  255). Fixed with a dedicated `docker-container`-driver builder
  (`docker buildx create --driver docker-container --use --bootstrap`), stored at
  `/root/.docker/buildx/` — the exact path Coolify's helper container mounts, so it's picked up
  automatically.
- SSH: `ssh -i oracle-keys/private-key.key ubuntu@217.142.188.213`.
- A second compose file, `docker-compose.free.yml`, supports a cheaper free-tier profile (see
  `docs/FREE_DEPLOYMENT.md`); its cron is replaced by `.github/workflows/free-cron.yml` (GitHub
  Actions, twice daily) instead of the always-on `cron` container.

**Build-time vs runtime env vars:** only `NEXT_PUBLIC_*` vars are Dockerfile build `ARG`s (~23,
inlined into client JS). Every server secret is injected at container **runtime** by
Coolify/Compose — never add server secrets to the Dockerfile.

### A3. Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 15.5 (App Router, Turbopack dev), React 19, TypeScript 5.7 |
| Styling | Tailwind CSS 4, Radix UI, `class-variance-authority`, `framer-motion` |
| State/data | Zustand (`src/store`), TanStack React Query |
| Forms | `react-hook-form` + `zod` |
| Backend | Supabase (Postgres, Auth, RLS, Storage), `@supabase/ssr` |
| AI | Multi-provider gateway (Groq, Grok/xAI, Claude, GPT, Gemini, DeepSeek, local llama.cpp) — `services/ai-gateway` |
| OCR | Self-hosted Tesseract (`services/ocr`) + EasyOCR/OCR.space/QRCodeCat fallbacks |
| Payments | Paddle (global) + PayPro (Pakistan-local) |
| Storage | Cloudflare R2 / Backblaze B2 (3 buckets: primary, presentation-backgrounds, secondary/11-12th library) |
| Push | Firebase Cloud Messaging |
| Search | Algolia (optional) |
| Monitoring | Sentry, PostHog |
| Testing | Vitest (unit), Playwright (e2e) |
| Mobile | Android TWA wrapper (`app/`, Gradle) |
| PWA | `@ducanh2912/next-pwa`, `public/sw.js`, offline support |

### A4. Repository layout (top-level)

```
studyverse-ai/
├── src/                       # main application source
├── services/                  # standalone microservices (own containers)
│   ├── ai-gateway/            # multi-provider AI routing (Node)
│   ├── ocr/                   # Tesseract OCR microservice (Python)
│   └── cron/                  # scheduler pinging web's /api/cron/*
├── database/                  # hand-maintained SQL: functions/, migrations/, rls/, seeds/
├── supabase/migrations/       # canonical Supabase CLI migration history (90+ files)
├── app/                       # Android native wrapper project (Gradle)
├── scripts/                   # maintenance/seeding/bulk-upload scripts
├── docs/                      # architecture & deployment docs
├── messages/                  # i18n JSON (en, ur, hi, roman-ur)
├── public/                    # static assets, PWA manifest/service worker
├── tests/                     # vitest unit + Playwright e2e + security-contract tests
├── data/tutor-knowledge/      # static knowledge fed to the AI tutor
├── Dockerfile                 # web service image
├── docker-compose.oracle.yml  # PRODUCTION compose
├── docker-compose.free.yml    # free-tier compose profile
├── COOLIFY_ENV_VARS.md        # canonical Coolify env var list
└── PROJECT_OVERVIEW.md        # ← this file
```

`src/app/` route groups: `(marketing)`, `(auth)`, `onboarding/`, `(dashboard)` (48 feature
routes), `(admin)`, `school/`, `school-admin/`, `college/`, `college-admin/`, `principal/`,
`schools/`, `colleges/` (public directories), `checkout/`, `kids/`, `demo/`, `p/`, `api/` (55
route groups).

`src/lib/` (52 modules) groups by concern: ERP (`school-erp/`, `college-erp/`,
`institution-directory/`, `institution-payments/`), learning (`learning/`, `diagnostic/`,
`planner/`, `games/`, `gamification/`, `quran/`, `resources/`, `presentation/`), AI
(`ai/`, `digital-twin/`, `insights/`), payments (`payments/`), platform/admin (`admin/`,
`platform-settings/`, `compliance/`, `security/`, `rate-limit/`), infra (`supabase/`, `storage/`,
`redis/`, `cache/`, `email/`, `push/`, `notifications/`, `ocr/`, `pdf/`), auth (`auth/`,
`biometric/`, `branding/`), plus `i18n/`, `offline/`, `kids/`, `search/`.

`src/components/` mirrors this: `features/*` (one folder per domain), `ui/` (shadcn-style
primitives), `primitives/` (animation), `layout/` (shells), `common/` (cross-cutting).

---

## PART B — How Every Major Feature Actually Works

**Index:** [B1 Onboarding](#b1-onboarding--signup--role-assignment--correct-dashboard) ·
[B2 Individual payments](#b2-individual-subscription-payment-studentparentteacheruniversity--upgrade-click-to-unlocked-tier) ·
[B3 Institutional payments](#b3-institutional-payment-schoolcollege--automatic-card-path--manual-verification-path) ·
[B4 AI Tutor/Chat](#b4-ai-tutor--chat--message--ai-response) ·
[B5 OCR/Scan](#b5-ocr--scan-feature--image-upload-to-extracted-textanswer) ·
[B6 MCQ/Papers/Tests](#b6-mcq--past-papers--full-test--guess-paper--four-distinct-mechanisms-not-one-pipeline) ·
[B7 Flashcards](#b7-flashcards--creation-and-spaced-repetition) ·
[B8 School/College ERP](#b8-school--college-erp--attendance-fees-classstudent-management) ·
[B9 Push notifications](#b9-push-notifications-firebase-cloud-messaging--end-to-end) ·
[B10 Biometric attendance](#b10-biometric-attendance-sync--device-to-database) ·
[B11 Cron jobs](#b11-cron-jobs--what-each-one-actually-does-when-it-fires) ·
[B12 Gamification](#b12-gamification--xp-leaderboard-achievements-leagues)

### B1. Onboarding — signup → role assignment → correct dashboard

**Entry points:**
- Email/password signup → `RegisterForm` → Supabase `signUp()` with `user_metadata` (role, board,
  grade_level, education_level, username, gender, `enable_2fa`, and — for a school-join signup —
  `signup_institution_id` + `signup_role_requested`).
- Google/Facebook OAuth signup/login → redirects through Supabase → lands on
  **`src/app/api/auth/callback/route.ts`** (`GET`) — this is the single, critical entry point for
  **every** login/signup (both email-confirm links and OAuth) and is where role/profile creation
  and redirect targeting actually happen. Both providers plug into this same route with zero
  provider-specific branching beyond `isSocialOAuthSignIn` (used only to route a still-incomplete
  profile to `/onboarding/complete-profile`, same as any Google signup always did).
  **Provider setup lives entirely in the Supabase Dashboard** (Authentication → Providers), not in
  this repo's env vars: Google needs a Client ID/Secret there, and Facebook needs a Facebook App
  ID/Secret there (create the app at developers.facebook.com, add the Supabase callback URL
  `https://<project-ref>.supabase.co/auth/v1/callback` under Facebook Login → Settings, and enable
  the `email` permission under Use Cases). A new Facebook app starts in **Development mode**,
  where only added Testers/Developers can log in — it must be switched to **Live** (optionally
  after Facebook's App Review) before real users can sign in with it.

**What `api/auth/callback/route.ts` does, in order:**
1. Exchanges the `code` for a session (`supabase.auth.exchangeCodeForSession`), enforces the
   concurrent-session limit (`enforceSessionLimit`).
2. Reads `existingProfile` (if any) **before** computing anything else — this ordering matters:
   it's how the code tells "brand-new OAuth sign-up" apart from "existing account logging in
   again."
3. Computes `resolvedRole` = `userMetadata.role` (signup wizard's choice) → else
   `existingProfile.role` → else `'student'`. **Fixed bug, explicit in code comments:** a
   `?role=` URL query hint on the OAuth redirect link is only trusted for a **genuinely new**
   profile — for an existing profile it's ignored, because an admin-invited school
   owner/teacher signing in via Google (whose profile already has `role='teacher'` set at invite
   time) was having that hint silently reset their role back to `'student'` on every login.
4. **If no existing profile** → inserts a new `profiles` row: `subscription_tier: 'FREE'`, `xp: 0`,
   `level: 1`, `streak: 0`, `onboarding_step: 0`, plus whatever role/board/grade/gender/education
   level came from signup metadata. Has a fallback insert path if the
   `academic_institution_name`/`_type` columns are missing (`isMissingAcademicInstitutionColumn`
   — handles a schema-migration-lag edge case).
5. **If existing profile** → applies only the diffs that changed (role change, first-time
   board/grade/gender fill-in, username, `onboarding_completed` flip), never overwrites fields the
   user already set.
6. If `resolvedRole === 'parent'` → `ensureParentInvite(userId)` creates a pending
   `parent_student_links` row (`status:'pending'`, `student_id:null`, a `SV-XXXXXX` invite code,
   24h expiry) — idempotent, skips if a still-valid pending invite already exists.
7. If the signup carried `signup_institution_id` + `signup_role_requested` (the "join an existing
   school as student/teacher" path) → calls
   `createInstitutionalJoinRequestFromSignup()` (using the **admin/service-role** client, because
   notifying the org's owner means reading other users' `school_memberships` rows the new user
   can't see under RLS yet).
8. **Redirect targeting priority** (`resolveMembershipRedirect` checked first, overriding
   everything else — another explicit fixed-bug comment: this used to only apply as a last-resort
   fallback, so an admin-invited institution member with no gender/board/grade set got stuck on
   `/onboarding/complete-profile` forever):
   1. Parent-link deep link (`/parent-link/...`) — always honored first, untouched.
   2. **School/college member** (any role — owner/principal/admin/teacher/staff/parent/student) →
      `resolveMembershipRedirect()` sends them straight to their institution portal
      (`/school/...` or `/college/...`), **skipping the generic student onboarding wizard
      entirely** — gender/board/grade/username selection is a K-12-consumer-app concept an
      institution member never needs.
   3. No username yet → `/onboarding/username`.
   4. Google/Facebook/university-education-level signup still missing profile fields
      (`needsProfileCompletion`) → `/onboarding/complete-profile`.
   5. Student role, `onboarding_completed=false` → `/onboarding/class`.
   6. Parent role → `/parent`.
   7. Else → whatever `redirect` query param was requested (default `/dashboard`).
   8. On top of all that: if the signup wizard's "Enable 2-step verification" checkbox was ticked
      (`enable_2fa: true` in metadata, only for a brand-new profile), the destination is wrapped to
      `/settings?tab=security&mfa=start&next=<original destination>` first.

**`/onboarding/complete-profile`** (`src/components/features/auth/CompleteProfileStep/index.tsx`
+ `src/app/onboarding/complete-profile/actions.ts`) — shown when a Google/Facebook/university
signup still has gaps:
- Starts with an **"I am a..." chooser**: Student / Parent / Teacher (principals/new-schools are
  **never** self-service here — always platform-admin-provisioned via `/admin/schools`).
- **Student/university** branch: original degree/program picker — `<Input list="degree-suggestions">`
  + `<datalist>` (free-text search-as-you-type across all degrees, not a fixed 5-option `<Select>`).
- **Parent** branch: lightweight username-only form → server action `completeParentProfile()` →
  sets `role:'parent'`, creates the pending `parent_student_links` invite (mirrors
  `ensureParentInvite`) → redirect `/parent`.
- **Teacher** branch: `<SchoolJoinStep>` sub-component — debounced `/api/schools/search?q=` school
  picker + full-name input → server action `requestSchoolJoin()` → sets `role:'teacher'`, calls
  `createInstitutionalJoinRequestFromSignup()` → redirect `/dashboard` (pending admin approval to
  actually join staff).

**DB tables touched:** `profiles` (read/write, the central account record), `parent_student_links`
(insert), `school_join_requests` (insert, via `createInstitutionalJoinRequestFromSignup`),
`school_memberships`/`college_memberships` (read, via `resolveMembershipRedirect` /
`resolveSchoolRole`/`resolveCollegeRole`).

---

### B2. Individual subscription payment (student/parent/teacher/university) — upgrade click to unlocked tier

**Entry point:** `/subscription` page → tier card → `/subscription/[tier]` (e.g.
`/subscription/pro?family=parent&billing=annual`).

**`src/app/(dashboard)/subscription/[tier]/page.tsx`** (server component):
1. Rejects if already on that tier or higher (`redirect('/subscription')`).
2. Resolves the **price to display**: for the base student plan, reads
   `settings.subscriptionPlans[tier]` (full PKR/USD/annual/features shape from platform admin
   settings). For a `family` (`parent`/`teacher`/`university`) plan, `buildFamilyPlan()`
   synthesizes an equivalent shape from `settings.{parent,teacher,university}Plans[tierKey]`,
   which only stores `{priceUsdMonthly, one limit field}` — annual is always **monthly × 12 ×
   0.8** (20% off), computed here, not stored separately by the admin.
3. Generates a wallet QR (`generatePaymentQR`) for the PKR total (price + flat
   `TRANSACTION_FEE_USD`, converted) — only relevant to the manual-payment tab.
4. Renders `<ManualUpgradePage>` with `paymentAvailability` (from
   `getPaymentAvailability(requestHeaders)` — checks Paddle/PayPro credentials + Play-Store
   consumption-only gating).

**`ManualUpgradePage`** (`src/components/features/subscription/ManualUpgradePage/index.tsx`) has
**two paths**:
- **Automatic card checkout** (real): a button that `fetch('/api/payments/create-session', {
  method:'POST', body: {tier, billingCycle, planFamily} })`.
  - **`src/app/api/payments/create-session/route.ts`** validates `tier`/`billingCycle`/optional
    `planFamily`, calls `provider.createCheckout(...)` on the region-appropriate provider
    (`getPaymentProvider('GLOBAL')` → Paddle, or `'PK'` → PayPro if configured).
  - **`lib/payments/paddle.ts` → `getPriceId(params)`**: if `planFamily` is set and isn't
    `'student'`, looks up `FAMILY_PRICE_IDS[planFamily][tier][billingCycle]` — 12 distinct Paddle
    catalog price IDs (`PADDLE_PRICE_ID_{PARENT|TEACHER|UNIVERSITY}_{PRO|ELITE}_{MONTHLY|ANNUAL}`).
    Otherwise falls back to the original 4 student `PRICE_IDS`.
  - `createCheckout()` posts to Paddle's API, attaches `custom_data: {plan_family, tier,
    billing_cycle, ...}`, returns a hosted checkout URL → client redirects (`window.location.assign`).
  - User pays on Paddle's hosted page → Paddle fires `transaction.completed` to
    **`src/app/api/payments/paddle/webhook/route.ts`**.
  - Webhook `resolveTier(priceId, fallback)` maps the price ID back to `PRO`/`ELITE`. **Fixed
    bug:** the fallback branch used to require `priceId` to be *absent* before trusting
    `custom_data.tier` — a recognized-but-unmapped new-family price ID would fall through and
    silently resolve to `FREE`. Fixed by dropping that condition, plus registering every new
    family price env var into the `PRICE_IDS.PRO`/`.ELITE` `Set`s directly (defense in depth).
  - On success: `profiles.subscription_tier` is updated to the resolved tier. Since
    `subscription_tier` is a **shared column across every account type**, the same PRO/ELITE value
    is interpreted differently at the display layer depending on the profile's `role`/
    `education_level` — there's no separate per-family tier column.
- **Manual payment** (JazzCash/Easypaisa/bank transfer/wallet-QR + WhatsApp confirmation) — same
  `ManualPaymentMethodPicker` component reused across student/parent/teacher/university and
  institution flows; submitting files a claim for a platform admin to manually verify and flip the
  tier by hand. This is the fallback for anyone without a card.

**DB tables:** `profiles` (read tier/board for pricing + gating, write tier on activation),
`subscriptions` (active/trialing/past_due lookup used to gate re-purchase), manual-claim table
(via `submitInstitutionPaymentVerification`-equivalent for individual plans, not detailed further
here — see `lib/institution-payments/actions.ts` for the shared pattern).

---

### B3. Institutional payment (school/college) — automatic card path + manual verification path

**Entry:** institution admin/principal's plan/renewal page renders
`<InstitutionPaymentCheckout>` (`src/components/features/institution-payments/InstitutionPaymentCheckout.tsx`)
with server-precomputed `monthly`/`annual` `{usd, pkr}` prices (never re-derived client-side).

**Path 1 — "Pay $X now by card — activates instantly" (automatic, real charge):**
1. `payNowWithCard()` → `fetch('/api/payments/create-institution-session', {method:'POST',
   body:{billingCycle}})`.
2. **`src/app/api/payments/create-institution-session/route.ts`**: blocks Play-Store
   consumption-only builds, authenticates via `requireSchoolContext('organization.manage')` or
   `requireCollegeContext('organization.manage')`, computes `studentCount` via
   `getActiveStudentCount`, computes the per-student rate via
   `resolveInstitutionPricing(settings, institutionType, billingCycle, studentCount)` (already
   includes volume + annual discounts — **per-student, caller multiplies by count**), calls
   `createInstitutionCheckout(...)`.
3. **`createInstitutionCheckout()`** (`lib/payments/paddle.ts`) uses Paddle's **non-catalog/dynamic
   pricing**: a single `PADDLE_INSTITUTION_PRODUCT_ID` (not a Price ID — one product, price
   computed per-transaction), POSTs to Paddle `/transactions` with an inline `price` object
   (`unit_price` in cents, `billing_cycle: {interval, frequency:1}`) and
   `custom_data: {organization_id, institution_type, billing_cycle, user_id, user_email,
   success_url, cancel_url}`.
4. Principal pays on Paddle's hosted page → `transaction.completed` webhook fires.
5. In the webhook, an **early branch checks `customData.organization_id` +
   `institution_type`** (school|college) **before** the per-user tier logic — kept entirely
   separate paths. If matched → `activateInstitutionBilling({supabase, organizationId,
   institutionType, billingCycle, periodEnd})`:
   - Upserts `school_organization_plan_settings` / `college_organization_plan_settings`
     (`billing_status:'active'`, `renews_on`).
   - Calls `syncOrganizationSchoolGrants` / `syncOrganizationCollegeGrants` — cascades PRO/ELITE
     access to **every active member** of the institution.

**Path 2 — Manual verification (fallback, no card needed):**
- `<ManualPaymentMethodPicker>` (shared component, also used for individual plans and per-invoice
  fees) — JazzCash/Easypaisa/bank transfer/WhatsApp-confirm, plus a scannable QR
  (`/api/payments/institution-qr`) encoding the exact PKR amount due (only for institution
  purchases — regular fee invoices keep a plain text QR since that money goes to the institution's
  own account, not ilm AI's).
- Submitting the form (`submitInstitutionPaymentVerification` server action) creates a
  **pending manual claim** — a platform admin reviews and manually flips `billing_status` to
  `'active'` (same downstream `syncOrganization*Grants` cascade, triggered by hand instead of by
  webhook).

**Historical note (dead code removed):** an older, never-wired fixed-price approach
(`INSTITUTIONAL_PADDLE_PRICE_IDS`, `getInstitutionalPaddlePriceId()`,
`isInstitutionalPaddleConfigured()`) was superseded by the dynamic-pricing design above and
removed after confirming zero call sites. The corresponding unused
`PADDLE_PRICE_ID_INSTITUTIONAL_*` Coolify env vars are optional/blank-default in
`docker-compose.oracle.yml` — harmless if left unset.

**Env vars:** base Paddle (3) + student (4) + parent/teacher/university (12, pattern
`PADDLE_PRICE_ID_{PARENT|TEACHER|UNIVERSITY}_{PRO|ELITE}_{MONTHLY|ANNUAL}`) + institution (1:
`PADDLE_INSTITUTION_PRODUCT_ID`) + manual-payment display vars
(`NEXT_PUBLIC_SCHOOL_PAYMENT_JAZZCASH_NUMBER`, `_EASYPAISA_NUMBER`, `_BANK_DETAILS`,
`_WHATSAPP_NUMBER`). Full list: `COOLIFY_ENV_VARS.md`.

**DB tables:** `school_organization_plan_settings` / `college_organization_plan_settings` (billing
status/renewal), `school_memberships`/`college_memberships` (grant cascade target), plus whatever
table backs `submitInstitutionPaymentVerification`'s manual claims (institution payment
verification queue).

---

### B4. AI Tutor / Chat — message → AI response

**UI trigger:**
- `ChatInput` (`src/components/features/ai-tutor/ChatInput/index.tsx`) — `handleSend()` (Enter or
  send button).
- `ChatInterface` (`src/components/features/ai-tutor/ChatInterface/index.tsx`) — owns the actual
  network call. Optimistically pushes the user message + an empty assistant message to the
  Zustand store, then `fetch('/api/ai/chat', {method:'POST', body:{message, conversationId,
  history: last 10 messages, provider, tier, subject, subjectId, source:'ai_tutor'}})`, reads the
  response as a byte stream, and appends chunks to the assistant message as they arrive.
- Study-Buddies peer chat (`StudentChatClient` → `/api/student-chat/messages`) is a **separate,
  non-AI** feature — human-to-human messages, with AI invoked only for safety moderation every 50
  messages.

**API route — `src/app/api/ai/chat/route.ts`:** `buildSystemPrompt()` assembles: base tutor
persona + subject scoping + Socratic-tutoring rules + (side-chat only) navigation catalog/asker
context + subject-tutor RAG context + a shared `MARKDOWN_ANSWER_FORMAT_INSTRUCTION` (enforces
Markdown/LaTeX structure — headings, Given/Find/Formula/Working/boxed final answer).

**lib/ai/ logic:**
- `lib/ai/request-routing.ts` — `shouldUseLocalSmallTalk()` regex-detects trivial greetings
  ("hi", "salam", "thanks") and returns a **canned, deterministic reply** (hashed by
  userId+message+date) with zero gateway calls — a cost-saving short-circuit checked first.
- `lib/resources/subject-tutor-context.ts` — `buildSubjectTutorContext()`: RAG-style injection.
  Reads pre-baked `.txt`/`.md` files from `data/tutor-knowledge/<subject-slug>/`, scores each by
  keyword overlap, takes top 8 files (≤14,000 chars combined) as `[Tutor knowledge: <file>]`
  blocks spliced into the system prompt — only for `source==='ai_tutor'`.
- `lib/ai/gateway.ts` → `gatewayChat()`: builds a `providerChain` per `routingPolicy`
  (`text`/`tutor`/`presentation` default `[gemini, deepseek]`; `local` forces local-only). The AI
  Tutor route sends `strictProvider:true`, collapsing the chain to just the admin-configured
  provider — cross-provider fallback then happens **inside the gateway's own key rotation**, not
  client-side. Checks `checkProviderDailyLimit()` (platform-wide daily cost cap per provider/tier,
  Redis-backed) before calling out. POSTs to `${AI_GATEWAY_URL}/chat` with
  `Authorization: Bearer AI_GATEWAY_SECRET`, 90s timeout (185s for `local`). Validates the reply
  with `isUsableAiResponse()` (rejects HTML error pages / JSON error bodies / "rate limited"-style
  200-status poisoned successes) before accepting it.

**`services/ai-gateway` internals (`handler.mjs`):**
- Provider+tier → model mapping is a hardcoded table (`DEFAULT_MODEL_MAP`), each cell
  env-overridable (`GROQ_MINI_MODEL`, etc.) without redeploy. Provider *choice* itself is decided
  by the caller (Next.js, via admin-configured routing per feature: `aiTutor`, `sideChat`,
  `studentChatModeration`) — the gateway just executes it plus its own safety-net fallback.
- **Key rotation** (`withKeyRotation()`): each provider (Groq/Grok/Claude/GPT/Gemini/DeepSeek) can
  have up to 20 keys, consumed in strict round-robin via a global per-provider cursor advanced
  **before** the network call (so concurrent requests don't double-claim a key). Retries only on
  `{401,403,429,500,502,503,504}` — a `400` fails immediately (rotating keys can't fix a malformed
  request). An empty successful response also triggers rotation to the next key.
- **OpenRouter** is special-cased: one key, no pool — tries `[openrouter/free,
  deepseek/deepseek-v4-flash]` in order on that single key (30s timeout per call).
- **`local` provider** — calls a self-hosted `llama.cpp` server (`LLAMA_CPP_URL`, 180s timeout),
  strips `<think>...</think>` reasoning tags from output.
- **Gateway-level fallback**: only when `strict_provider` is false, any failed non-Groq provider
  (all its keys exhausted) falls flat to **Groq** as the universal safety net
  (`fallbackTriggered:true`, `originalProvider` echoed back). For AI Tutor/side-chat this is
  **disabled** (they send `strict_provider:true`) — instead ordering across Gemini→DeepSeek etc.
  happens client-side in `gateway.ts`'s `providerChain` loop, one provider's keys fully exhausted
  before moving to the next.
- Verified by `services/ai-gateway/handler.test.mjs` (`npm run test:gateway`): confirms the
  Groq-fallback path and `/ready`'s primary-provider reporting.
- Also serves `/document-scan` (Gemini Vision OCR), `/ocr-space`, `/live/token` (ephemeral Gemini
  Live voice token minting, model/persona locked server-side), `/key-health`, `/ready`.

**Response shape — NOT true token streaming.** `gatewayChat()` is explicitly non-streaming
("necessary for safe key-rotation" per code comment) — the gateway returns the full text in one
response. The Next.js route then **simulates** a stream: chunks the text into 4-char pieces with
an 8ms delay each into a `ReadableStream` (`Content-Type: text/plain`), giving a client-side
"typing" effect. Headers carry `X-Provider-Used`/`X-Fallback-Triggered`. Rendered client-side via
`<AiAnswerRenderer>` (Markdown+LaTeX).

**DB / storage:**
- No server-side persistence of AI Tutor chat transcripts — **entirely client-side**, in a
  Zustand store (`src/store/chat.store.ts`) persisted to `localStorage` (keeps only last 20
  conversations).
- Credits are **not** a Supabase table — `lib/rate-limit/index.ts` implements quotas via Redis
  (`ratelimit:ai_credit:<userId>:week|month:<key>` — FREE tier uses a weekly pool, PRO/ELITE a
  monthly shared pool) with an in-memory fallback if Redis is down. `consumeAiCredits()` deducts 1
  credit for `ai_tutor`/`side_chat`, called only **after** the simulated stream finishes
  successfully (a hard gateway failure before any text exists never charges a credit; a
  client-side abort mid-stream may still have been billed).
- Reads: `profiles.subscription_tier`/`role`/`grade_level`/`education_level` (persona tailoring +
  gating).

**Known fixed bugs / gotchas (from code comments):**
- Groq's `llama-3.1-8b-instant` mini model was decommissioned server-side ("model does not exist")
  — swapped to reuse the medium/pro model as a stopgap, overridable via `GROQ_MINI_MODEL`.
- Presentation Builder / University Hub / File Summary used to double-gate usage with an
  *independent* monthly/weekly action-count cap **on top of** the shared AI-credit pool — could
  block a user who still had credits left. Removed; credits are now the sole usage gate (access
  and size limits, e.g. `presentationSlidesMax`, remain separate concerns).
- Student-chat moderation explicitly does **not** draw from the student's AI-credit pool (it's a
  platform safety cost, not a user-requested tool) — runs only every 50 messages, blocks the chat
  2 days on repeated off-topic detection.
- Gemini Live token endpoint is built against a reverse-engineered REST shape — flagged to
  smoke-test after any deploy since Google's preview models/paths change often
  (`GEMINI_LIVE_MODEL` override needs no redeploy).

---

### B10. Biometric attendance sync — device to database

**Device:** ZKTeco K40/K50-class fingerprint terminals over LAN, via `node-zklib`. Only the
device's numeric `User_ID` + punch timestamp are read — no fingerprint template/image ever enters
the app.

**Connection logic — `src/lib/biometric/zkteco.ts`:** `fetchDevicePunchLogs(ip, port, timeoutMs=
10_000)` opens `new ZKLib(ip, port, timeoutMs, 4000)`, calls `createSocket()` → `getAttendances()`,
maps records to `{deviceUserId, recordTime}`, always `disconnect()`s in `finally`. Device
IP/port/comm-key are registered per-device (default port 4370) via server actions in
`src/lib/biometric/actions.ts` (`createBiometricDevice`) and stored in
`school_teacher_biometric_devices` / `college_teacher_biometric_devices` — not hardcoded.

**Trigger — `src/app/api/cron/biometric-attendance-sync/route.ts`:** `GET`, gated by
`Authorization: Bearer CRON_SECRET`. Iterates both school and college device tables, loops every
registered device, calls `syncDevice()` per device inside its own try/catch (one bad device never
blocks the others). `syncDevice()` re-interprets each punch's wall-clock time into the
institution's real IANA timezone (`reinterpretWallTimeInZone` — node-zklib decodes using the
server process's own local TZ, not the device's/school's). First-ever sync only imports punches
since start-of-today (institution-local); later syncs since `device.last_synced_at`.

**Matching device punches to real people — a mapping table:**
`school_teacher_biometric_mappings` / `college_teacher_biometric_mappings`
(`device_id + device_user_id` unique → `membership_id`), populated by an admin via
`createBiometricMapping()`. Punches with no mapping are silently skipped ("admin hasn't linked
this punch card yet").

**Final attendance tables:** `school_staff_attendance` / `college_staff_attendance`. Punches are
grouped by `membership_id` + institution-local calendar date, tracking min (check-in) / max
(check-out) punch, `upsert`'d with `onConflict:'membership_id,attendance_date'` (idempotent
re-runs). Existing check-in/out times only ever widen, never shrink inward.

**Error handling:** single connection attempt, no retry loop (10s connect timeout, 4s per-command
timeout). On failure, the device row gets `last_sync_status:'error'`,
`last_sync_error: message.slice(0,500)` — surfaced visibly in the admin's Biometric Devices tab.
On success: `last_synced_at`, `last_sync_status:'ok'`, `last_sync_error:null`. Explicit gotcha
noted in code: LAN-local ZKTeco hardware is unreachable from a public cloud host unless
port-forwarded/bridged.

---

### B9. Push notifications (Firebase Cloud Messaging) — end to end

**Token registration:** `lib/push/client.ts` → `enablePushNotifications()`: builds Firebase config
from `NEXT_PUBLIC_FIREBASE_*` env vars, checks `isFirebaseConfigured()`, requests
`Notification.requestPermission()`, registers `public/firebase-messaging-sw.js` (config passed via
the SW registration URL's **query string**, since a service worker can't read `process.env`),
calls `getToken(messaging, {vapidKey, serviceWorkerRegistration})`, then `POST
/api/push/subscriptions`.

**Storage:** `push_subscriptions` table (`id, user_id, token (unique), platform, user_agent,
enabled, last_seen_at`). `POST` (auth'd via Supabase session) validates token length (≤4096) and
`upsert`s on `token`; `DELETE` removes by `user_id` (+optional specific token). RLS: users can
select/delete only their own rows; writes go through the service-role client in the API route.

**Sending — no `firebase-admin` package used at all.** `lib/push/server.ts`'s
`sendPushNotification()` gets an OAuth token via `GoogleAuth` (scoped to `firebase.messaging`) and
POSTs directly to the FCM HTTP v1 REST endpoint
(`https://fcm.googleapis.com/v1/projects/{projectId}/messages:send`).

**Trigger points (two mechanisms):**
1. **Preference-gated pipeline** — `lib/notifications/preferences.ts`'s
   `createNotificationIfEnabled()`/`createNotificationsIfEnabled()` check the user's
   `profiles.notification_preferences` JSON, insert into a `notifications` table, then call
   `deliverPush()` → `sendPushNotification()`. Called from many sites: teacher study reminders
   (`(dashboard)/teacher/actions.ts`), student-chat requests/messages, routine-test alerts, marks
   entry (weak-subject alert), planner reminders/achievements, several `/api/cron/*` routes
   (`weak-subjects`, `study-reminders`, `daily-study-emails`), AI routine reminders, parent
   messages/attachments/invite-accept, school join-request notifications.
2. **Direct call** — `api/cron/school-notifications/route.ts` calls `sendPushNotification()`
   directly (bypasses the notifications-table/preferences layer) for school-wide broadcasts.

**Payload:** `{message:{token, notification:{title, body}, data:{link}, webpush:{fcm_options:
{link}}}}`, sent in batches of 20 via `Promise.all`, 10s timeout per request. Any response
containing `"UNREGISTERED"` marks that token invalid; invalid tokens are bulk-deleted from
`push_subscriptions` after the batch.

**Service worker** (`public/firebase-messaging-sw.js`): initializes Firebase from the query-string
config; no explicit `onBackgroundMessage` handler, so the FCM SDK auto-displays a notification
from the payload's `notification` block when the app is backgrounded. `notificationclick`:
closes the notification, reads the destination link, focuses an existing app window or opens a
new one.

**Graceful fallback when unconfigured:** client-side, missing any of
`NEXT_PUBLIC_FIREBASE_API_KEY/PROJECT_ID/MESSAGING_SENDER_ID/APP_ID/VAPID_KEY` makes
`enablePushNotifications()` return `{status:'unavailable'}` without throwing. Server-side, missing
`FIREBASE_SERVICE_ACCOUNT_JSON_BASE64` or an unresolvable project id makes
`sendPushNotification()` return `{skipped:true}` immediately — the whole function is also
try/catch-wrapped (`console.warn` on error), so a Firebase outage never breaks the underlying
feature (chat/marks/reminders) that triggered the notification.

---

### B12. Gamification — XP, leaderboard, achievements, leagues

**Award functions — `src/lib/gamification/`:**
- `xp.ts` → `awardXp(userId, amount, reason, options)` — clamps amount to `[0,1000]`, calls
  Postgres RPC `increment_xp_and_league(p_user_id, p_amount)` (updates `profiles.xp`/`level` — level
  = `floor(xp/1000)+1` — and the current week's `league_memberships.weekly_xp` in one step), then
  (unless `checkAchievements:false`) chains into `checkAndAwardAchievements`.
- `coins.ts` → `awardCoins(userId, amount, reason, referenceId)` — inserts into
  `coin_transactions`, calls RPC `increment_coins`, triggers achievement check if positive.
- `checkAchievements.ts` → `checkAndAwardAchievements(userId, {source})` — pulls
  `profiles`(xp/streak/coins), all `achievements` definitions, `user_achievements`, this week's
  `league_memberships.weekly_xp`, summed `coin_transactions`, and `boss_quiz_attempts` with score
  ≥80; compares against each achievement's `condition_type`/`condition_value`, inserts newly-earned
  rows into `user_achievements`, and recursively awards each achievement's `xp_reward` via
  `awardXp(..., 'achievement_reward', {checkAchievements:false})`.
- `constants.ts` — concrete amounts: `XP_PER_PLANNER_COMPLETION` 5–80 (scaled by session
  duration/3, clamped), `XP_PER_CORRECT_QUIZ_ANSWER = 2`, `COINS_PER_STUDY_SESSION = 5`,
  `COINS_PER_QUIZ_COMPLETION = 3`, `COINS_PER_BOSS_QUIZ_WIN = 50` (win threshold score ≥80).
  `LEAGUE_TIERS = ['bronze','silver','gold','platinum']`.

**What actually earns XP (concrete call sites):**
- Quiz completion — `api/quiz/complete/route.ts`: `xpEarned = min(100, correctCount × 2)` →
  `awardXp(..., 'quiz_complete')` + `awardCoins(..., COINS_PER_QUIZ_COMPLETION, ...)`, plus an
  `update_streak` RPC call (streak counter only, not XP).
- Planner session completion — `(dashboard)/planner/actions.ts` (`completePlannerSession`):
  XP scaled by session duration (5–80) + `awardCoins(COINS_PER_STUDY_SESSION)`.
- Generic client-triggered — `api/xp/award/route.ts`: authenticated POST, clamps
  client-submitted amount to `[0,100]`, calls `awardXp(..., 'manual_xp_award')` — used by the
  AI-practice-hub UI.
- Achievement unlocks themselves grant XP via `xp_reward`.
- **No explicit "daily login" XP exists** — `profiles.streak` is tracked separately via the
  `update_streak` RPC, independent of XP.

**DB tables:** `profiles` (`xp`, `level`, `streak`, `coins`), `coin_transactions` (ledger),
`achievements` (definitions — e.g. "League Climber": `weekly_xp≥500`→150XP, "Boss Champion":
`boss_quiz_wins≥5`→500XP, "Portfolio Ready": `xp_total≥4000`→150XP), `user_achievements`
(per-user unlocks), `league_memberships` (per-user per-week `tier` + `weekly_xp`, unique on
`user_id, week_start_date`).

**Leaderboard — live query, NOT cached/precomputed.** `api/leaderboard/` route folder exists but
is **empty/dead** — unused. The actual leaderboard is rendered by the server component
`(dashboard)/leaderboard/page.tsx`: queries `league_memberships` live for the current week,
filtered to the user's own tier, ordered by `weekly_xp desc`, limit 80, joined to `profiles`.

**League rollover — the real weekly mechanic**, run via `.github/workflows/free-cron.yml`
(Mondays, `weekly-snapshots` at 01:00:00 UTC then `weekly-league-rollover` at 01:00:10 UTC):
- `api/cron/weekly-snapshots/route.ts` is **not** a leaderboard snapshot — it aggregates the
  week's `study_sessions`/`quiz_sessions` per student into `student_weekly_snapshots`, generates an
  AI narrative per approved `parent_student_links` link, and writes `parent_weekly_reports`.
- `api/cron/weekly-league-rollover/route.ts` is the actual league engine: reads last week's
  `league_memberships` grouped by tier, computes a 10% zone
  (`Math.ceil(members.length * 0.1)`) — top 10% by `weekly_xp` promoted (`tier+1`), bottom 10%
  demoted (`tier-1`), rest stay — then upserts fresh next-week rows with `weekly_xp:0` at the new
  tier. The leaderboard UI mirrors this same 10% math client-side just to visually mark
  promotion/relegation zones.

---

### B11. Cron jobs — what each one actually does when it fires

All gate on `Authorization: Bearer CRON_SECRET`. Confirmed route folders (all exist under
`src/app/api/cron/`), one sentence each:

| Route | What it does |
|---|---|
| `resource-context` | Calls `processQueuedResourceContexts(1)` — OCR/context-extraction worker, processes one queued uploaded resource per run. |
| `school-notifications` | Marks overdue fee invoices, recovers stuck deliveries, queues PTM/fee/absence reminders (deduped), then delivers up to 100 queued `school_notification_deliveries` across in-app/push/email/SMS/WhatsApp. |
| `usd-pkr-rate` | Fetches the live USD→PKR rate from exchangerate-api.com and updates `platform_settings.exchangeRate` — only actually applies it when admin mode isn't `'manual'`, else just records the fetched value for reference. |
| `expire-institution-trials` | Finds school/college orgs whose `trial_ends_at` has passed while still `billing_status:'trial'`, revokes their AI grants (`syncOrganization*Grants(false)`), flips them to `'suspended'`. |
| `student-predictions` | For every student profile (if `aiDecisionFeaturesEnabled()`), calls `computeStudentPredictions()` to regenerate that student's AI performance predictions. |
| `daily-study-emails` | For up to 50 consented profiles, AI-generates (or templated-fallback) a personalized "today's study focus" email + always creates an in-app notification. |
| `weak-subjects` | Computes each user's rolling 14-day avg quiz score per subject; any subject <50% (≥2 attempts, not notified in 7 days) gets a "Focus Area Identified" notification linking to `/practice?subject=...`. |
| `study-reminders` | Notifies students about today's/tomorrow's incomplete `study_plan_sessions` and upcoming (24h) `routine_tests`, deduped against the last day. |
| `storage-cleanup` | Enforces a 48h retention window: deletes old `vision_scans`/`speaking_practice_sessions` + files, migrates old `parent_attachments` to R2 cold storage, archives old chat rows, purges old `notifications`. |
| `biometric-attendance-sync` | See §B10. |
| `search-index` | Rebuilds the Algolia public catalog index (only relevant if `ALGOLIA_ENABLED=true`). |

---

### B8. School / College ERP — attendance, fees, class/student management

College ERP is a **deliberate near-exact structural mirror** of School ERP (own `college_*`
tables, own `lib/college-erp/access.ts`/`actions.ts`/`queries.ts`) — built intentionally
un-shared per `docs/SCHOOL_COLLEGE_SEPARATION_TODO.md` ("code reuse is fine, data/portals stay
separate"; confirmed via grep to have **zero cross-tree imports either direction**). Every
function/route/table below has a `college_*`-prefixed 1:1 counterpart unless noted.

**1. Attendance — two entirely separate subsystems (both exist, not either/or):**

- **A. Student attendance (manual + OCR, day-based)**: Teacher UI `AttendanceRegister.tsx` → one
  row per student in a section, status picker (present/absent/late/excused/leave) → server action
  `saveAttendance()` (`lib/school-erp/actions.ts`, needs `attendance.manage`) → **upserts**
  `school_attendance_records` on `(section_id, student_id, attendance_date)` — one row per day,
  not period-level. Writes an audit row to `school_audit_logs`.
  - **OCR photo-scan path** (distinct from biometric hardware): `AttendanceScanUploader.tsx`
    uploads a photo of a paper register → `POST /api/school-admin/attendance/scan` → runs
    `performOcr()` (handwriting mode, Gemini-only) then a `gatewayChat` pass turning the text into
    structured `{name, rollNumber, status, confidence}` rows, fuzzy-matched against
    `school_enrollments` by roll number then name, returned for teacher confirmation before
    actually saving via `saveAttendance`. Unmatched names → `requestNewStudentAddition()` →
    `school_pending_student_additions` (`status:'pending_principal_approval'`) — approval does
    **not** auto-enroll (comment: `school_admissions` needs guardian info the scan doesn't have).
- **B. Staff attendance — manual AND biometric.** Manual: `StaffAttendanceRegister.tsx` →
  `saveStaffAttendance()` (owner/admin only) → upserts `school_staff_attendance`. Biometric: see
  §B10 — **explicitly staff/teacher-only**, a separate subsystem from student OCR attendance
  ("a different subsystem entirely" per code comment). Platform-wide device management also
  exists at `/admin/biometric-devices` for any school/college.

**2. Fees:**

- **Structure definition**: `createFeeStructure()` → `school_fee_structures`
  (`academic_year_id` required, `class_id` **optional** — can be class-wide or year-wide):
  `fee_type`, `frequency`, `amount`, `due_day`, late-fee config.
- **Billing a student**: separate step, `createFeeInvoice()` → `school_fee_invoices` per
  `student_id` + `academic_year_id`, auto `voucher_number` (`V-<timestamp36>`), `status:'issued'`.
- **Parent/student payment — manual claim, NOT an automated gateway**:
  `FeePaymentCheckout.tsx` (renders outstanding balance, `ManualPaymentMethodPicker`, partial
  "installment" amount allowed up to outstanding) → server action `submitFeePaymentClaim()`
  (`lib/institution-payments/fee-actions.ts`) — re-verifies server-side the caller is the invoice's
  `student_id` or a linked guardian (`school_guardians`/`college_guardians`, never trusts the
  form), validates amount ≤ outstanding, **inserts** into a shared cross-institution table
  `institution_fee_payment_claims` (`status:'pending_review'`) — does **not** immediately mark the
  invoice paid.
- **Admin marking paid — two paths**: (1) `recordFeePayment()` — direct insert into
  `school_fee_payments` for over-the-counter/cash entries (auto `receipt_number:
  R-<timestamp36>`); (2) `reviewFeePaymentClaim()` (`fees.manage`) — on `'verified'`, inserts into
  `school_fee_payments` too (`receipt_number: MC-<timestamp36>`, maps the claim's
  provider-specific method like `jazzcash`/`easypaisa` into the payments table's constrained enum
  `cash|bank|card|wallet|online|adjustment`, preserving the original string in a separate
  `provider` column); on `'rejected'`, only the claim status updates, no payment row created.

**3. Class / student management:**

- Structure: `createCampus()`→`school_campuses`, `createAcademicYear()`→`school_academic_years`
  (unsets any other `is_current` row first), `createSchoolClass()`→`school_classes`,
  `createSection()`→`school_sections` (`homeroom_teacher_id`, `capacity`). Teacher-to-section link
  is via `createSubjectOffering()` → `school_subject_offerings` (`section_id`, `teacher_id`,
  `weekly_periods`) — **no separate `class_teachers`/`class_students` table exists**; enrollment
  and teaching links live on `school_enrollments`/`school_subject_offerings`/
  `school_sections.homeroom_teacher_id` instead.
- **Enrolling a student**: `enrollStudent()` (`admissions.manage`) requires the student to
  **already have an ilm AI profile** (looks up by email, throws if not found) → upserts
  `school_memberships` (role `'student'`) + `school_enrollments` (`onConflict:
  'organization_id,academic_year_id,student_id'`). Enforces a plan-based cap
  (`assertStudentLimit` reads `school_organization_plan_settings.max_students`).
- **Adding staff**: `addSchoolMember()` (`people.manage`) validates role against an allowlist,
  uses `inviteOrFindProfileId()` to find-or-invite, upserts `school_memberships`.
- Guardian linking: `linkGuardian()` → `school_guardians`.
- If `isOrganizationBillingActive()`, `grantSchoolSubscription()` cascades the institution's paid
  plan down to the member's personal consumer subscription on enrollment/membership creation.
- **Join-request flow** (new user → existing school), two entry points into one
  `school_join_requests` table: (1) **at signup** — `createInstitutionalJoinRequestFromSignup()`
  (idempotent, swallows unique-violation as "already requested"); (2) **already signed in** —
  `requestToJoinSchool()`. A **DB trigger**
  (`handle_school_join_request_approval`, migration `20260811090000_school_join_requests.sql`) —
  not app code — actually creates the `school_memberships` row on approval. College currently has
  **no self-serve join/search flow built** (open TODO) — `RegisterForm`'s institutional-signup
  step is hard-wired to the school-only pipeline.

**4. Access control:**
- `requireSchoolContext(permission?, module?)` / `requireCollegeContext(...)` (`lib/school-erp/
  access.ts` / `lib/college-erp/access.ts`) resolve the caller's active `*_memberships` row,
  merged permission set (`ROLE_PERMISSIONS[role]` + per-row override array), and the plan's
  `enabledModules` (via SECURITY DEFINER RPC).
- Server actions also go through `mutationContext(permission, action, module?)` — re-derives
  context, checks permission AND that the module is enabled on the org's plan (so a hidden nav
  item can't be bypassed by a raw POST), applies `checkDailyLimit(userId,
  'erp_mutation:<action>', 500)` — explicitly documented as **not** drawing from the user's
  personal AI-credit pool.
- Permission strings: `dashboard.read`, `organization.manage`, `people.read/.manage`,
  `admissions.read/.manage`, `attendance.read/.manage`, `exams.read/.manage`, `fees.read/.manage`,
  `payroll.read/.manage`, `academics.read/.manage`, `communication.read/.manage`,
  `ptm.read/.manage`, `reports.read`, `audit.read`.
- Roles: `owner, admin, admissions, teacher, staff, accountant, parent, student` — owner/admin get
  everything; teacher gets attendance/exams/academics-manage but not fees/payroll; accountant gets
  fees/payroll-manage but not attendance/exams-manage; parent/student are read-only.
- Cross-institution actions (fee-claim review, biometric device platform-admin access) use an
  explicit OR-gate: platform admin (`requireAdminUser()`) **or** that institution's own
  `organization.manage` context scoped to the matching `organization_id`.

**Fixed bugs / gotchas (from code comments):**
- **Fixed PGRST201 ambiguous-embed bug**: `school_campuses`/`college_campuses` needed an explicit
  FK hint (`!school_memberships_campus_id_fkey`) — a second composite tenant-isolation FK made an
  unqualified embed ambiguous, PostgREST rejected the query, and `getSchoolContext` silently
  swallowed it as "no membership" — **was silently breaking every school-portal redirect for
  every role** until fixed.
- **Fixed**: `collegeAdminHomeForRole()` used to redirect students/parents to `/college` (a route
  with no page) — now `/college/dashboard` (flagged as a stopgap until a proper college
  student/parent portal is built).
- **Fixed**: `DashboardSidebar` was rendering the full consumer nav for parent-role institutional
  members instead of a scoped "My Children"/"Performance & Reports" nav.
- **Flagged, not fixed**: legacy `college_admins` table has `user_id`, but old pre-ERP
  `lib/college/access.ts` queries `college_admins.profile_id` (doesn't exist) — separate open bug
  ticket, unrelated to the new college-erp module.
- **Open TODO**: `school_organizations.organization_type`'s CHECK constraint still allows
  `'college'`, and `/admin/schools`'s create dropdown still offers "College" — a college could
  still be accidentally provisioned as a `school_organizations` row today.
- **Biometric hardware caveat stated plainly**: no physical ZKTeco device was available to test
  an actual `createSocket()`/`getAttendances()` round-trip — code-reviewed against the library's
  contract but not verified end-to-end; devices are LAN-local and unreachable from the cloud host
  without port-forwarding/a relay agent.
- **Cross-org principal messaging** is an explicitly deferred feature — no generic
  chat/conversation infrastructure exists yet for it.

---

### B5. OCR / Scan feature — image upload to extracted text/answer

**Three independent UI surfaces:**
- `VisionScanClient` (`/scan` dashboard route) — full tutoring flow: picks `scan_type`
  (`textbook_page`/`handwritten`/`diagram`/`math`/`chemistry`/`biology`) + language, uploads
  (client-capped 4MB) → `POST /api/vision/scan`.
- `ScanUpload` (reusable modal, 15 importers across the app — chat input, notes, doubt board,
  quiz practice, full-test) — picks `scanKind` (`diagram`/`handwritten`/`printed`) → `POST
  /api/ocr`, hands extracted text back to the host feature via an `onTextExtracted` callback.
- `ServerPdfOcrUploader` — PDF-specific (up to 25MB/30 pages) → `POST /api/pdf-extract`.

**API routes:** all auth via Supabase session + check/consume OCR credits
(`checkOcrCredits`/`consumeOcrCredits` — shared AI-credit pool: `ocr_printed`=1 credit,
`ocr_handwritten`=3 credits) before calling `performOcr()`/`performPdfOcr()` from `lib/ocr/`.
`kind==='handwritten'||'diagram'` sets `mode:'handwritten', geminiOnly:true` — these skip
Tesseract entirely and go straight to Gemini Vision.

**Preprocessing (`lib/ocr/index.ts`):** `validateOcrFile` caps images at 12MB
(jpeg/jpg/png/webp only). `optimizeImageForGemini()` uses `sharp` to EXIF-rotate, resize to
1800×1800 max, grayscale, normalize, then iteratively re-encodes JPEG at quality
[84,74,64,54,44] until under Gemini's 4MB budget.

**Self-hosted Tesseract call (`services/ocr/app/main.py`, FastAPI):**
- Auth via bearer token match on `OCR_SERVICE_SECRET`. Language hard-restricted to
  `{eng, urd}` only (400 on anything else) — the UI's language selector actually only steers the
  Gemini prompt/OCR.space param, not the Tesseract language set, which is always `eng+urd`.
- Image path: Pillow EXIF-transpose, grayscale+autocontrast, upscales small images (<1400px
  wide, max 2×, LANCZOS) before OCR. Shells out to
  `tesseract <file> stdout -l eng+urd --oem 1 --psm 3 --dpi 300` with a `JOB_TIMEOUT_SECONDS`
  watchdog (180s default, kills the process → 504 on timeout). Empty result → 422.
- PDF path: tries native text extraction (`pypdf`) first — if the PDF already has enough visible
  characters, skips OCR entirely (provider `native-pdf`). Otherwise shells out to
  `ocrmypdf --skip-text --rotate-pages --deskew ... -l eng+urd`, re-extracts from the resulting
  searchable PDF (falling back to its sidecar text file if needed).
- Hardened: `read_only:true`, `cap_drop:ALL`, `MAX_FILE_BYTES`=25MB, `MAX_PDF_PAGES`=30,
  `MAX_CONCURRENT_JOBS`=1 (semaphore), decompression-bomb guard on image pixel count.

**External fallback order (`performOcr()` in `lib/ocr/index.ts`, sequential, first success wins,
`fallbackTriggered` flags if a non-primary provider was needed):**
- **Images**: self-hosted Tesseract → EasyOCR (key-pool rotation) → OCR.space (via the AI
  gateway's `/ocr-space`, its own key pool). When `geminiOnly` (handwritten/diagram), this whole
  chain is bypassed — only Gemini Vision (`/document-scan` on the gateway) runs, gated by a
  platform-wide daily budget (`checkProviderDailyLimit('gemini')`).
- **PDFs** (different order, `performPdfOcr`): only self-hosted (OCRmyPDF) + OCR.space are
  candidates (EasyOCR/Gemini are image-only, explicit code comment). OCR.space is only added if
  the file is ≤5MB (its free-tier PDF allowance). A module-level cursor **round-robins which
  provider starts first** per request, so the self-hosted service doesn't always lead.
- **QRCodeCat**: confirmed via exhaustive repo-wide search to have **zero references anywhere** —
  not actually part of the OCR fallback chain (env vars exist but are unused dead config).

**Feeding OCR text to the AI (only `/api/vision/scan` does this — `/api/ocr` and
`/api/pdf-extract` return raw text with no AI follow-up):** after `performOcr()`, if it was a
Gemini document scan (handwritten/diagram), the "explanation" is just Gemini's own generated
`summary` (no second LLM call). Otherwise `resolveAiRoutingProvider('visionOcr')` picks an
admin-configured provider and `gatewayChat()` is called with a step-by-step tutoring prompt
embedding the OCR'd text — result rendered via `<AiAnswerRenderer>`. Chain: **image → OCR
(Tesseract/EasyOCR/OCR.space/Gemini) → extracted text → LLM explanation → shown to student.**

**DB/storage (`/api/vision/scan` only):** private storage bucket `vision-scans`
(`{user.id}/{scanId}.{ext}` path, RLS-scoped to `auth.uid()`), table `vision_scans`
(`student_id, scan_type, image_url, ocr_text, ai_explanation, language, chapter_id`) — row
inserted before OCR runs, updated after with results. Subject to a data-retention cleanup index
(not stored forever — see `storage-cleanup` cron, §B11). `/api/ocr`/`/api/pdf-extract` are
stateless — no DB/storage writes at all.

**Known gotchas / fixed-behavior comments:**
- UI copy on `ServerPdfOcrUploader` says "up to 20 MB" while the server actually enforces 25MB —
  a minor doc/code mismatch.
- Explicit fixed-bug comment in `api/vision/scan/route.ts`: the admin "Vision/OCR" provider
  dropdown previously had **no effect at all** on this route (the raw image→text step is
  hardwired to Gemini) — now correctly scoped to only affect the second explanation-generation
  step.
- Same rate-limit double-gating fix mentioned elsewhere (§B4) applies here too — OCR usage shares
  the same credit-gated (not count-gated) machinery.

---

### B6. MCQ / Past Papers / Full Test / Guess Paper — four distinct mechanisms, not one pipeline

| Sub-feature | Mechanism | Persisted result? |
|---|---|---|
| MCQ Practice (chapter testing, `/practice`) | Pre-seeded `questions` table + cached `resource_mcq_sets` → text-extraction fallback (no LLM) | Yes → `quiz_sessions` via `/api/quiz/complete` |
| Full Test (`/full-test`) | 100% live LLM (`gatewayChat`) | No — client-state only |
| Guess Paper (`/guess-paper`) | 100% live LLM (`gatewayChat`) | No — display-only, ephemeral |
| Resource Quiz (`/resource-quiz`) | Pre-generated `resource_mcq_sets` cache only (background job fills it) | Not tracked as a scored session |
| Resource Test Builder (`/resource-test-builder`) | Cache → text-extraction → LLM (three-tier) | Cached in an AI-artifact cache table, not `quiz_sessions` |
| Past Papers (browse) | Pure DB (`past_papers`, `past_paper_questions`), zero AI | N/A — download/browse only |

**MCQ Practice** (`/mcq` redirects to `/practice` → `AiPracticeHub`): picks subject/chapter/mode
→ `POST /api/ai/generate-quiz` → `generateChapterQuestionPaper()`
(`lib/tests/chapter-question-bank.ts`) queries the pre-seeded `questions` table + the
`resource_mcq_sets` cache (`status:'ready'`); only if short of the requested count does it fall
back to `buildResourceSourceTest()` (`lib/resources/source-fallback.ts`) — **regex/text-extraction
from stored resource text, not an LLM call**. Selection/shuffling via `pickRandomQuestions()`
(Fisher-Yates + difficulty weighting) — "every attempt is rebuilt in fresh random order."
Result stashed in `sessionStorage`, routed to `QuizEngine`. Grading happens **client-side** in
`store/quiz.store.ts`, then `POST /api/quiz/complete` inserts into `quiz_sessions` + `study_sessions`,
awards XP/coins, updates `profiles.total_study_time`, calls RPC `update_streak`, updates chapter
mastery (`lib/learning/mastery.ts`).

**Full Test**: `FullTestEngine` → `POST /api/ai/full-test` → genuine `gatewayChat()` call
(`resolveAiRoutingProvider('studyTools')`) — no DB question bank touched at all. Submission →
`POST /api/ai/grade-test` — also an LLM call (grades short/long answers, re-explains MCQs). **No
DB write for the finished test** — confirmed via grep, no `.insert()` anywhere in this flow —
so Full Test scores never appear on `/results` (which only reads `quiz_sessions`).

**Guess Paper**: `POST /api/ai/guess-paper` → `gatewayChat()` with a "based on historical
patterns and curriculum importance" prompt + a `disclaimer` field — purely predictive preview
content, no answer submission, no grading, no persistence at all.

**Resource Quiz**: `GET /api/resources/questions` reads only the pre-generated `resource_mcq_sets`
cache; if not `status:'ready'`, returns `202 processing` and calls
`queueResourceContextProcessing()` to kick off background generation — never calls an LLM
synchronously.

**Resource Test Builder**: `POST /api/ai/resource-test/generate` — genuine three-tier hybrid:
checks an AI-artifact cache (`lib/ai/artifact-cache.ts`) keyed by resource+counts first; if
missed, tries the same regex text-extraction bank as MCQ Practice's fallback; only calls
`gatewayChat()` if that can't satisfy the requested counts — then merges AI output with extracted
questions and caches the result.

**Past Papers**: `/past-papers` queries the `past_papers` table directly (joined to
subjects/chapters, filtered by board/grade) — a static catalog browse UI, zero AI.
`GET /api/past-papers/intelligence` separately serves curated `past_paper_questions`
("recurring questions" analytics) — also pure DB, zero AI.

**Pre-seeding pipeline** (how `questions`/`resource_mcq_sets` actually get populated):
`scripts/import-question-json.ts` imports ChatGPT-extracted question JSON, matches to
`library_resources` via manifest files, upserts into `resource_mcq_sets` and mirrors into
`questions`. `scripts/bulk-upload-*.ts` scripts upload the underlying PDFs/notes into
`library_resources` (a **separate, standalone Supabase project**, per code comments — accessed
only via service-role clients) that extraction runs against.

---

### B7. Flashcards — creation and spaced repetition

**UI:** `/flashcards` → `DeckGrid` (`components/features/study/FlashcardDeck/DeckGrid/`) lists
decks; `/flashcards/[deckId]/study` → `FlashcardStudyMode` for reviewing one deck.

**Creation flow — AI-generated only, confirmed no manual creation exists anywhere in the UI.**
`POST /api/flashcards/generate` (the active endpoint; `POST /api/ai/flashcards` is an essentially
identical legacy/duplicate route) calls `generateFlashcardsViaGateway()`
(`lib/ai/gateway.ts` — an LLM call), inserts a `flashcard_decks` row, then inserts cards into
`flashcards`. A third creation path: after an Elite-tier Live Voice Call ends
(`/api/voice/session-end`), the transcript is summarized via `gatewayChat()` and any extracted
flashcards are inserted the same way.

**Spaced repetition — implemented, SM-2-style simplified variant, client-side in
`FlashcardStudyMode.tsx`'s `nextSchedule(card, rating)`:**
- Uses `interval`, `ease_factor`, `repetitions` columns on the `flashcards` row.
- Rating buttons: `again` resets `repetitions=0, interval=1`; `hard`/`good`/`easy` increment
  `repetitions` (interval progression 1→3→`interval × ease`), each nudging `ease_factor` by a
  fixed delta (−0.2/−0.05/0/+0.15, floored at 1.3 — the standard SM-2 ease floor).
- `next_review_at = now + max(1, interval)` days, persisted back via
  `.update({...schedule, last_rating})` on every rating.
- New cards seed at `interval:1, ease_factor:2.5, repetitions:0` (standard SM-2 starting ease).
- **Gap found**: the study page fetches **all** cards in a deck ordered by `created_at` — it does
  **not** filter by `next_review_at <= now`, so due-date-based session selection ("only show
  cards due today") isn't actually wired up yet even though the scheduling data is computed and
  stored correctly.

**DB tables:** `flashcard_decks` (`user_id, name, subject_id, cover_color, is_public,
total_cards`), `flashcards` (`user_id, deck_id, front, back, hint, difficulty, next_review_at,
interval, ease_factor, repetitions, is_starred, last_rating`). No dedicated migration file found
for either table — predates the current incremental migration history.


