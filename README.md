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

- 🤖 Multi-provider AI (Groq/Claude/GPT/Gemini) with automatic 5-key rotation + silent failover
- 📷 OCR scanning (OCR.space for printed, Gemini Vision for handwritten)
- 🎯 AI Guess Papers, Full Board-Pattern Tests, MCQ Practice with 10s timer
- 📚 Library with Google Drive book links (Local + International)
- 🎓 "Ask a Teacher" doubt board (AI-operated teacher accounts)
- 📅 AI-generated personalized study routines
- 👨‍👩‍👧 Parent Dashboard with weekly progress tracking
- 💬 Site-wide floating AI chat widget
- 💳 Subscriptions (Free/Pro/Elite) via Paddle (International) or PayPro (Pakistan), with Google AdSense on Free tier

## Architecture

```
Browser → Next.js (Vercel) → Cloudflare Worker (AI Gateway) → Groq/Claude/GPT/Gemini/OCR.space
                            → Supabase (Postgres + Auth)
                            → Upstash Redis (rate limiting)
                            → Paddle / PayPro (payments)
```

All AI/OCR provider API keys live **only** in the Cloudflare Worker (`cloudflare-worker/worker.js`), never in the Next.js app itself.

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
# ilmAI
