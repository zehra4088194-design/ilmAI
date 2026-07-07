#!/usr/bin/env node
// Run: node scripts/check-env.js
// Validates that all required environment variables are set before deployment.
const required = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'AI_GATEWAY_URL',
  'AI_GATEWAY_SECRET',
];
const optional = [
  'PADDLE_API_KEY', 'PADDLE_WEBHOOK_SECRET', 'NEXT_PUBLIC_PADDLE_CLIENT_TOKEN',
  'PADDLE_PRICE_ID_PRO_MONTHLY', 'PADDLE_PRICE_ID_PRO_ANNUAL',
  'PADDLE_PRICE_ID_ELITE_MONTHLY', 'PADDLE_PRICE_ID_ELITE_ANNUAL',
  'PAYPRO_API_KEY', 'PAYPRO_WEBHOOK_SECRET',
  'UPSTASH_REDIS_REST_URL', 'UPSTASH_REDIS_REST_TOKEN',
  'NEXT_PUBLIC_ADSENSE_CLIENT_ID', 'ADMIN_EMAILS',
  'RESEND_API_KEY',
];

let ok = true;
console.log('\n🔍 Checking environment variables...\n');
required.forEach(key => {
  if (!process.env[key]) {
    console.error(`❌ MISSING (required): ${key}`);
    ok = false;
  } else {
    console.log(`✅ ${key}`);
  }
});
optional.forEach(key => {
  if (!process.env[key]) {
    console.warn(`⚠️ MISSING (optional): ${key}`);
  } else {
    console.log(`✅ ${key}`);
  }
});
console.log(ok ? '\n✅ All required env vars are set!\n' : '\n❌ Fix missing required vars before deploying.\n');
process.exit(ok ? 0 : 1)
