/**
 * ============================================================
 * ILM AI — CLOUDFLARE WORKER (AI GATEWAY)
 * ============================================================
 * This Worker is the ONLY place that holds AI/OCR API keys.
 * The Next.js backend never sees a raw provider key — it only
 * talks to this Worker over HTTPS with a shared secret.
 *
 * WHAT IT DOES
 * - Holds 5 keys per provider (Groq, Claude, GPT, Gemini, OCR.space)
 * - Tries key 1 → if it fails (bad key / rate-limited / 5xx) → key 2 → ... → key 5
 * - If ALL 5 keys of a provider fail, it silently falls back to Groq
 *   (the student never sees an error — the app just keeps working)
 * - Routes OCR: printed text → OCR.space, handwritten/messy → Gemini Vision,
 *   each with its own 5-key rotation, and each falls back to the other if needed
 * - Mints short-lived ephemeral tokens for Live Voice Call (see LIVE VOICE
 *   section below) so the browser can talk to Gemini Live directly without
 *   ever seeing a real API key. The token also locks in AUDIO transcription
 *   (input + output) so the Next.js backend can turn a voice lesson into
 *   Short Notes + Flashcards when the call ends (see /api/voice/session-end).
 *
 * DEPLOY: Cloudflare Dashboard → Workers & Pages → Create → paste this file →
 * add the secrets listed in SECRETS REFERENCE below → Deploy.
 * Full step-by-step is in the "ilm AI - Deployment Guide.docx" file.
 *
 * ------------------------------------------------------------
 * SECRETS REFERENCE (set under Settings → Variables and Secrets)
 * ------------------------------------------------------------
 * GATEWAY_SECRET -> any long random string YOU make up.
 *                   Next.js sends this back as proof it's really your app.
 * GROQ_API_KEY_1 .. _5
 * CLAUDE_API_KEY_1 .. _5
 * GPT_API_KEY_1 .. _5
 * GEMINI_API_KEY_1 .. _5 -> also used to mint Live Voice Call ephemeral tokens
 * OCR_API_KEY_1 .. _5 -> from ocr.space (free keys, 5 separate accounts/emails)
 *
 * OPTIONAL (Live Voice Call — has a safe built-in default, only set if you
 * want to override without waiting for a redeploy):
 * GEMINI_LIVE_MODEL -> defaults to 'gemini-live-2.5-flash-preview'.
 *                      ⚠️ Google renames/deprecates Live API preview models
 *                      often — if voice calls start failing with a "model
 *                      not found" close error, check the current model list
 *                      at https://ai.google.dev/gemini-api/docs/live-api and
 *                      set this secret to the current one, no redeploy needed.
 * ============================================================
 */

// ---------- MODEL MAP (edit anytime, no redeploy needed elsewhere) ----------
const MODEL_MAP = {
  groq: {
    mini: 'llama-3.1-8b-instant',
    medium: 'llama-3.3-70b-versatile',
    pro: 'llama-3.3-70b-versatile',
  },
  claude: {
    mini: 'claude-3-5-haiku-20241022',
    medium: 'claude-3-5-sonnet-20241022',
    pro: 'claude-3-opus-20240229',
  },
  gpt: {
    mini: 'gpt-4o-mini',
    medium: 'gpt-4o',
    pro: 'gpt-4-turbo',
  },
  gemini: {
    mini: 'gemini-1.5-flash-8b',
    medium: 'gemini-1.5-flash',
    pro: 'gemini-1.5-pro',
  },
};

// Default Live Voice Call model — see GEMINI_LIVE_MODEL override note above.
const DEFAULT_LIVE_MODEL = 'gemini-live-2.5-flash-preview';

// The AI Teacher persona for Live Voice Call. Locked into the ephemeral
// token server-side (via liveConnectConstraints) so it can never be
// overridden or inspected from the browser.
const LIVE_TEACHER_SYSTEM_INSTRUCTION = `Tum ilm AI ke ek patient, encouraging aur clear school/college AI Teacher ho, jo Pakistani aur Indian students ko LIVE AWAAZ (voice) mein parhate ho.

Rules:
- Hamesha garmjoshi aur sabar (patience) ke saath baat karo — jaise ek achha, mehربan teacher karta hai.
- Mushkil concepts ko chotay, simple steps mein tor kar samjhao. Ek waqt mein ek hi baat samjhao.
- Student ki ghalti par kabhi tanqeed ya sharminda mat karo — unhe himmat do aur dobara koshish karne ke liye motivate karo.
- Roman Urdu aur English ko naturally mix karo, jaisi zaban mein student baat kare waisa adjust kar lo.
- Jawab chota aur clear rakho jab tak student khud tafseel (detail) na maange.
- Agar sawal unclear ho to politely clarify karne ke liye puchho, guess mat karo.
- Tum FBISE, provincial boards (Punjab, Sindh, KPK), O/A Levels, aur CBSE/ICSE curricula ke mutabiq kisi bhi subject — Math, Physics, Chemistry, Biology, English, Urdu, Computer Science — mein madad kar sakte ho.`;

