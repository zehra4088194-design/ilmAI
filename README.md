# ilm AI

**Pakistan ka #1 AI-Powered Study Platform** — MCQs, AI Tutor, Guess Papers, Full Tests, OCR scanning, Study Routines, Parent Dashboard, aur bahut kuch.

Made with ❤️ by **Hafiz M. Husnain Noor**

## Quick Start

```bash
npm install
cp .env.local.example .env.local # fill in your values
node scripts/check-env.js # verify env vars
npm run dev
```

**Full setup instructions:** See `ilm-AI-Deployment-Guide.docx` in the project root — it covers Cloudflare Worker setup, Supabase, Payments (Paddle/PayPro), AdSense, and production deployment step by step.

## Key Features

- 🤖 Multi-provider AI (Assistant/Claude/GPT/Gemini) with automatic 5-key rotation + silent failover
- 📷 OCR scanning (OCR.space for printed, Gemini Vision for handwritten)
- 🎯 AI Guess Papers, Full Board-Pattern Tests, AI Testing with MCQs, short and long questions
- 📚 Library with Google Drive book links (Local + International)
- 🎓 "Ask a Teacher" doubt board (AI-operated teacher accounts)
- 📅 AI-generated personalized study routines
- 👨‍👩‍👧 Parent Dashboard with weekly progress tracking
- 💬 Site-wide floating AI chat widget
- 💳 Subscriptions (Free/Pro/Elite) via Paddle (International) or PayPro (Pakistan), with Google AdSense on Free tier

## Architecture

```
Browser → Next.js (Vercel) → Cloudflare Worker (AI Gateway) → Assistant/Claude/GPT/Gemini/OCR.space
                            → Supabase (Postgres + Auth)
                            → Upstash Redis (rate limiting)
                            → Paddle / PayPro (payments)
```

All AI/OCR provider API keys live **only** in the Cloudflare Worker (`cloudflare-worker/worker.js`), never in the Next.js app itself.

For protected file tests, configure `GROK_API_KEYS_JSON` in the Worker. The gateway accepts JSON arrays of up to 20 keys through `GROQ_API_KEYS_JSON`, `GROK_API_KEYS_JSON`, `CLAUDE_API_KEYS_JSON`, `GPT_API_KEYS_JSON`, `GEMINI_API_KEYS_JSON`, `OCR_API_KEYS_JSON`, and `OPENROUTER_API_KEYS_JSON`; old numbered secrets remain compatible. PDF/printed OCR uses OCR.space first, while handwritten OCR uses Gemini Vision first; both routes rotate keys and use budgeted cross-provider fallback.

Free-hosted beta safety is enforced in two layers: per-user plans and platform-wide provider budgets under Admin Settings. Upstash Redis is required in production so those counters are shared across Vercel instances. Temporary Vision originals and speaking audio are retained for 7 days, while parent attachments are retained for 30 days by `/api/cron/storage-cleanup`.

## Payments

Payments go through a provider abstraction in `src/lib/payments/` (`provider.ts` defines the interface; `paddle.ts` and `paypro.ts` implement it). The app never imports a payment gateway SDK directly — only `getPaymentProvider()` from `src/lib/payments/index.ts`. See that folder's comments for how to wire up real Paddle/PayPro credentials.

## Project Structure

```
src/app/          Next.js App Router pages + API routes
src/components/   React components (features/, ui/, layout/)
src/lib/          AI gateway client, Supabase clients, payments, utils
database/         SQL migrations, RLS policies, functions, seeds
cloudflare-worker/ AI Gateway Worker source
scripts/          Setup and maintenance scripts
```
