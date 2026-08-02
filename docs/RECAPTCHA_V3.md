# Google reCAPTCHA v3

ilm AI uses score-based Google reCAPTCHA v3 for public submissions. The script is loaded globally in the background, but a fresh single-use token is created only when a protected action is submitted.

## Keys

Create a reCAPTCHA v3 property in the [Google reCAPTCHA admin console](https://www.google.com/recaptcha/admin/create) and register the production hostnames:

- `ilmai.study`
- `www.ilmai.study`
- `localhost` for local testing, if the Google property allows it

Set both variables together:

```env
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_public_site_key
RECAPTCHA_SECRET_KEY=your_private_secret_key
RECAPTCHA_MIN_SCORE=0.5
```

- The site key is intentionally public and is bundled into browser JavaScript.
- The secret key must remain server-only. Never prefix it with `NEXT_PUBLIC_` and never commit it.
- For local development, put the values in `.env.local` and restart the Next.js server.
- For production, add them to the Coolify environment. The Docker configuration passes the public key at build time and the secret at runtime, so rebuild the web image after adding or changing the site key.

If neither key is configured, reCAPTCHA remains disabled so local and staged deployments do not break. If only one key is configured, protected requests fail closed until both values are present.

## Protected actions

- Signup, password login, magic-link email, password-recovery email, and verification-email resend
- Contact form
- Free demo start
- Public school admission form and document upload

OTP/MFA verification, authenticated dashboard tools, signed cron/webhook routes, read-only pages, and the already-disabled live voice endpoint do not run reCAPTCHA.

The server validates Google verification success, the exact action name, and the risk score. The default minimum score is `0.5`; review scores in the Google console before making it stricter.

## Supabase Auth limitation

Supabase Auth natively supports hCaptcha and Cloudflare Turnstile, not Google reCAPTCHA v3. The v3 checks on the existing browser-based Supabase authentication screens are therefore an application-level preflight. Contact, demo, and admission requests are fully enforced by ilm AI's own server routes. If direct GoTrue/Auth endpoint protection is required, enable Supabase-supported Turnstile or hCaptcha in addition to this integration.

References: [Google reCAPTCHA v3](https://developers.google.com/recaptcha/docs/v3), [server-side verification](https://developers.google.com/recaptcha/docs/verify), and [Supabase Auth CAPTCHA](https://supabase.com/docs/guides/auth/auth-captcha).
