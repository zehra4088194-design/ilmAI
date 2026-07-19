# Oracle and Coolify Deployment

This is the active production deployment path for the Oracle VM. Coolify must
deploy the repository with the Docker Compose build pack, base directory `/`,
and compose file `docker-compose.oracle.yml`.

## Target stack

| Service          | Production role                                                  |
| ---------------- | ---------------------------------------------------------------- |
| Oracle + Coolify | Host and orchestrate the five private Docker services            |
| Node AI gateway  | Provider rotation, timeout, fallback, and empty-response control |
| Valkey           | Private persistent rate-limit and cache state                    |
| Local OCR        | OCRmyPDF, Tesseract, and native PDF extraction                   |
| Supabase         | Managed database, Auth, Storage, and Realtime                    |
| Google Drive     | Source storage behind authenticated proxy routes                 |

The Oracle Always Free Ampere allowance currently provides up to 4 OCPUs and 24 GB RAM across the tenancy, with 200 GB total block volume. Official limits can change, so confirm them before creating the VM: https://docs.oracle.com/en-us/iaas/Content/FreeTier/freetier_topic-Always_Free_Resources.htm

## 1. Prepare Oracle Cloud

1. Create the VM in the tenancy home region.
2. Choose `VM.Standard.A1.Flex`, ARM64, 2 OCPUs, and 12 GB RAM. The compose limits are tuned for this currently provisioned shape.
3. Use Ubuntu 24.04 LTS or 22.04 LTS and a 100-150 GB boot volume.
4. Add an SSH public key and keep the private key backed up.
5. Reserve the public IPv4 address so a VM restart does not change DNS.
6. Create the domain `A` record pointing to that reserved IP.

Oracle network ingress rules:

| Port             | Source                          | Purpose                         |
| ---------------- | ------------------------------- | ------------------------------- |
| 22               | Your own IP where possible      | SSH                             |
| 80               | `0.0.0.0/0` and IPv6 equivalent | HTTP and certificate validation |
| 443              | `0.0.0.0/0` and IPv6 equivalent | Production HTTPS                |
| 8000, 6001, 6002 | Your own IP, temporary          | Initial Coolify setup           |

Do not expose app port `3000`, gateway `8787`, OCR `8000`, or Valkey `6379`. Coolify's initial dashboard also uses port 8000; restrict it to your IP and close 8000/6001/6002 after assigning a dashboard domain. Follow the current firewall guide: https://coolify.io/docs/knowledge-base/server/firewall

Optional but recommended swap setup:

```bash
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

## 2. Install Coolify

SSH into the fresh Ubuntu VM and run the official installer:

```bash
curl -fsSL https://cdn.coollabs.io/coolify/install.sh | sudo bash
```

Open the printed `http://SERVER_IP:8000` URL and create the first admin immediately. Current Coolify requirements and installer are documented at https://coolify.io/docs/get-started/installation.

After login:

1. Add a dashboard domain and enable HTTPS.
2. Close public access to ports 8000, 6001, and 6002 when the domain works.
3. Connect the GitHub repository through the Coolify GitHub App or its public repository URL.
4. Create a Project, Production environment, and Docker Compose resource.
5. Select `docker-compose.oracle.yml` as the compose file.
6. Attach the app domain to service `web`, port `3000`.
7. Do not attach domains to `ai-gateway`, `ocr`, `valkey`, or `cron`.

## 3. Configure Coolify environment

Copy `.env.oracle.example` into Coolify's Environment Variables screen and replace placeholders. Generate independent secrets:

```bash
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
openssl rand -hex 32
```

Use separate values for `AI_GATEWAY_SECRET`, `OCR_SERVICE_SECRET`, `VALKEY_PASSWORD`, and `CRON_SECRET`.

Required groups:

1. Public app URL and Supabase public values.
2. Supabase service-role key, which must remain server-only.
3. AI provider key arrays such as `GROQ_API_KEYS_JSON` and `GEMINI_API_KEYS_JSON`.
4. Oracle SMTP credentials.
5. Payment keys only after sandbox testing and merchant approval.
6. Android package/fingerprint values only when preparing the Play build.

Provider arrays must be valid one-line JSON, for example:

```text
GROQ_API_KEYS_JSON=["gsk_first","gsk_second"]
GEMINI_API_KEYS_JSON=["AIza_first","AIza_second"]
```

Do not add the same key more than once. Multiple accounts or keys do not override a provider's terms, anti-abuse rules, or project-level quota. Keep Admin Settings budgets below the real provider dashboard quota.

Keep `OCR_MAX_CONCURRENT_JOBS=1` on the free 2-OCPU VM. Printed OCR is local. Handwriting uses Gemini first because Tesseract is not dependable for handwriting.

Deploy the resource. A healthy deployment has five running services: `web`, `ai-gateway`, `ocr`, `valkey`, and `cron`.