// Daily call ceilings PER USER for non-Groq providers, by model tier.
// (Actual per-user counting happens in the Next.js backend via Supabase + Upstash —
// this object is just exposed back in responses so the backend can display/enforce it.)
const TIER_DAILY_LIMITS = { mini: 10, medium: 7, pro: 3 };

const KEY_COUNT = 5;
const RETRYABLE_STATUS = new Set([401, 403, 429, 500, 502, 503, 504]);

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders() },
  });
}

function getKeys(env, prefix) {
  const keys = [];
  for (let i = 1; i <= KEY_COUNT; i++) {
    const k = env[`${prefix}_${i}`];
    if (k) keys.push(k);
  }
  return keys;
}

/**
 * Tries each key in order. Stops and returns on first success.
 * Rotates to next key on auth/rate-limit/server errors.
 * Does NOT rotate on 400 (bad request) — rotating won't fix a malformed request.
 */
async function withKeyRotation(keys, callFn, label) {
  if (!keys.length) return { ok: false, error: `No keys configured for ${label}` };
  let lastError = null;
  for (let i = 0; i < keys.length; i++) {
    try {
      const result = await callFn(keys[i]);
      if (result.ok) return { ok: true, data: result.data, keyIndexUsed: i + 1 };
      if (!RETRYABLE_STATUS.has(result.status)) {
        return { ok: false, error: result.error || `${label} request failed`, status: result.status };
      }
      lastError = result.error || `${label} key #${i + 1} failed (status ${result.status})`;
    } catch (err) {
      lastError = `${label} key #${i + 1} network error: ${err.message}`;
    }
  }
  return { ok: false, error: `All ${keys.length} ${label} keys exhausted. Last error: ${lastError}` };
}

// ---------------- PROVIDER CALLERS (return {ok, data|error, status}) ----------------

async function callGroq(key, model, messages, maxTokens, temperature) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const json = await res.json();
  return { ok: true, data: json.choices?.[0]?.message?.content || '' };
}

async function callOpenAI(key, model, messages, maxTokens, temperature) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
  });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const json = await res.json();
  return { ok: true, data: json.choices?.[0]?.message?.content || '' };
}

async function callClaude(key, model, messages, maxTokens) {
  const system = messages.find((m) => m.role === 'system')?.content || '';
  const turns = messages.filter((m) => m.role !== 'system');
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({ model, system, messages: turns, max_tokens: maxTokens }),
  });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const json = await res.json();
  const text = (json.content || []).map((b) => b.text || '').join('');
  return { ok: true, data: text };
}

async function callGemini(key, model, messages, maxTokens, temperature) {
  const system = messages.find((m) => m.role === 'system')?.content || '';
  const turns = messages.filter((m) => m.role !== 'system');
  const contents = turns.map((m) => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents,
      systemInstruction: system ? { parts: [{ text: system }] } : undefined,
      generationConfig: { maxOutputTokens: maxTokens, temperature },
    }),
  });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  return { ok: true, data: text };
}

async function callGeminiVisionOcr(key, base64Image, mimeType) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            { text: 'Transcribe ALL visible text from this image exactly as written, including handwriting. Return ONLY the transcribed text, no commentary, no markdown formatting.' },
            { inline_data: { mime_type: mimeType, data: base64Image } },
          ],
        },
      ],
      generationConfig: { maxOutputTokens: 2048, temperature: 0.1 },
    }),
  });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('').trim() || '';
  return { ok: true, data: text };
}

