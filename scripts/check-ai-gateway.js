#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
  const env = {};
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    const value = trimmed.slice(eqIndex + 1).trim();
    env[key] = value;
  }
  return env;
}

async function postJson(url, body, secret) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${secret}`,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { status: res.status, data };
}

async function main() {
  const envPath = path.join(process.cwd(), '.env.local');
  const fileEnv = loadEnvFile(envPath);
  const gatewayUrl = process.env.AI_GATEWAY_URL || fileEnv.AI_GATEWAY_URL;
  const gatewaySecret = process.env.AI_GATEWAY_SECRET || fileEnv.AI_GATEWAY_SECRET;

  if (!gatewayUrl) {
    console.error('AI_GATEWAY_URL missing hai.');
    process.exit(1);
  }

  if (!gatewaySecret) {
    console.error('AI_GATEWAY_SECRET missing hai.');
    process.exit(1);
  }

  console.log('\nChecking AI gateway...\n');

  const health = await fetch(`${gatewayUrl}/health`);
  const healthText = await health.text();
  console.log(`Health: ${health.status} ${health.ok ? 'OK' : 'FAIL'}`);
  if (!health.ok) {
    console.error('Gateway health endpoint fail ho raha hai.');
    process.exit(1);
  }

  const payload = {
    provider: 'groq',
    tier: 'mini',
    messages: [{ role: 'user', content: 'Reply with exactly OK' }],
  };

  const configured = await postJson(`${gatewayUrl}/chat`, payload, gatewaySecret);
  if (configured.status === 200) {
    console.log('Chat auth: OK');
    console.log('\nAI gateway correctly configured hai.\n');
    process.exit(0);
  }

  console.log(`Chat auth with configured secret: ${configured.status}`);

  const undefinedSecret = await postJson(`${gatewayUrl}/chat`, payload, 'undefined');
  if (configured.status === 401 && undefinedSecret.status === 200) {
    console.error('\nDiagnosis: Cloudflare Worker me GATEWAY_SECRET set nahi hai.');
    console.error('Fix: Worker ke Variables/Secrets me GATEWAY_SECRET set karo, aur Next.js app me AI_GATEWAY_SECRET ko usi exact value par rakho.\n');
    process.exit(1);
  }

  if (configured.status === 401 || configured.status === 403) {
    console.error('\nDiagnosis: AI_GATEWAY_SECRET aur Worker ka GATEWAY_SECRET mismatch kar rahe hain.\n');
    process.exit(1);
  }

  console.error('\nGateway reachable hai lekin chat fail ho rahi hai.');
  if (configured.data) console.error(typeof configured.data === 'string' ? configured.data : JSON.stringify(configured.data, null, 2));
  process.exit(1);
}

main().catch((error) => {
  console.error('\nAI gateway check crash ho gaya:\n', error);
  process.exit(1);
});