## 4. Run Supabase changes

If `20260717100000_profile_academic_institution.sql` was the last manually applied file, run these complete files in SQL Editor in order:

1. `supabase/migrations/20260717120000_oracle_runtime_settings.sql`
2. `supabase/migrations/20260717123000_paddle_plan_prices.sql`
3. `supabase/migrations/20260717150000_resource_catalog_sections.sql`
4. `supabase/migrations/20260717163000_regional_billing.sql`
5. `supabase/migrations/20260717164000_audience_plan_entitlements.sql`
6. `supabase/migrations/20260717165000_resource_processing_queue.sql`
7. `supabase/migrations/20260717166000_notification_dismiss_policy.sql`
8. `supabase/migrations/20260717167000_profile_preferred_language.sql`
9. `supabase/migrations/20260717168000_subject_condition_baseline.sql`
10. `supabase/migrations/20260717169000_payment_provider_paypro.sql`
11. `supabase/migrations/20260719090000_weighted_ai_credits.sql`
12. `supabase/migrations/20260719100000_resource_mcq_sets.sql`
13. `supabase/migrations/20260719110000_diagnostic_mastery.sql`
14. `supabase/migrations/20260719130000_public_resource_catalog.sql`
15. `supabase/migrations/20260719140000_user_data_retention.sql`
16. `supabase/migrations/20260719200000_push_subscriptions.sql`

Confirm in Supabase after running them:

1. Storage bucket `parent-attachments` exists, is private, and has a 4 MB limit.
2. `library_resources`, `past_papers`, and `college_resources` have `context_text_url`.
3. `library_resources` and `college_resources` have light/dark file columns.
4. `profiles` has gender and academic institution fields.
5. Realtime includes parent links, parent attachments, and student chat requests.
6. Admin Settings shows USD-only plan fields.

## 5. Configure Supabase Auth and email

In Supabase Auth URL Configuration:

```text
Site URL: https://YOUR_DOMAIN
Redirect URL: https://YOUR_DOMAIN/**
```

In Oracle Email Delivery:

1. Create and verify an email domain.
2. Add SPF and DKIM DNS records.
3. Create an approved sender such as `noreply@YOUR_DOMAIN`.
4. Generate SMTP credentials; OCI console login credentials do not work as SMTP credentials.
5. Put the SMTP host, port 587, username, password, and sender into Coolify.
6. Put the same SMTP credentials into Supabase Auth SMTP settings.

Customize Supabase Auth templates with the ilm AI name/logo. Include the normal confirmation/recovery link and the template token where Supabase supports it, so the email can present both a button and a code. Test signup, email confirmation, and password recovery before launch.

Oracle documents SMTP credentials and approved senders here:

- https://docs.oracle.com/en-us/iaas/Content/Email/Reference/gettingstarted_topic-create-smtp-credentials.htm
- https://docs.oracle.com/en-us/iaas/Content/Email/Reference/gettingstarted_topic-Create_an_approved_sender.htm
- https://docs.oracle.com/en-us/iaas/Content/Email/Tasks/configureemaildomains.htm

## 6. Configure Paddle web subscriptions

Recommended launch prices for the current plan limits:

| Plan  | Monthly USD | Annual USD |
| ----- | ----------: | ---------: |
| Pro   |       $2.99 |     $28.70 |
| Elite |       $4.99 |     $47.90 |

Annual prices are approximately 20% below twelve monthly payments. Every country uses the same Paddle USD prices. These launch prices require free-first provider routing, self-hosted printed OCR, and configured hard usage caps. They do not promise an uncapped paid-model request for every action; if provider capacity is exhausted, the app must show a retry window rather than silently create an unbounded bill.

For an early beta, create a time-limited Paddle coupon instead of lowering the stored standard prices. If paid Gemini becomes the guaranteed provider or users regularly exhaust every cap, either raise prices again or reduce the AI caps from Admin before enabling that guarantee.

Paddle currently works with software suppliers worldwide except its published unsupported-country list, which does not list Pakistan. Live approval is still conditional on domain, identity/business, risk, and product review. Before applying, make sure every hosted book, note, lecture, and past paper is owned, licensed, public-domain, or otherwise authorized; Paddle does not permit copyright-infringing products.

Start with Paddle Sandbox:

1. Create Pro and Elite products.
2. Create monthly and yearly recurring USD prices exactly matching the table.
3. Copy all four `pri_...` IDs into Coolify.
4. Create a client-side token and API key.
5. Set the default payment link to `https://YOUR_DOMAIN/checkout`.
6. Request approval for the live checkout domain.
7. Create a webhook destination at `https://YOUR_DOMAIN/api/payments/paddle/webhook`.
8. Subscribe to `transaction.completed`, subscription created/updated/activated/trialing/past_due/paused/canceled events.
9. Copy the webhook endpoint secret into `PADDLE_WEBHOOK_SECRET`.
10. Redeploy because `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` is a build-time browser value.

