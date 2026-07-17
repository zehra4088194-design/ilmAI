# Supabase Auth Email Setup for ilm AI

The app supports both a clickable link and a 6-digit code for signup confirmation and password recovery. Hosted Supabase email templates must be configured manually in the Supabase Dashboard.

## 1. Custom SMTP

Open `Authentication > SMTP Settings`, enable Custom SMTP, and configure your provider. Resend SMTP can be used with the existing email provider account.

- Host: `smtp.resend.com`
- Port: `465`
- Username: `resend`
- Password: your Resend API key
- Sender name: `ilm AI`
- Sender email: a verified address such as `no-reply@your-domain.com`
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

After saving, test signup once with the code and once with the link. Repeat both tests for password recovery.
