# StudyVerse AI

**Pakistan ka #1 AI-Powered Study Platform** — MCQs, AI Tutor, Guess Papers, Full Tests, OCR scanning, Study Routines, Parent Dashboard, aur bahut kuch.

Made with ❤️ by **Hafiz M. Husnain Noor**

## Quick Start

```bash
npm install
cp .env.local.example .env.local   # fill in your values
node scripts/check-env.js          # verify env vars
npm run dev
```

**Full setup instructions:** See `StudyVerse-AI-Deployment-Guide.docx` in the project root — it covers Cloudflare Worker setup, Supabase, Stripe, AdSense, and production deployment step by step.

## Key Features

- 🤖 Multi-provider AI (Groq/Claude/GPT/Gemini) with automatic 5-key rotation + silent failover
- 📷 OCR scanning (OCR.space for printed, Gemini Vision for handwritten)
- 🎯 AI Guess Papers, Full Board-Pattern Tests, MCQ Practice with 10s timer
- 📚 Library with Google Drive book links (Local + International)
- 🎓 "Ask a Teacher" doubt board (AI-operated teacher accounts)
- 📅 AI-generated personalized study routines
- 👨‍👩‍👧 Parent Dashboard with weekly progress tracking
- 💬 Site-wide floating AI chat widget
- 💳 Stripe subscriptions (Free/Pro/Elite) with Google AdSense on Free tier

## Architecture

```
Browser → Next.js (Vercel) → Cloudflare Worker (AI Gateway) → Groq/Claude/GPT/Gemini/OCR.space
                            → Supabase (Postgres + Auth)
                            → Upstash Redis (rate limiting)
                            → Stripe (payments)
```

All AI/OCR provider API keys live **only** in the Cloudflare Worker (`cloudflare-worker/worker.js`), never in the Next.js app itself.

## Project Structure

```
src/app/              Next.js App Router pages + API routes
src/components/       React components (features/, ui/, layout/)
src/lib/               AI gateway client, Supabase clients, utils
database/              SQL migrations, RLS policies, functions, seeds
cloudflare-worker/      AI Gateway Worker source
scripts/                Setup and maintenance scripts
```
# study-verse-ai