Test one sandbox monthly purchase and one cancellation. Confirm the Paddle webhook creates/updates `subscriptions` and changes `profiles.subscription_tier`.

An already-paid user is intentionally not sent through a second checkout for an upgrade, because that could create two recurring subscriptions. Handle Pro-to-Elite changes through Paddle support/admin until a preview-and-confirm proration flow is added.

Paddle requires a default payment link and an approved live domain: https://developer.paddle.com/get-started/quickstart/.

Paddle remains the default card checkout. If PayPro merchant checkout credentials are approved, set `PAYPRO_CHECKOUT_URL`, `PAYPRO_WEBHOOK_SECRET`, and all four `PAYPRO_PLAN_ID_*` values to enable Pakistan local checkout. If those values are empty, Pakistan users still see Easypaisa/JazzCash manual verification fallback.

## 7. Validate production

From the public internet:

```bash
curl -fsS https://YOUR_DOMAIN/api/health
curl -fsS https://YOUR_DOMAIN/manifest.json
curl -fsS https://YOUR_DOMAIN/.well-known/assetlinks.json
```

Inside the Coolify web container, run:

```bash
node scripts/check-env.js
node scripts/check-ai-gateway.js
```

Manual product checks:

1. Register a fresh boy account and a fresh girl account through every signup step.
2. Verify unique username search and same-gender Study Buddy enforcement.
3. Link parent/student by code and QR, send a message/file, and click its notification.
4. Open the same lecture twice and verify the thumbnail both times.
5. Open light and dark resource versions without exposing the Drive source in resource metadata.
6. Verify Free can read but not download, while Pro/Elite can save in-app/offline.
7. Generate Summary/Test with a companion `.txt`, then with no `.txt` to exercise Oracle OCR.
8. Test printed and handwritten scans and inspect Admin provider usage.
9. Test institution inquiry chat and institution-specific usage reporting.
10. Complete Paddle sandbox checkout and inspect webhook delivery.

Do not delete the old deployment on cutover day. Point DNS to Oracle, monitor for at least 48 hours, then remove obsolete provider secrets and services.

## 8. Play Store preparation

The site is PWA/TWA-ready but the Android package should be built only after the production HTTPS deployment is stable.

1. Create DNS and HTTPS for a dedicated hostname such as `app.YOUR_DOMAIN` and attach it to the same Coolify `web` service.
2. Set `PLAY_CONSUMPTION_ONLY_HOSTS=app.YOUR_DOMAIN` and perform a full image rebuild/redeploy. This value is used by both the Docker build and runtime middleware, so a restart of the old image is not enough.
3. Generate the TWA with Bubblewrap from `https://app.YOUR_DOMAIN/manifest.json`; keep Paddle sales on the main web hostname.
4. Use package name `study.ilm.app` or update `ANDROID_PACKAGE_NAME` consistently.
5. Get the SHA-256 certificate fingerprint from Play App Signing.
6. Add one or more comma-separated fingerprints to `ANDROID_SHA256_CERT_FINGERPRINTS` and redeploy.
7. Confirm `https://app.YOUR_DOMAIN/.well-known/assetlinks.json` returns the package and fingerprints.
8. Verify that `/subscription` has no purchase links and both `/checkout` and `/pricing` redirect on the Play hostname.
9. Confirm Play-host POST requests to `/api/payments/create-session` and `/api/institution-plan-inquiry` return HTTP 403.
10. Confirm `/help` contains no manual-payment details and the Play hostname exposes no external purchase links.
11. Test camera, microphone, QR scanning, file uploads, notifications, offline shell, and back navigation on a physical Android device.

Important: Google Play normally requires Play Billing for education subscriptions and other digital in-app features. The dedicated Play hostname now enforces consumption-only mode in both UI and checkout APIs. If you later want purchases inside the Android app, integrate Play Billing and map verified purchases to the existing subscription table. Do not remove the host guard or expose Paddle checkout inside the Play-distributed TWA unless an applicable Google program explicitly permits it.

Google's current payments policy: https://support.google.com/googleplay/android-developer/answer/9858738

## 9. Operations and limits

1. Watch Oracle CPU, memory, boot volume, and Email Delivery usage.
2. Keep OCR concurrency at one until measurements show headroom.
3. Back up Coolify configuration and the `valkey-data` volume; Valkey loss resets counters/cache but not user data.
4. Keep Supabase backups and Storage policies under review.
5. Rotate AI/payment/service secrets immediately if any appear in logs or source control.
6. Keep free provider budgets conservative; a pool of 20 keys improves failover but does not guarantee 20 times the allowed quota.
7. Build on the VM can spike memory and CPU. Deploy during low traffic and keep swap enabled.
