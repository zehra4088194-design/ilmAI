# ilm AI

AI-powered study platform for school, college, and university students. It includes structured resources, themed PDF readers, AI tutoring and tests, OCR, parent/student linking, study buddies, subscriptions, and institution reporting.

## Local development

```powershell
& 'C:\Program Files\nodejs\npm.cmd' install
Copy-Item .env.local.example .env.local
node scripts/check-env.js
& 'C:\Program Files\nodejs\npm.cmd' run dev
```

The web app can run without Redis in a single-process development or beta deployment. The private AI gateway and OCR service are required only for features that use them.

## Production architecture

```text
Browser / PWA / future Android wrapper
  -> Oracle Always Free VM + Coolify
     -> Next.js standalone web container
     -> private Node AI gateway with provider rotation/fallback
     -> private Tesseract/OCRmyPDF service
     -> private persistent Valkey
     -> private cron scheduler
     -> managed Supabase: Postgres, Auth, Storage, Realtime
```

The app uses a Node.js standalone Docker image because several API routes require the Node runtime, document libraries, image processing, or server-side file handling. `docker-compose.oracle.yml` starts all five production services on the same private Docker network; only the `web` service receives a public domain.

The current 2 OCPU/12 GB Oracle VM uses one web replica, one OCR worker, strict upload/page limits, and a 4 GB swap file. These limits prevent the OCR worker from exhausting the host but are not unlimited production capacity.

## Optional free-tier services

Supabase remains the source of truth. These integrations are additive and automatically fall back to the existing app behavior when they are not configured:

- Sentry captures application errors with PII, replay, and high-volume tracing disabled by default.
- Firebase Cloud Messaging adds background web notifications and reuses the same token table for the future Android app.
- Cloudflare R2 stores new YouTube thumbnail caches and generated resource context sidecars; existing Supabase Storage objects remain valid.
- Algolia can offload public catalog search. Keep `ALGOLIA_ENABLED=false` until `POST /api/cron/search-index` succeeds with the cron bearer token.
- UptimeRobot needs no SDK. Monitor `/api/health` every five minutes; use `/api/health/ready` as a separate dependency-status monitor.

All of these products have usage-limited free tiers. R2 and some production Algolia account options can require billing details, so provider budget alerts and hard quota controls should be configured before enabling them.

## Deployment

1. In Coolify, create a Docker Compose resource from this repository's `main` branch.
2. Set the base directory to `/` and the compose file to `docker-compose.oracle.yml`.
3. Copy `.env.oracle.example` into Coolify and replace every required placeholder.
4. Attach the HTTPS domain only to service `web`, port `3000`.
5. Keep `ai-gateway`, `ocr`, `valkey`, and `cron` private.
6. Update Supabase Auth Site URL and redirect URLs to the production HTTPS domain.

See [docs/ORACLE_COOLIFY_DEPLOYMENT.md](docs/ORACLE_COOLIFY_DEPLOYMENT.md) for exact setup, migration, and smoke-test steps.

## Data and file safety

Raw AI keys remain only in the gateway secret store. Supabase resource buckets remain private. The OCR service uses a temporary directory and deletes it after every job. Free users read resources through authenticated server routes; no design can make a PDF impossible to capture by a determined browser user, so access checks, short-lived URLs, and watermarking are used instead.

## Main directories

```text
src/app/             Next.js pages and API routes
src/components/      Feature and UI components
src/lib/             AI, OCR, Supabase, payments, limits, and utilities
services/ocr/        Private printed OCR service
services/cron/       Optional local/container maintenance scheduler
cloudflare-worker/   AI gateway source and Wrangler configuration
supabase/migrations/ Database migrations and policies
scripts/             Validation, seeding, and maintenance scripts
```
