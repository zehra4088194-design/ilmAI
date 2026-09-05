# Brevo setup — email + WhatsApp for school/college parent notifications

This app now sends every transactional email (auth OTPs, weekly parent reports, fee reminders,
absence alerts, leave decisions, report cards, etc.) through **Brevo**, and — when a WhatsApp
sender + templates are configured — sends the same weekly report / fee reminder / leave update
messages as real WhatsApp messages via Brevo's WhatsApp Business API.

Nodemailer/SMTP has been fully removed (`src/lib/email/send.ts`); the old `SMTP_*` env vars are no
longer read anywhere in the app (`.env.oracle.example`'s `SMTP_*` block is unrelated — that
configures **Supabase Auth's own** email relay for the separate Oracle self-hosted deployment, not
this app's `sendEmail()`).

## 1. Email (required)

1. Create a free account at https://app.brevo.com.
2. Verify a sending domain (or at least a sender email) under **Senders, Domains & Dedicated IPs**.
3. Go to **SMTP & API > API Keys**, create a key, and set it as `BREVO_API_KEY`.
4. Set `EMAIL_FROM` to `Your School <noreply@your-verified-domain>`.

That's it — `isEmailConfigured()` just checks those two vars. Every existing email call site
(`src/lib/email/send.ts`'s `sendEmail()`) keeps working unchanged.

## 2. WhatsApp (optional, needed for automated WhatsApp delivery)

WhatsApp's Business API requires Meta to approve both a sender number and every message template
before a business can message someone who hasn't messaged them first — this cannot be skipped or
worked around, it's a WhatsApp platform rule.

1. In Brevo, go to **WhatsApp > Senders** and connect a WhatsApp Business number (Meta review is
   usually a few days).
2. Go to **WhatsApp > Templates** and create one template per notification kind below. Each
   template's body should declare two variables, `{{1}}` and `{{2}}` — the app fills `{{1}}` with
   the message title and `{{2}}` with the message body. Example template body:
   > *{{1}}*
   > {{2}}
3. Submit each for Meta approval (usually same-day to a few days).
4. Once approved, set:
   - `BREVO_WHATSAPP_SENDER` — the connected number, digits only with country code (e.g. `923001234567`)
   - `BREVO_WHATSAPP_TEMPLATE_FEE_REMINDER` — that template's id
   - `BREVO_WHATSAPP_TEMPLATE_ABSENCE_ALERT`
   - `BREVO_WHATSAPP_TEMPLATE_WEEKLY_REPORT`
   - `BREVO_WHATSAPP_TEMPLATE_LEAVE_UPDATE`

Until these are set, WhatsApp is simply skipped — the same reminders still go out over in-app,
push, and email, so nothing breaks by leaving WhatsApp unconfigured.

## 3. What now runs automatically

Both `/api/cron/school-notifications` and `/api/cron/college-notifications` run twice a day
(`.github/workflows/free-cron.yml`, needs `APP_URL` + `CRON_SECRET` repo secrets) and queue, per
guardian who has `receives_alerts = true`:

| Category            | When                                             | Channels                          |
|----------------------|---------------------------------------------------|------------------------------------|
| `fee_reminder`       | invoice due within 3 days, or overdue (monthly repeat) | in_app, push, whatsapp*            |
| `attendance_alert`   | student marked absent today                        | in_app, push, whatsapp* (+ instant in_app/push the moment attendance is saved) |
| `weekly_report`      | every Monday — attendance % + fee pending for the last 7 days | in_app, push, whatsapp*, email |
| `leave_update`       | a leave request is approved/declined, once per request | in_app, push, whatsapp*, email |

\* whatsapp only sends once `BREVO_WHATSAPP_SENDER` + that category's template id are set.

Every row is deduped (`organization_id, channel, dedupe_key`), so re-running the cron never
double-sends. Failed sends retry up to 3 times with backoff; a delivery stuck in `processing` for
>15 minutes (e.g. the function was killed mid-send) is recovered as `failed` on the next run.
