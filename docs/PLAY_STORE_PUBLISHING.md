# Publishing to Google Play as a Trusted Web Activity (TWA)

Everything you run locally, in order. All the repo-side wiring this depends on already exists — see the
"Already done in the repo" section before you start.

**Do Part A first.** [`docs/OFFLINE_SUPPORT.md`](./OFFLINE_SUPPORT.md) must be shipped and verified on
production before you build the Android wrapper — a TWA has no offline behavior of its own beyond whatever the
site's service worker provides, and Bubblewrap's own install step checks Lighthouse's PWA/installability score.

## Already done in the repo — nothing to edit here

- **`src/app/.well-known/assetlinks.json/route.ts`** — a dynamic route, not a static file. It reads
  `ANDROID_PACKAGE_NAME` and `ANDROID_SHA256_CERT_FINGERPRINTS` from environment variables and serves the
  correct Digital Asset Links JSON automatically (an empty `[]` today, since those variables aren't set yet).
  You never hand-edit a JSON file for this — you only set the two env vars in step 4 below.
- **`src/middleware.ts`** — the `PLAY_CONSUMPTION_ONLY_HOSTS`-gated block already redirects `/checkout` and
  `/pricing` to `/subscription`, and blocks `POST /api/payments/create-session` and
  `/api/institution-plan-inquiry`, whenever the request host matches `PLAY_CONSUMPTION_ONLY_HOSTS`. A comment at
  that block flags that any new institutional-payment route must be added there too.
- **`src/components/features/subscription/SubscriptionPlans`** — already shows "The Play Store app is in
  consumption-only mode" messaging and hides purchase buttons when `paymentAvailability.consumptionOnly` is
  true, so Play Store users land on a clear "manage your subscription on our website" message, not a dead end.
- **`public/manifest.json`** — `start_url`, `scope`, icons (192/512, both `purpose: "any maskable"`), and
  `shortcuts` are already valid; re-check only if you change any of them later.

## 1. Prerequisites

- A JDK (17+) and Node.js installed locally.
- Android SDK — either install Android Studio (recommended, gives you build tools + an emulator for testing) or
  the standalone command-line SDK tools.
- A physical Android device (USB debugging enabled) or an emulator, for `adb install` testing.
- Your Google Play Console developer account (already created).

## 2. Confirm the site is installable

```bash
npx lighthouse https://ilmai.study --view
```

Fix anything failing under the PWA/Installability category before continuing — a TWA wrapping a
non-installable site just gets you a native icon around a broken experience.

## 3. Generate the Android project with Bubblewrap

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://ilmai.study/manifest.json
```

You'll be walked through:

- **Package name** — reverse-domain, e.g. `study.ilmai.app`. **Pick the final one now** — it cannot be changed
  after your first Play Store publish.
- App name, starting URL, theme/background color, icon — Bubblewrap reads sensible defaults from
  `manifest.json`, confirm them.
- **Signing key** — Bubblewrap generates a new `.keystore` (or point it at an existing one if you already have
  one; you don't). **Back this file and its passwords up somewhere safe outside the repo immediately.** Losing
  it means you can never publish an update to this Play Store listing again under the same app.

Bubblewrap prints a `sha256_cert_fingerprints` value at the end of `init` — copy it, you need it next.

## 4. Wire up Digital Asset Links and the Play-only host

Set these environment variables in your production deployment (not in a committed file):

```bash
ANDROID_PACKAGE_NAME=study.ilmai.app          # exactly what you chose in step 3
ANDROID_SHA256_CERT_FINGERPRINTS=AA:BB:CC:...  # exactly what bubblewrap init printed
PLAY_CONSUMPTION_ONLY_HOSTS=ilmai.study        # the exact host the TWA will load — match Bubblewrap's launch URL host exactly (this matcher is exact-match, not pattern-based); use a dedicated subdomain like play.ilmai.study instead if you want to distinguish TWA traffic in analytics
```

Deploy. Then confirm `https://ilmai.study/.well-known/assetlinks.json` returns your real statement (not `[]`)
before building — without this, the TWA falls back to showing browser URL-bar chrome instead of a seamless
full-screen app.

## 5. Build, sideload-test

```bash
bubblewrap build
```

Produces a signed `.aab` (for Play Console) and a `.apk` (for local testing) using the keystore from step 3.

```bash
adb install app-release-signed.apk
```

On the device, confirm:

- The app opens **directly full-screen with no browser address bar**. If the URL bar shows, `assetlinks.json`
  isn't verifying — recheck step 4 (exact package name and fingerprint match, and that the deployed JSON is
  actually live).
- Offline behavior matches what you verified in `docs/OFFLINE_SUPPORT.md`'s checklist — same Chrome engine, same
  service worker, spot-check the same broad set of routes.
- Manifest shortcuts (AI Tutor, Library, Scan) deep-link correctly.
- Push notifications still arrive (Firebase, `public/firebase-messaging-sw.js` — unrelated to the TWA wrapper,
  should just work since it's the same site).
- Visiting `/subscription`/`/checkout` shows the consumption-only messaging, not a live purchase flow.

## 6. Google Play Console

1. **Create the app entry.** Category: Education (matches `manifest.json`). Content rating questionnaire,
   target audience, privacy policy URL (canonical is `/privacy` — `/privacy-policy` redirects to it).
2. **Store listing assets** — capture screenshots from the sideloaded build on a real device/emulator at Play
   Console's required resolutions: app icon, 1024×500 feature graphic, phone screenshots (Play requires at least
   2; aim for 4–8 showing dashboard, AI tutor, library, and a quiz/test screen), short description (≤80 chars),
   full description (≤4000 chars).
3. **Data safety form** — answer accurately based on what the app actually collects/transmits via Supabase
   (auth, profile, academic progress data). Cross-reference `/privacy` for consistency; Google specifically
   checks this against your stated Digital Asset Links + data safety accuracy during first review.
4. **Upload the `.aab`** from step 5 to the **Internal Testing** track first. Install via the internal testing
   link on a real device and re-verify everything from step 5's checklist in the actual Play-distributed
   context (not just your local sideload).
5. Promote **Internal → Closed testing (optional) → Production** through Play Console's normal rollout flow.
   First-time review can take a few days.

## 7. After you're live

Every future website update ships instantly with **no Play Store resubmission** — the TWA just opens the live
site. You only need to build and upload a new `.aab` if you change the manifest, icons, package name/signing,
or app permissions.
