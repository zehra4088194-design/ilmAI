# Multi-Language Support (i18n) — Implementation Docs

**Module:** Module 1 — Multi-Language Support (English / Urdu / Hindi)
**Date:** 2026-07-05
**Scope:** Navbar, Login/Register, Dashboard greeting, Pricing page, Settings tabs, common buttons/toasts

---

## 1. Approach

Used a **lightweight, cookie-based i18n system** instead of `next-intl`'s URL-prefixed routing (`/en/...`, `/ur/...`). Reasons:

- The app's route structure (marketing, auth, dashboard, admin, parent) is already established. Adding a locale prefix would mean restructuring every existing route.
- A cookie (`NEXT_LOCALE`) is readable by **both** server components (via `next/headers` `cookies()`) and the client (via `document.cookie`), so the initial server-rendered paint already matches the saved preference — no flash of the wrong language.
- Keeps translation keys simple, typed (via the JSON import), and easy to extend incrementally.

**Locales supported:** `en` (English), `ur` (Urdu, RTL), `hi` (Hindi).

---

## 2. New Files

| File | Purpose |
|---|---|
| `messages/en.json` | English translation dictionary |
| `messages/ur.json` | Urdu translation dictionary (RTL script) |
| `messages/hi.json` | Hindi translation dictionary (Devanagari script) |
| `src/lib/i18n/config.ts` | Locale list, `DEFAULT_LOCALE`, `LOCALE_COOKIE_NAME`, RTL check (`isRtl`), locale validation (`isValidLocale`), country→locale defaults (`COUNTRY_LOCALE_DEFAULTS`: `PK`→`ur`, `IN`→`hi`), `LOCALE_LABELS` for the switcher UI |
| `src/lib/i18n/translations.ts` | Imports the three JSON dictionaries into a typed `MESSAGES` map; exports `getMessages(locale)` |
| `src/providers/I18nProvider.tsx` | Client-side React context. Exposes: `useTranslations()` → `t(key, fallback?)` string lookup by dot-path (e.g. `t('auth.login.title')`); `useMessages()` → full typed messages tree (used where an array is needed, e.g. pricing features); `useLocale()` → `{ locale, setLocale }`. `setLocale` writes the `NEXT_LOCALE` cookie (1 year, `path=/`) and calls `router.refresh()` so server components (e.g. root layout's `lang`/`dir`) pick up the change too. |
| `src/components/ui/LanguageSwitcher/index.tsx` | Dropdown switcher (English / اردو / हिन्दी), styled like the existing `ThemeToggle` pattern |
| `src/components/ui/dropdown-menu.tsx` | **Bugfix, not new i18n work:** this Radix dropdown-menu wrapper was referenced by the existing `ThemeToggle` component but never actually existed in the project. Added the standard shadcn-style wrapper (`@radix-ui/react-dropdown-menu` was already a listed dependency) so both `ThemeToggle` and the new `LanguageSwitcher` work. |

---

## 3. Updated Files

| File | Change |
|---|---|
| `src/app/layout.tsx` | Now an `async` server component. Reads `NEXT_LOCALE` from `cookies()`, falls back to `en` if missing/invalid, and sets `<html lang={locale} dir={isRtl(locale) ? 'rtl' : 'ltr'}>`. Passes `locale` down to `<Providers>`. |
| `src/middleware.ts` | Locale middleware historically used a hosting country header. The Oracle deployment now uses the reverse-proxy `x-country-code`/`cf-ipcountry` behavior exposed by `/api/geo`; explicit language choices still take priority. |
| `src/providers/index.tsx` (`Providers`) | Now accepts a `locale` prop and wraps children in `<I18nProvider initialLocale={locale}>`, nested outside `ThemeProvider`. |
| `src/components/features/landing/Navbar/index.tsx` | Nav links (`Features`, `Boards`, `Pricing`, `Blog`) and CTA buttons (`Login`, `Get Started Free`, `Dashboard`, `Start Free`) now pulled from `t('navbar.*')`. `<LanguageSwitcher />` added to both the desktop bar and the mobile header (next to the menu toggle). |
| `src/components/layout/DashboardNavbar/index.tsx` | `<LanguageSwitcher />` added next to the existing theme toggle button. |
| `src/components/features/auth/LoginForm/index.tsx` | Title, subtitle, "or with email", input placeholders, "Forgot password?", submit button, and the "Don't have an account? Register" line all translated via `t('auth.login.*')`. |
| `src/components/features/auth/RegisterForm/index.tsx` | Title, subtitle, Student/Parent toggle labels, input placeholders, Board/Grade labels & placeholders, password placeholders, submit button (student vs. parent variant), and "Already have an account? Login" all translated via `t('auth.register.*')`. Board/grade auto-detect logic (via `/api/geo`) unchanged. |
| `src/components/features/dashboard/WelcomeSection/index.tsx` | Time-based greeting (`Good Morning/Afternoon/Evening`), subtitle, and streak copy translated via `t('dashboard.*')`. |
| `src/components/features/landing/PricingSection/index.tsx` | Heading, subtitle, Monthly/Annual toggle, "Save 20%" badge, and — per plan — name, badge, CTA, and feature list are all pulled from `messages.pricing.plans.{free,pro,elite}` via `useMessages()`. Prices/colors/hrefs stayed in a local `PLAN_META` map since those aren't language-dependent. |
| `src/components/features/settings/SettingsTabs/index.tsx` | Tab labels (`Profile`, `Parent Link`, `Notifications`, `Security`, `Appearance`) translated via `t('settings.tabs.*')`. Added a **new "Language" tab** (`Languages` icon) with three buttons (English / اردو / हिन्दी); clicking one calls `setLocale()` and shows a success toast. Existing profile/parent-link logic untouched. |

---

## 4. Translation Key Structure (`messages/*.json`)

```
common:      save, saving, cancel, loading
navbar:      features, boards, pricing, blog, login, getStartedFree, dashboard, startFree
auth.login:      title, subtitle, orEmail, emailPlaceholder, passwordPlaceholder,
                 forgotPassword, submit, noAccount, registerLink
auth.register:   title, subtitle, student, parent, orEmail, fullNamePlaceholder,
                 emailPlaceholder, boardLabel, boardPlaceholder, gradeLabel,
                 gradePlaceholder, passwordPlaceholder, confirmPasswordPlaceholder,
                 submitStudent, submitParent, haveAccount, loginLink
dashboard:   greetingMorning, greetingAfternoon, greetingEvening, subtitle,
             dayStreak, keepItUp
pricing:     title1, titleHighlight, titleSuffix, subtitle, monthly, annual,
             save20, perMonth, plans.{free,pro,elite}.{name, badge, cta, features[]}
settings:    tabs.{profile, parentLink, notifications, security, appearance, language},
             language.{title, description, saved}
languageSwitcher: label
```

More keys can be added incrementally under the same nesting — `t()` resolves any dot-path against the active dictionary and falls back to the raw key (or an explicit fallback string) if a key is missing, so partial translation never crashes the UI.

---

## 5. How Locale Selection Works End-to-End

1. **First visit, no cookie:** `middleware.ts` inspects the country header and sets `NEXT_LOCALE` to `ur` (Pakistan), `hi` (India), or `en` (everywhere else).
2. **Every page load:** `src/app/layout.tsx` (server) reads that cookie and renders `<html lang dir>` correctly from the first byte — Urdu pages are RTL with no flash of LTR.
3. **`I18nProvider`** picks up the same `initialLocale` and makes `t()` / `useLocale()` available to client components.
4. **Switching language** (navbar dropdown or Settings → Language tab) calls `setLocale()`, which updates the cookie and calls `router.refresh()` — client text updates immediately, and the next server render (including `<html dir>`) matches too.
5. **Reload:** the cookie persists (1 year, `path=/`), so the choice survives across sessions.

---

## 6. Known Limitations / Left Incomplete

- Only the six areas listed in the task spec are translated. Other pages (AI Tutor, MCQ practice, Past Papers, etc.) will still render English text until keys are added for them.
- Went with the cookie-based custom provider instead of `next-intl` — flag if real `next-intl` URL routing is wanted instead; that would be a larger follow-up change touching every route.
- Urdu and Hindi copy is a first-pass machine/human translation and has not been reviewed by a native speaker for tone or idiom.
- `next-intl` package itself was **not** installed — not needed for this approach.

---

## 7. Duplicate Files From This Session — Manual Cleanup Needed

Google Drive cannot overwrite a file in place, so every edit created a new `index.tsx` (or `layout.tsx` / `middleware.ts`) alongside the old one. **Delete the older copy in each of these folders** (keep the most recently created file, dated 2026-07-05):

- `src/providers/index.tsx` — delete the copy from `2026-07-02`
- `src/app/layout.tsx` — delete the older copies (there were two pre-existing ones plus one broken retry from this session with a `$${adsenseClientId}` typo — delete both older ones and the typo'd one; keep only the final corrected version)
- `src/middleware.ts` — delete the copy from `2026-07-02`
- `src/components/features/landing/Navbar/index.tsx` — delete the older copy
- `src/components/layout/DashboardNavbar/index.tsx` — delete the older copy
- `src/components/features/auth/LoginForm/index.tsx` — delete the older copy
- `src/components/features/auth/RegisterForm/index.tsx` — delete the two older copies (one used an outdated `studentClass`/`CLASS_OPTIONS` schema that doesn't match the current `profiles.board`/`grade_level` columns — delete that one too, regardless of date)
- `src/components/features/dashboard/WelcomeSection/index.tsx` — delete the older copy
- `src/components/features/landing/PricingSection/index.tsx` — delete the older copy
- `src/components/features/settings/SettingsTabs/index.tsx` — delete the older copy
- Empty stray folder `src/components/LanguageSwitcher` — this was created one level too high by mistake before the correct one was made at `src/components/ui/LanguageSwitcher`. Safe to delete; it's empty and not referenced anywhere.

---

## 8. Migrations & Environment Variables

- **Database migrations:** none. No new tables or columns were introduced.
- **Environment variables:** none. Locale detection can use the same `x-country-code` / `cf-ipcountry` headers already used by `/api/geo`.
