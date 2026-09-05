# Offline Support

How Ilm AI works offline, what's deliberately excluded, and how to verify it before a release.

## How it works

- **Service worker**: generated at build time by `@ducanh2912/next-pwa` (configured in `next.config.ts`), output
  to `public/sw.js` (gitignored — regenerated on every `next build`, never hand-edited). Registered in production
  only by `src/components/features/offline/ServiceWorkerRegister/index.tsx`.
- **App shell / static assets** (`_next/static/*`, fonts, images, CSS/JS): `CacheFirst`/`StaleWhileRevalidate` via
  the plugin's shipped defaults.
- **Page navigations** (every route, including client-side RSC navigations via `next/link`): `NetworkFirst`,
  3.5s network timeout, falls back to the cached copy of that exact page. This is keyed by pathname, not by
  build hash, so it applies to every route automatically — new pages don't need to be added to a list. Falls
  back to `public/offline.html` only when a page has never been cached at all.
- **API routes** (`/api/*`): `NetworkOnly` — never cached. API responses are per-user and often mutations, so
  caching them in a bucket shared by whichever account is signed into the browser would risk leaking one
  account's data to another on a shared device.
- **Downloaded PDFs** (library resources, past papers, college resources): a separate, pre-existing system —
  `src/lib/offline/resources.ts` — stores the actual file bytes as a `Blob` in IndexedDB (`ilm-ai-offline` /
  `protected-resources`), triggered by the "Save in app" button on Library/Past Papers/College Resources cards.
  This is **not** part of the service worker; it satisfies "cached in the PWA's own storage, no device
  filesystem permission" independently. Records are scoped per signed-in user (see below), show a persisted
  "Saved offline" badge once saved, and are managed from `/downloads` (remove individually, clear all, see total
  storage used via `navigator.storage.estimate()`).
- **Per-user scoping**: offline-saved files are keyed by `${userId}:${kind}:${resourceId}:${mode}`. Two Ilm AI
  accounts sharing a browser/device never see or can clear each other's saved files.
- **Offline write queue** (`src/lib/offline/sync-queue.ts`, replayed by `/api/offline/sync`): captures writes a
  user makes while offline and replays them once connectivity returns. Currently covers attendance marking,
  quiz completion, and notes (create/edit — see `src/components/features/notes/NotesGrid` and `NoteEditor`).
  A brand-new note created offline has no server row yet, so it's edited inline in a dialog (client-generated
  uuid, `crypto.randomUUID()`) instead of navigating to `/notes/[id]`, which can't render a note the server has
  never heard of.
- **Offline read mirror** (`src/lib/offline/read-cache.ts`): the WhatsApp-style "whatever you've already seen
  stays on the device" half. `fetchWithOfflineCache(key, fetcher)` wraps any client-side `fetch()`/API call —
  on success it mirrors the response into IndexedDB, on failure it falls back to the last mirrored value for
  that key. Every key must include the signed-in user's id (the cache has no per-user concept on its own).
  Currently used by the presentation builder's saved-history list and individual saved decks
  (`src/components/features/university/PresentationBuilderClient`) — the same call wraps any other
  fetch-then-render list/detail view that should keep working once it's been seen offline.

## What's deliberately online-only

The exhaustive list lives in `src/lib/offline/online-only.ts` (single source of truth — nothing else should
duplicate it). It covers: AI generation (sending a message to AI Tutor, calling AI-powered tools), live
quiz/test-taking (Full Test), vision/OCR (Scan & Solve), voice (Speaking Practice), sending a Study Buddies
message, real-time/push endpoints, and payments/checkout. Anything not listed there is expected to work offline.

AI Tutor and Study Buddies are a deliberate partial exception: the *page* itself is not gated, because past
messages already live on the device (chat.store.ts persists to localStorage; Study Buddies requests/messages
are mirrored via `src/lib/offline/read-cache.ts`) — so browsing history offline works fine. Only the actual
send action is blocked while offline, inline where the send button lives (`useOnlineStatus()` disables it),
rather than hiding the whole page behind `OnlineOnlyGate`.

These surfaces are wrapped in `<OnlineOnlyGate>` (`src/components/features/offline/OnlineOnlyGate`), which shows
the `OfflineNotice` banner in place of the feature when `navigator.onLine` is false, instead of letting it hang
or throw a raw network error. The page shell around them (nav, layout) still loads from the page-navigation
cache if it was visited before.

## Deliberate scope decisions

- **No service-worker caching of Supabase REST/RPC responses.** Several client components call
  `createClient()` from `src/lib/supabase/client.ts` directly (`*.supabase.co`, not proxied through `/api/*`),
  and some open Realtime `wss://` channels. A service worker cannot intercept WebSocket traffic at all, and
  caching cross-origin per-user REST responses in a shared browser cache carries the same cross-account leak
  risk flagged for the offline-downloads store above. Since the app's primary page data is fetched server-side
  and baked into the HTML (dashboard, library, past-papers, results, settings, etc. are all Server Components),
  the `NetworkFirst` page-navigation cache already covers "renders meaningfully offline" for the vast majority
  of the app without this added risk.
- **No separate `ilm-ai-downloads-v1` Cache API bucket.** The pre-existing IndexedDB-based download system
  already satisfies "app-private storage, no device permission" and already had working remove/clear-all UX —
  rebuilding it as a Cache API bucket would be pure churn with no user-facing difference.

## Manual QA checklist (run before every release)

Use Chrome DevTools → Application → Service Workers, and Network → "Offline" throttling.

1. **First visit, then offline reload** — visit a broad spread of routes while online (not just one or two),
   then go offline and reload each one; confirm the page renders from cache rather than showing a browser error:
   `/dashboard`, `/library`, `/library/[subject]`, `/past-papers`, `/results`, `/settings`, `/notes`, `/planner`,
   `/achievements`, `/downloads`, `/progress`, `/leaderboard`.
2. **Saved download, zero network** — on `/library` or `/past-papers`, use "Save in app" on a resource, confirm
   it flips to "Saved offline" immediately and still shows that state after a full page reload. Go offline, open
   it from `/downloads` — it must open with no network requests.
3. **Online-only surfaces show the banner, not a hang** — go offline, then visit `/ai-tutor`, `/scan`,
   `/full-test`, `/student-chat`, `/tutor/speaking-practice`, and `/checkout`: each must show the "internet
   chahiye" banner immediately, never a spinner that never resolves or a raw fetch error in the console.
4. **Two-account isolation** — sign in as account A, save a file offline, sign out, sign in as account B: `/downloads`
   must show zero of account A's files, and "Clear all" as account B must not remove account A's saved files.
5. **Storage usage** — `/downloads` shows a used/available line that changes after saving or removing a file, and
   attempting to save once storage is nearly full surfaces the "Device storage is low" message rather than
   failing silently.
6. **Push notifications unaffected** — confirm `public/firebase-messaging-sw.js` registration
   (`src/lib/push/client.ts`) still succeeds; it's a separate service worker file/registration from `public/sw.js`
   and this work doesn't touch it.
7. **Lighthouse** — `npx lighthouse https://<production-domain> --view`, PWA/Installability category, before
   attempting the Play Store TWA build (see `docs/PLAY_STORE_PUBLISHING.md`).

## Adding a new route

Nothing to do — new pages are offline-capable by default via the pathname-keyed navigation cache. Only touch
`src/lib/offline/online-only.ts` if the new route/API genuinely cannot function offline (live AI generation,
OCR/vision/voice, real-time, or payments) — and wrap its entry point in `<OnlineOnlyGate>` if it's a page.
