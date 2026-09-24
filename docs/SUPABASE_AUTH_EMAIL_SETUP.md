# Supabase Auth Email Setup for ilm AI

The app supports both a clickable link and a 6-digit code for signup confirmation and password recovery. Hosted Supabase email templates must be configured manually in the Supabase Dashboard.

## 1. Custom SMTP

Open `Authentication > SMTP Settings`, enable Custom SMTP, and configure your provider. Brevo's SMTP relay can be used with the same account/domain that already sends this app's own transactional email (see `docs/BREVO_SETUP.md`).

- Host: `smtp-relay.brevo.com`
- Port: `587`
- Username: your Brevo account login email
- Password: an SMTP key from Brevo > SMTP & API > SMTP (not the same as `BREVO_API_KEY`, which is the HTTP API key this app's own `sendEmail()` uses)
- Sender name: `ilm AI`
- Sender email: a verified address such as `noreply@ilmai.study`
- Disable email-link tracking in the SMTP provider.

Without Custom SMTP, Supabase's default sender may remain visible and production delivery is severely restricted.

## 2. Confirm Signup Template

Open `Authentication > Email Templates > Confirm signup`.

Subject:

```text
Verify your ilm AI account
```

Body:

```html
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033">
  <h2 style="margin-bottom:8px">Welcome to ilm AI</h2>
  <p>Use this 6-digit code to verify your email:</p>
  <div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0;color:#6d28d9">{{ .Token }}</div>
  <p>Or verify with one click:</p>
  <a
    href="{{ .ConfirmationURL }}"
    style="display:inline-block;padding:12px 20px;background:#6d28d9;color:#fff;text-decoration:none;border-radius:10px"
    >Verify email</a
  >
  <p style="margin-top:24px;color:#64748b;font-size:13px">
    If you did not create an ilm AI account, ignore this email.
  </p>
</div>
```

## 3. Reset Password Template

Open `Authentication > Email Templates > Reset password`.

The 6-digit reset code only appears if the template includes `{{ .Token }}`. If the email only has a link, paste the body below again and save the template.

Subject:

```text
Reset your ilm AI password
```

Body:

```html
<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#172033">
  <h2 style="margin-bottom:8px">Reset your ilm AI password</h2>
  <p>Use this 6-digit code in the ilm AI app:</p>
  <div style="font-size:32px;font-weight:700;letter-spacing:8px;margin:24px 0;color:#6d28d9">{{ .Token }}</div>
  <p>Or continue with the secure reset link:</p>
  <a
    href="{{ .ConfirmationURL }}"
    style="display:inline-block;padding:12px 20px;background:#6d28d9;color:#fff;text-decoration:none;border-radius:10px"
    >Reset password</a
  >
  <p style="margin-top:24px;color:#64748b;font-size:13px">If you did not request this, ignore this email.</p>
</div>
```

## 4. URLs

Open `Authentication > URL Configuration` and confirm:

- Site URL is the production ilm AI URL.
- `https://YOUR-DOMAIN/api/auth/callback` is allowed.
- `https://YOUR-DOMAIN/api/auth/recovery` is allowed.
- Add the matching localhost URLs for local testing.

In the deployed app environment, set both `NEXT_PUBLIC_SITE_URL` and `NEXT_PUBLIC_APP_URL` to the real public domain, for example `https://YOUR-DOMAIN`. Do not use `0.0.0.0`, `localhost`, or an internal container URL for these values in production.

After saving, test signup once with the code and once with the link. Repeat both tests for password recovery.
