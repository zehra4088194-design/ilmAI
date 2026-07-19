# Oracle Free-Tier Launch Checklist

Use this short checklist after following `ORACLE_COOLIFY_DEPLOYMENT.md`.

## Supabase migrations

If the last migration you manually ran was `20260717100000_profile_academic_institution.sql`, run these complete files in order:

1. `20260717120000_oracle_runtime_settings.sql`
2. `20260717123000_paddle_plan_prices.sql`
3. `20260717150000_resource_catalog_sections.sql`
4. `20260717163000_regional_billing.sql`
5. `20260717164000_audience_plan_entitlements.sql`
6. `20260717165000_resource_processing_queue.sql`
7. `20260717166000_notification_dismiss_policy.sql`
8. `20260717167000_profile_preferred_language.sql`
9. `20260717168000_subject_condition_baseline.sql`
10. `20260717169000_payment_provider_paypro.sql`
11. `20260719090000_weighted_ai_credits.sql`
12. `20260719100000_resource_mcq_sets.sql`
13. `20260719110000_diagnostic_mastery.sql`
14. `20260719130000_public_resource_catalog.sql`
15. `20260719140000_user_data_retention.sql`
16. `20260719200000_push_subscriptions.sql`

These migrations add Oracle runtime settings, regional billing, audience-specific plan limits, processing queues, diagnostics/mastery, public catalog indexing, two-day transient-data retention, and push subscriptions.

## Coolify

1. Deploy the repository as a Docker Compose resource using `docker-compose.oracle.yml`.
2. Paste every required value from `.env.oracle.example` into Coolify.
3. Attach the public domain only to service `web`, port `3000`.
4. Keep `ai-gateway`, `ocr`, `valkey`, and `cron` private; do not publish ports `8787`, `8000`, or `6379`.
5. Redeploy whenever a `NEXT_PUBLIC_*` value changes because those values are compiled into the browser bundle.

## Smoke tests

```powershell
node scripts/check-env.js
node scripts/check-ai-gateway.js
& 'C:\Program Files\nodejs\npm.cmd' run typecheck
& 'C:\Program Files\nodejs\npm.cmd' test -- --run
& 'C:\Program Files\nodejs\npm.cmd' run build
```

After deploy, verify `/api/health`, one printed scan, one handwritten scan, a protected themed PDF, Summary/Test with and without a companion `.txt`, Parent attachment/chat notification, Study Buddy gender restriction, and Admin plan/provider settings.

## Safe free-tier defaults

- Oracle OCR concurrency: `1` job on the 2-OCPU Always Free VM.
- Claude and GPT platform budgets: `0` until paid credits exist.
- Printed OCR: self-hosted; handwriting: Gemini first, Tesseract fallback.
- Valkey is private and capped at 192 MB with eviction.
- Email Delivery includes a limited monthly allowance; watch the OCI dashboard rather than treating email as unlimited.
