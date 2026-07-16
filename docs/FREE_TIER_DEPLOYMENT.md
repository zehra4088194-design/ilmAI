# Free-Tier Deployment Checklist

This checklist starts after `20260715150000_institution_usage_indexes.sql`.

## 1. Supabase SQL Editor

Run these complete files in this exact order:

1. `supabase/migrations/20260715180000_library_theme_resource_links.sql`
2. `supabase/migrations/20260716120000_gender_private_resource_ai_realtime.sql`

The second migration updates the existing `parent-attachments` bucket to a private 4MB limit. It also adds gender enforcement, protected resource context columns, restricted source-URL grants, and Parent/Study Buddy Realtime tables.

No additional migration is required for provider budgets or storage retention. Provider budgets are stored inside the existing `platform_settings.value` JSON, and retention uses existing tables.

## 2. Cloudflare Worker

Replace the deployed Worker with `cloudflare-worker/worker.js`, then configure:

- `GATEWAY_SECRET`
- `GROQ_API_KEYS_JSON`
- `GROK_API_KEYS_JSON`
- `GEMINI_API_KEYS_JSON`
- `OCR_API_KEYS_JSON`
- `OPENROUTER_API_KEYS_JSON`
- `CLAUDE_API_KEYS_JSON` only when paid credits exist
- `GPT_API_KEYS_JSON` only when paid credits exist

Each pool is a JSON array with up to 20 unique keys. Numbered secrets remain compatible, but JSON pools keep the Worker below the Free plan's environment-variable limit.

## 3. Vercel Environment

Confirm Production has the same values that pass `node scripts/check-env.js`, especially:

- `AI_GATEWAY_URL`
- `AI_GATEWAY_SECRET` matching the Worker's `GATEWAY_SECRET` exactly
- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `CRON_SECRET`
- Supabase URL, anon key, and service-role key

Deploy the app after the Worker. `vercel.json` will register the daily storage-cleanup cron.

## 4. Admin Settings

Open Admin Settings and save once. This persists the normalized plan limits and platform provider budgets. Keep Claude and GPT at 0 unless paid credits are intentionally available. Tune Grok according to promotional credits in its provider dashboard.

## 5. Smoke Tests

Run:

```powershell
node scripts/check-env.js
node scripts/check-ai-gateway.js
node node_modules/typescript/bin/tsc --noEmit
node node_modules/next/dist/bin/next build
```

Then test one printed scan, one handwritten scan, one themed Library PDF, Parent file upload/chat notification, Study Buddy gender restriction, and Admin provider-budget save.

Vercel Hobby is suitable for a private non-commercial beta, not a paid commercial launch. Move to an eligible hosting plan before accepting paid subscriptions in production.
