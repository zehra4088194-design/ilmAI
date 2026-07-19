#!/usr/bin/env node
// Run: node scripts/check-env.js
// Validates required environment variables before deployment.
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return Object.fromEntries(
    fs
      .readFileSync(filePath, 'utf8')
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith('#') && line.includes('='))
      .map((line) => {
        const separator = line.indexOf('=');
        return [line.slice(0, separator).trim(), line.slice(separator + 1).trim()];
      })
  );
}

const fileEnv = loadEnvFile(path.join(process.cwd(), '.env.local'));
const env = { ...fileEnv, ...process.env };

const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AI_GATEWAY_URL',
  'AI_GATEWAY_SECRET',
  'OCR_SERVICE_URL',
  'OCR_SERVICE_SECRET',
  'CRON_SECRET',
];
const optional = [
  'REDIS_URL',
  'PADDLE_API_KEY',
  'PADDLE_WEBHOOK_SECRET',
  'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN',
  'PADDLE_PRICE_ID_PRO_MONTHLY',
  'PADDLE_PRICE_ID_PRO_ANNUAL',
  'PADDLE_PRICE_ID_ELITE_MONTHLY',
  'PADDLE_PRICE_ID_ELITE_ANNUAL',
  'NEXT_PUBLIC_ADSENSE_CLIENT_ID',
  'ADMIN_EMAILS',
  'SMTP_HOST',
  'SMTP_USER',
  'SMTP_PASSWORD',
  'EMAIL_FROM',
  'NEXT_PUBLIC_POSTHOG_KEY',
  'NEXT_PUBLIC_POSTHOG_HOST',
  'NEXT_PUBLIC_SENTRY_DSN',
  'SENTRY_DSN',
  'NEXT_PUBLIC_FIREBASE_PROJECT_ID',
  'NEXT_PUBLIC_FIREBASE_VAPID_KEY',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_SERVICE_ACCOUNT_JSON_BASE64',
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET',
  'ALGOLIA_ENABLED',
  'ALGOLIA_APP_ID',
  'ALGOLIA_SEARCH_API_KEY',
  'ALGOLIA_ADMIN_API_KEY',
  'ANDROID_PACKAGE_NAME',
  'ANDROID_SHA256_CERT_FINGERPRINTS',
  'PLAY_CONSUMPTION_ONLY_HOSTS',
];

let ok = true;
console.log('\n[check] Environment variables\n');
required.forEach((key) => {
  if (!env[key]) {
    console.error(`[missing] Required: ${key}`);
    ok = false;
  } else {
    console.log(`[ok] ${key}`);
  }
});
optional.forEach((key) => {
  if (!env[key]) {
    console.warn(`[optional] Not set: ${key}`);
  } else {
    console.log(`[ok] ${key}`);
  }
});
console.log(ok ? '\n[ok] All required env vars are set.\n' : '\n[failed] Set required vars before deploying.\n');
process.exit(ok ? 0 : 1);