async function callOcrSpace(key, base64Image, mimeType) {
  const form = new FormData();
  const byteChars = atob(base64Image);
  const byteNumbers = new Array(byteChars.length);
  for (let i = 0; i < byteChars.length; i++) byteNumbers[i] = byteChars.charCodeAt(i);
  const blob = new Blob([new Uint8Array(byteNumbers)], { type: mimeType });
  form.append('file', blob, 'scan.jpg');
  form.append('apikey', key);
  form.append('language', 'eng');
  form.append('OCREngine', '2');
  form.append('scale', 'true');
  form.append('detectOrientation', 'true');

  const res = await fetch('https://api.ocr.space/parse/image', { method: 'POST', body: form });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const json = await res.json();
  if (json.IsErroredOnProcessing) {
    return { ok: false, status: 500, error: Array.isArray(json.ErrorMessage) ? json.ErrorMessage.join(', ') : json.ErrorMessage };
  }
  return { ok: true, data: json.ParsedResults?.[0]?.ParsedText?.trim() || '' };
}

// ---------------- LIVE VOICE CALL: ephemeral token minting ----------------
// The browser never gets a real Gemini key. Instead we mint a short-lived,
// single-use "ephemeral token" (Google's AuthTokenService.CreateToken) with
// the model + persona locked in server-side, and hand THAT to the client.
// The client then opens its OWN WebSocket straight to Gemini Live using the
// token — audio never passes through our servers, which is both faster
// (one less hop) and cheaper (no Worker bandwidth for audio streams).
//
// inputAudioTranscription / outputAudioTranscription are also locked in here
// (not sent from the browser, same reasoning as systemInstruction below) so
// that Gemini streams back text transcripts of BOTH sides of the call
// alongside the audio. The Next.js backend uses that transcript when the
// call ends to generate Short Notes + Flashcards — see
// src/components/features/ai-tutor/LiveVoiceCall (client-side accumulation)
// and /api/voice/session-end (server-side generation + save).
//
// NOTE ON THIS ENDPOINT: this is implemented against Google's documented
// ephemeral-token flow (v1alpha, POST .../v1alpha/authTokens). Google's
// public docs show this via their `google-genai` SDK rather than a raw curl
// example, so this raw-fetch version should be smoke-tested after deploy —
// if Google tweaks the exact REST path/shape, only this one function needs
// updating.
async function mintEphemeralToken(key, model, systemInstruction) {
  const now = Date.now();
  const body = {
    config: {
      uses: 1,
      expireTime: new Date(now + 30 * 60 * 1000).toISOString(), // session can run 30 min
      newSessionExpireTime: new Date(now + 60 * 1000).toISOString(), // must START within 1 min
      liveConnectConstraints: {
        model: `models/${model}`,
        config: {
          responseModalities: ['AUDIO'],
          systemInstruction: { parts: [{ text: systemInstruction }] },
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
      },
    },
  };

  const res = await fetch(`https://generativelanguage.googleapis.com/v1alpha/authTokens?key=${key}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const data = await res.json();
  if (!data.name) return { ok: false, status: 502, error: 'Gemini did not return a token name' };
  return { ok: true, data: { token: data.name, expireTime: data.expireTime, newSessionExpireTime: data.newSessionExpireTime } };
}

// ---------------- ROUTE: /chat ----------------
async function handleChat(req, env) {
  const body = await req.json();
  const { provider = 'groq', tier = 'mini', messages, max_tokens = 2048, temperature = 0.7 } = body;

  if (!messages || !Array.isArray(messages)) return json({ error: 'messages array required' }, 400);

  const model = MODEL_MAP[provider]?.[tier] || MODEL_MAP.groq.mini;
  let result;

  if (provider === 'groq') {
    result = await withKeyRotation(getKeys(env, 'GROQ_API_KEY'), (k) => callGroq(k, model, messages, max_tokens, temperature), 'Groq');
  } else if (provider === 'claude') {
    result = await withKeyRotation(getKeys(env, 'CLAUDE_API_KEY'), (k) => callClaude(k, model, messages, max_tokens), 'Claude');
  } else if (provider === 'gpt') {
    result = await withKeyRotation(getKeys(env, 'GPT_API_KEY'), (k) => callOpenAI(k, model, messages, max_tokens, temperature), 'GPT');
  } else if (provider === 'gemini') {
    result = await withKeyRotation(getKeys(env, 'GEMINI_API_KEY'), (k) => callGemini(k, model, messages, max_tokens, temperature), 'Gemini');
  } else {
    return json({ error: `Unknown provider: ${provider}` }, 400);
  }

  // Silent cross-provider fallback: if a premium provider totally fails, drop to Groq mini
  // so the student never sees an error.
  if (!result.ok && provider !== 'groq') {
    const fallback = await withKeyRotation(
      getKeys(env, 'GROQ_API_KEY'),
      (k) => callGroq(k, MODEL_MAP.groq.mini, messages, max_tokens, temperature),
      'Groq (fallback)'
    );
    if (fallback.ok) {
      return json({ text: fallback.data, providerUsed: 'groq', modelUsed: MODEL_MAP.groq.mini, fallbackTriggered: true, originalProvider: provider });
    }
  }

  if (!result.ok) return json({ error: result.error || 'All providers failed' }, 502);
  return json({ text: result.data, providerUsed: provider, modelUsed: model, keyIndexUsed: result.keyIndexUsed, dailyLimit: TIER_DAILY_LIMITS[tier] });
}

// ---------------- ROUTE: /ocr ----------------
async function handleOcr(req, env) {
  const body = await req.json();
  const { mode = 'printed', imageBase64, mimeType = 'image/jpeg' } = body;
  if (!imageBase64) return json({ error: 'imageBase64 required' }, 400);

  const ocrKeys = getKeys(env, 'OCR_API_KEY');
  const geminiKeys = getKeys(env, 'GEMINI_API_KEY');

  if (mode === 'handwritten') {
    let result = await withKeyRotation(geminiKeys, (k) => callGeminiVisionOcr(k, imageBase64, mimeType), 'Gemini Vision OCR');
    if (!result.ok) {
      result = await withKeyRotation(ocrKeys, (k) => callOcrSpace(k, imageBase64, mimeType), 'OCR.space (fallback)');
      if (result.ok) return json({ text: result.data, providerUsed: 'ocr-space', fallbackTriggered: true });
    } else {
      return json({ text: result.data, providerUsed: 'gemini-vision' });
    }
    return json({ error: result.error || 'OCR failed on all providers' }, 502);
  }

  // mode === 'printed' (default, free tier)
  let result = await withKeyRotation(ocrKeys, (k) => callOcrSpace(k, imageBase64, mimeType), 'OCR.space');
  if (!result.ok) {
    result = await withKeyRotation(geminiKeys, (k) => callGeminiVisionOcr(k, imageBase64, mimeType), 'Gemini Vision (fallback)');
    if (result.ok) return json({ text: result.data, providerUsed: 'gemini-vision', fallbackTriggered: true });
  } else {
    return json({ text: result.data, providerUsed: 'ocr-space' });
  }
  return json({ error: result.error || 'OCR failed on all providers' }, 502);
}

// ---------------- ROUTE: /live/token ----------------
async function handleLiveToken(req, env) {
  const body = await req.json().catch(() => ({}));
  const { subject } = body;

  const model = env.GEMINI_LIVE_MODEL || DEFAULT_LIVE_MODEL;
  const systemInstruction = subject
    ? `${LIVE_TEACHER_SYSTEM_INSTRUCTION}\n\nAaj ka focus subject: ${subject}.`
    : LIVE_TEACHER_SYSTEM_INSTRUCTION;

  const result = await withKeyRotation(
    getKeys(env, 'GEMINI_API_KEY'),
    (k) => mintEphemeralToken(k, model, systemInstruction),
    'Gemini Live Token'
  );

  if (!result.ok) return json({ error: result.error || 'Could not start a live voice session' }, 502);

  return json({
    token: result.data.token,
    expireTime: result.data.expireTime,
    newSessionExpireTime: result.data.newSessionExpireTime,
    model,
    // v1alpha + *Constrained variant is required when connecting with an ephemeral token
    wsUrl: 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained',
  });
}

// ---------------- ENTRY POINT ----------------
export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });

    const url = new URL(req.url);

    if (url.pathname === '/health') return json({ status: 'ok', service: 'ilm-ai-gateway' });

    // Auth check (skip only for /health)
    const auth = req.headers.get('Authorization') || '';
    if (auth !== `Bearer ${env.GATEWAY_SECRET}`) {
      return json({ error: 'Unauthorized — missing or invalid gateway secret' }, 401);
    }

    try {
      if (url.pathname === '/chat' && req.method === 'POST') return await handleChat(req, env);
      if (url.pathname === '/ocr' && req.method === 'POST') return await handleOcr(req, env);
      if (url.pathname === '/live/token' && req.method === 'POST') return await handleLiveToken(req, env);
      return json({ error: 'Not found. Use /chat, /ocr, /live/token, or /health' }, 404);
    } catch (err) {
      return json({ error: `Gateway error: ${err.message}` }, 500);
    }
  },
};
