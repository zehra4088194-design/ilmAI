# ilm AI WhatsApp worker

A standalone, always-on Node process that runs an unofficial WhatsApp Web client
([Baileys](https://github.com/WhiskeySockets/Baileys)) so the app can send free-form WhatsApp
messages and auto-reply to incoming chats, for free, without going through Meta's approved
WhatsApp Business API. It's deliberately **separate** from the Next.js app — see the block comment
at the top of `index.js` for why.

**Scope, on purpose:** sign-up greetings, broadcasts, and incoming-message auto-replies only.
Password reset and anything security-sensitive stay on the existing Supabase/Brevo email flow —
this bot's number can be permanently banned by Meta at any time with no appeal, so nothing
critical should depend on it. If you also have Brevo's WhatsApp Business API configured
(`src/lib/whatsapp/brevo.ts`), that one is the ToS-compliant channel for anything that matters.

## First-time setup (on the Oracle VPS)

```bash
cd whatsapp-worker
npm install
cp .env.example .env
# edit .env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (same values as the main app),
# and generate WHATSAPP_WORKER_SECRET with:
#   node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"
```

Also add the matching two vars to the **main Next.js app's** env (`.env.oracle` on the VPS,
Coolify's Environment Variables screen, etc — see `.env.oracle.example` at the repo root):

```
WHATSAPP_WORKER_URL=http://127.0.0.1:4310
WHATSAPP_WORKER_SECRET=<same value as whatsapp-worker/.env>
```

Then apply the inbound-message log table migration (see
`supabase/migrations/*_whatsapp_inbound_messages.sql`) and add a `phone` value to your own
profile in Settings so you can test the auto-reply against a real account:

```bash
npm run db:push
```

## Running it

**First run (linking the device):**

```bash
cd whatsapp-worker
node index.js
```

A QR code prints directly in the terminal. Open WhatsApp on the phone you want the bot to use →
Settings → Linked Devices → Link a Device → scan it. The session is then saved to
`auth_info_baileys/` (gitignored) so you won't need to scan again unless that folder is deleted or
WhatsApp logs the device out.

**Production (PM2, keeps running after you close the SSH session):** see `ecosystem.config.js` at
the repo root and the root `README`/deployment docs for the full command list. Short version:

```bash
npm install -g pm2          # once per VPS
pm2 start ecosystem.config.js --only ilm-ai-whatsapp
pm2 save
pm2 startup                 # prints a command to run once, so PM2 survives a VPS reboot
```

If the worker ever needs a fresh QR (device unlinked from the phone, or you're moving it to a new
number), stop it, delete `auth_info_baileys/`, and start it again in the foreground to scan.

## JazzCash SMS auto-verify

A second, independent feature riding on the same bot: instant activation of JazzCash payments
without an admin manually checking a screenshot. Three pieces:

1. A free Android "SMS to Webhook" app, installed on the phone/SIM linked to the merchant
   JazzCash account, forwards every incoming SMS to `POST /api/sms-receiver` on the Next.js app
   (`SMS_WEBHOOK_SECRET` must match between the two). That endpoint regex-extracts the amount and
   transaction ID from JazzCash's own "you have received Rs.X ... TID ..." SMS and stores them.
2. A payer messages this WhatsApp bot with their transaction ID and the short plan/claim code
   shown on the checkout page (e.g. `TID 123456789012 CODE STU-PRO-M`), optionally with a
   screenshot attached.
3. This worker forwards the TID + code to `POST /api/payments/jazzcash/verify` (needs
   `WHATSAPP_APP_BASE_URL` set) — that endpoint does the actual cross-match against the real SMS
   and activates the plan if it matches, and this worker relays whatever it says back to the payer.

See the header comments in `index.js` (`handlePossiblePaymentMessage`) and
`src/lib/payments/jazzcash.ts` / `src/app/api/payments/jazzcash/verify/route.ts` in the main app
for the full fraud-hardening details (each real transaction ID can only ever activate one
account/claim). The existing "email a screenshot to an admin" path keeps working unchanged as a
fallback if the SMS forwarder is ever down.

## HTTP API (127.0.0.1 only)

- `GET /health` → `{ ok, connected, startingUp }`
- `POST /send` with header `Authorization: Bearer <WHATSAPP_WORKER_SECRET>` and body
  `{ "to": "03001234567", "message": "..." }` → `{ messageId }` on success, or
  `{ skipped: true, reason }` if the session is down / the number is unusable — never a thrown
  error the caller has to guard against.

The Next.js app talks to this through `src/lib/whatsapp/baileys.ts`, which does the phone
normalization + fetch + timeout + try/catch — call sites shouldn't hit this API directly.
