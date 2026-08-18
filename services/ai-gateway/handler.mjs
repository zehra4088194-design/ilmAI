/**
 * ============================================================
 * ILM AI - COOLIFY AI GATEWAY HANDLER
 * ============================================================
 * Coolify runs this handler through services/ai-gateway/server.mjs. The
 * Next.js web container never sees a raw provider key.
 *
 * WHAT IT DOES
 * - Holds up to 20 keys per AI provider (Assistant, Grok, Claude, GPT, Gemini)
 * - Accepts Coolify JSON key-pool or single-key variables per provider
 * - Uses keys in strict round-robin order for each provider. Every new request
 *   reserves the next key before its network request starts, then wraps around.
 *   Retry attempts use following keys without resetting that request sequence.
 * - If all keys fail, it can fall back to Assistant unless strict provider mode is requested
 *   so an empty provider response is never sent to the student
 * - Routes handwritten/messy OCR to Gemini Vision. Printed OCR runs in the
 *   private Tesseract/OCRmyPDF container.
 * - Mints short-lived ephemeral tokens for Live Voice Call (see LIVE VOICE
 *   section below) so the browser can talk to Gemini Live directly without
 *   ever seeing a real API key. The token also locks in AUDIO transcription
 *   (input + output) so the Next.js backend can turn a voice lesson into
 *   Short Notes + Flashcards when the call ends (see /api/voice/session-end).
 *
 * docker-compose.oracle.yml injects the secrets into ai-gateway.
 *
 * ------------------------------------------------------------
 * SECRETS REFERENCE (set under Settings → Variables and Secrets)
 * ------------------------------------------------------------
 * GATEWAY_SECRET -> any long random string YOU make up.
 *                   Next.js sends this back as proof it's really your app.
 * GROQ_API_KEYS_JSON or GROQ_API_KEY_1..10 -> ten-key Groq pool
 * GROK_API_KEYS_JSON -> JSON array with up to 20 xAI keys
 * CLAUDE_API_KEYS_JSON -> JSON array with up to 20 Anthropic keys
 * GPT_API_KEYS_JSON -> JSON array with up to 20 OpenAI keys
 * GEMINI_API_KEYS_JSON or GEMINI_API_KEY_1..10 -> ten-key Gemini pool
 * OCRSPACE_API_KEYS_JSON -> JSON array with up to 20 OCR.space keys
 * OPENROUTER_API_KEY -> ONE OpenRouter key. It serves the free router first and
 *                       retries on DeepSeek V4 Flash only if that call fails.
 *                       No pool, no JSON, no rotation for this provider.
 * DEEPSEEK_API_KEY -> one direct DeepSeek key
 * Numbered PREFIX_1 .. PREFIX_20 secrets remain backwards-compatible.
 *
 * OPTIONAL (Live Voice Call — has a safe built-in default, only set if you
 * want to override without waiting for a redeploy):
 * GEMINI_LIVE_MODEL -> defaults to 'gemini-3.1-flash-live-preview'.
 *                      ⚠️ Google renames/deprecates Live API preview models
 *                      often — if voice calls start failing with a "model
 *                      not found" close error, check the current model list
 *                      at https://ai.google.dev/gemini-api/docs/live-api and
 *                      set this secret to the current one, no redeploy needed.
 * ============================================================
 */

// ---------- MODEL MAP (edit anytime, no redeploy needed elsewhere) ----------
// General Gemini tools and document vision use separate models. Document
// vision favors the lighter model because it is optimized for extraction.
const GEMINI_FLASH_MODEL = 'gemini-3.5-flash-lite';
const GEMINI_DOCUMENT_MODEL = 'gemini-3.5-flash-lite';

// OpenRouter serves its free router first and only falls back to DeepSeek V4
// Flash — same OpenRouter API, same single key — when the free router actually
// fails (API error, timeout, unavailable model/provider, or an empty response).
// A successful free-router reply never triggers a second request.
const OPENROUTER_FREE_MODEL = 'openrouter/free';

const DEFAULT_MODEL_MAP = {
  local: {
    mini: 'qwen3-4b-q4',
    medium: 'qwen3-4b-q4',
    pro: 'qwen3-4b-q4',
  },
  groq: {
    // 'llama-3.1-8b-instant' was decommissioned on Groq's side ("model does not exist or you do
    // not have access to it" on every mini-tier call — Free Lite quick-help chat and any other
    // 'groq'+'mini' route). Reusing the medium/pro model here (confirmed still valid) until a
    // cheaper current small model is picked — override per-tier anytime via GROQ_MINI_MODEL in
    // Coolify without a redeploy (see getModel() below).
    mini: 'llama-3.3-70b-versatile',
    medium: 'llama-3.3-70b-versatile',
    pro: 'llama-3.3-70b-versatile',
  },
  grok: {
    mini: 'grok-4.5',
    medium: 'grok-4.5',
    pro: 'grok-4.5',
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
    mini: GEMINI_FLASH_MODEL,
    medium: GEMINI_FLASH_MODEL,
    pro: GEMINI_FLASH_MODEL,
  },
  deepseek: {
    mini: 'deepseek-v4-flash',
    medium: 'deepseek-v4-flash',
    pro: 'deepseek-v4-flash',
  },
  openrouter: {
    mini: OPENROUTER_FREE_MODEL,
    medium: OPENROUTER_FREE_MODEL,
    pro: OPENROUTER_FREE_MODEL,
  },
};

const MODEL_ENV_PREFIX = {
  groq: 'GROQ',
  grok: 'GROK',
  claude: 'CLAUDE',
  gpt: 'GPT',
  gemini: 'GEMINI',
  deepseek: 'DEEPSEEK',
  openrouter: 'OPENROUTER',
};

function getModel(env, provider, tier) {
  if (provider === 'local' && env.LLAMA_CPP_MODEL) return env.LLAMA_CPP_MODEL;
  if (provider === 'gemini' && env.GEMINI_FLASH_MODEL) return env.GEMINI_FLASH_MODEL;
  const prefix = MODEL_ENV_PREFIX[provider];
  const override = prefix ? env[`${prefix}_${String(tier).toUpperCase()}_MODEL`] : '';
  return override || DEFAULT_MODEL_MAP[provider]?.[tier] || DEFAULT_MODEL_MAP.groq.mini;
}

// The whole OpenRouter chain: free router, then DeepSeek V4 Flash. Both run on
// the one OPENROUTER_API_KEY.
const OPENROUTER_CHAIN = [OPENROUTER_FREE_MODEL, 'deepseek/deepseek-v4-flash'];

// Per-request ceiling so a stalled free-router call surfaces as a failure and
// hands over to DeepSeek instead of holding the whole chain past the caller's
// own 90s gateway timeout.
const OPENROUTER_TIMEOUT_MS = 30_000;

// Default Live Voice Call model — see GEMINI_LIVE_MODEL override note above.
const DEFAULT_LIVE_MODEL = 'gemini-3.1-flash-live-preview';

// The AI Teacher persona for Live Voice Call. Locked into the ephemeral
// token server-side (via AuthToken.bidiGenerateContentSetup) so it can never be
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

// Daily call ceilings PER USER for non-default providers, by model tier.
// (Actual per-user counting happens in the Next.js backend via Supabase and the
// optional shared quota store —
// this object is just exposed back in responses so the backend can display/enforce it.)
const TIER_DAILY_LIMITS = { mini: 10, medium: 7, pro: 3 };

const KEY_COUNT = 20;
const DEFAULT_KEY_ATTEMPTS = KEY_COUNT;
const RETRYABLE_STATUS = new Set([401, 403, 429, 500, 502, 503, 504]);
const keyCursors = new Map();
const keyFailures = new Map();

function recordKeyFailure(provider, label, keyIndex, status, error) {
  const keyNumber = keyIndex + 1;
  const id = `${provider}:${keyNumber}`;
  const current = keyFailures.get(id) || {
    id,
    provider,
    label,
    keyNumber,
    failureCount: 0,
    lastStatus: null,
    lastError: null,
    lastFailedAt: null,
  };
  current.failureCount += 1;
  current.lastStatus = status || null;
  current.lastError = String(error || 'Provider request failed').slice(0, 500);
  current.lastFailedAt = new Date().toISOString();
  keyFailures.set(id, current);
}

function getKeyHealth(env) {
  const providers = [
    ['groq', 'GROQ_API_KEY'],
    ['grok', 'GROK_API_KEY'],
    ['claude', 'CLAUDE_API_KEY'],
    ['gpt', 'GPT_API_KEY'],
    ['gemini', 'GEMINI_API_KEY'],
    ['deepseek', 'DEEPSEEK_API_KEY'],
    ['openrouter', 'OPENROUTER_API_KEY'],
    ['ocrSpace', 'OCRSPACE_API_KEY'],
  ];

  return providers.map(([provider, prefix]) => {
    // OpenRouter is single-key by design, so it never reads a pool.
    const configuredKeys = provider === 'openrouter' ? (env.OPENROUTER_API_KEY ? 1 : 0) : getKeys(env, prefix).length;
    const failures = Array.from(keyFailures.values())
      .filter((item) => item.provider === provider)
      .sort((left, right) => String(right.lastFailedAt).localeCompare(String(left.lastFailedAt)));
    return { provider, configuredKeys, failures };
  });
}

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
  const numberedKeys = [];
  for (let i = 1; i <= KEY_COUNT; i++) {
    const key = env[`${prefix}_${i}`];
    if (key) numberedKeys.push(key);
  }
  // The production Groq/Gemini pools intentionally use ten explicit Coolify
  // slots. When any numbered slots exist, ignore legacy JSON/single fields so
  // an old secret cannot silently become an eleventh key or alter 1..10 order.
  if ((prefix === 'GROQ_API_KEY' || prefix === 'GEMINI_API_KEY') && numberedKeys.length) {
    return [...new Set(numberedKeys.map((key) => String(key).trim()).filter(Boolean))].slice(0, 10);
  }
  const jsonSecretName = `${prefix.replace(/_KEY$/, '_KEYS')}_JSON`;
  const jsonSecret = env[jsonSecretName];
  if (jsonSecret) {
    try {
      const parsed = JSON.parse(jsonSecret);
      if (Array.isArray(parsed)) {
        keys.push(...parsed.map((item) => (item && typeof item === 'object' ? item.key : item)));
      }
    } catch {
      // Also accept newline/comma separated values for easier dashboard setup.
      keys.push(...String(jsonSecret).split(/[\r\n,]+/));
    }
  }
  if (env[prefix]) keys.push(env[prefix]);
  keys.push(...numberedKeys);
  return [...new Set(keys.map((key) => String(key).trim()).filter(Boolean))].slice(0, KEY_COUNT);
}

/**
 * Reserves the next provider key before its network request starts.
 * Retries following keys only for auth, rate-limit, or server errors.
 * Does NOT rotate on 400 (bad request) — rotating won't fix a malformed request.
 */
async function withKeyRotation(keys, callFn, label, maxAttempts = DEFAULT_KEY_ATTEMPTS, cursorKey = label) {
  if (!keys.length) return { ok: false, error: `No keys configured for ${label}` };
  let lastError = null;
  const start = keyCursors.get(cursorKey) || 0;
  const attemptCount = Math.min(keys.length, Math.max(1, maxAttempts));
  // Claim this request's first key before the first await. Do not update the
  // cursor after a provider response: a later request may already have claimed
  // its key while this request was in flight.
  keyCursors.set(cursorKey, (start + 1) % keys.length);

  for (let i = 0; i < attemptCount; i++) {
    const keyIndex = (start + i) % keys.length;
    try {
      const result = await callFn(keys[keyIndex]);
      if (result.ok) {
        if (typeof result.data === 'string' && !result.data.trim()) {
          lastError = `${label} key #${keyIndex + 1} returned an empty response`;
          recordKeyFailure(cursorKey, label, keyIndex, 502, lastError);
          continue;
        }
        return { ok: true, data: result.data, keyIndexUsed: keyIndex + 1 };
      }
      if (!RETRYABLE_STATUS.has(result.status)) {
        recordKeyFailure(cursorKey, label, keyIndex, result.status, result.error);
        return { ok: false, error: result.error || `${label} request failed`, status: result.status };
      }
      lastError = result.error || `${label} key #${keyIndex + 1} failed (status ${result.status})`;
      recordKeyFailure(cursorKey, label, keyIndex, result.status, lastError);
    } catch (err) {
      lastError = `${label} key #${keyIndex + 1} network error: ${err?.message || 'unknown error'}`;
      recordKeyFailure(cursorKey, label, keyIndex, 'network', lastError);
    }
  }
  return {
    ok: false,
    error: `${label} failed after ${attemptCount}/${keys.length} configured key attempts. Last error: ${lastError}`,
  };
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

async function callLocalLlama(env, model, messages, maxTokens, temperature) {
  const baseUrl = String(env.LLAMA_CPP_URL || '').replace(/\/$/, '');
  if (!baseUrl) return { ok: false, status: 503, error: 'LLAMA_CPP_URL is not configured' };
  const headers = { 'Content-Type': 'application/json' };
  if (env.LLAMA_CPP_API_KEY) headers.Authorization = `Bearer ${env.LLAMA_CPP_API_KEY}`;

  try {
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream: false,
        chat_template_kwargs: { enable_thinking: false },
      }),
      signal: AbortSignal.timeout(Math.max(30_000, Number(env.LLAMA_CPP_TIMEOUT_MS) || 180_000)),
    });
    if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
    const payload = await res.json();
    const rawText = String(payload.choices?.[0]?.message?.content || '');
    const text = rawText.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
    return { ok: true, data: text, modelUsed: payload.model || model };
  } catch (error) {
    return { ok: false, status: 503, error: `Local llama.cpp request failed: ${error.message}` };
  }
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

async function callGrok(key, model, messages, maxTokens) {
  const res = await fetch('https://api.x.ai/v1/responses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model,
      input: messages,
      max_output_tokens: maxTokens,
      reasoning: { effort: 'low' },
    }),
  });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const payload = await res.json();
  const text =
    payload.output_text ||
    payload.output
      ?.flatMap((item) => item.content || [])
      .map((part) => part.text || '')
      .join('') ||
    '';
  return { ok: true, data: text };
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

async function callGemini(key, model, messages, maxTokens) {
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
      generationConfig: { maxOutputTokens: maxTokens },
    }),
  });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const json = await res.json();
  const text = json.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || '';
  return { ok: true, data: text };
}

async function callOpenRouter(key, model, messages, maxTokens, temperature) {
  const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
      'HTTP-Referer': 'https://ilmai.study',
      'X-Title': 'ilm AI',
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature }),
    signal: AbortSignal.timeout(OPENROUTER_TIMEOUT_MS),
  });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const payload = await res.json();
  return { ok: true, data: payload.choices?.[0]?.message?.content || '' };
}

async function callDeepSeek(key, model, messages, maxTokens, temperature) {
  const res = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens, temperature, stream: false }),
  });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const payload = await res.json();
  const text = payload.choices?.[0]?.message?.content || '';
  return text ? { ok: true, data: text } : { ok: false, status: 502, error: 'DeepSeek returned an empty response.' };
}

/**
 * OpenRouter runs on ONE key (OPENROUTER_API_KEY) — no key pool, no rotation.
 * That single key tries the free router first; only if that call actually
 * fails does the same key retry on DeepSeek V4 Flash. A successful free-router
 * reply returns immediately, so DeepSeek is never billed a second request.
 */
async function withOpenRouterFallback(env, messages, maxTokens, temperature) {
  const key = String(env.OPENROUTER_API_KEY || '').trim();
  if (!key) return { ok: false, error: 'No key configured for OpenRouter (set OPENROUTER_API_KEY)' };

  let lastError = null;
  for (const model of OPENROUTER_CHAIN) {
    try {
      const result = await callOpenRouter(key, model, messages, maxTokens, temperature);
      if (result.ok && String(result.data || '').trim()) return { ok: true, data: result.data, modelUsed: model };
      lastError = result.error || `OpenRouter ${model} returned an empty response`;
      recordKeyFailure('openrouter', `OpenRouter ${model}`, 0, result.status || 502, lastError);
    } catch (err) {
      lastError = `OpenRouter ${model} network error: ${err?.message || 'unknown error'}`;
      recordKeyFailure('openrouter', `OpenRouter ${model}`, 0, 'network', lastError);
    }
  }

  return { ok: false, error: `OpenRouter free router and DeepSeek fallback both failed. Last error: ${lastError}` };
}

function parseGeminiDocumentPayload(rawText, includeSummary) {
  const cleaned = rawText
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  if (!includeSummary) return { text: cleaned };

  try {
    const parsed = JSON.parse(cleaned);
    return {
      text: String(parsed.text || '').trim(),
      summary: String(parsed.summary || '').trim(),
    };
  } catch {
    return { text: '', summary: '' };
  }
}

async function callGeminiDocumentWithModel(key, model, base64Image, mimeType, options = {}) {
  const includeSummary = options.includeSummary === true;
  const documentType = String(options.documentType || 'document').replace(/[^a-z_-]/gi, ' ');
  const language = String(options.language || 'en').replace(/[^a-z-]/gi, '');
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: includeSummary
                ? `Analyze this ${documentType} image. Transcribe ALL visible text exactly as written, including handwriting, labels, equations, symbols, and diagram annotations. Then write a concise, student-friendly summary in language code "${language}". Do not invent unclear content. Return only valid JSON with exactly this shape: {"text":"complete transcription","summary":"concise summary"}.`
                : 'Transcribe ALL visible text from this image exactly as written, including handwriting. Return ONLY the transcribed text, no commentary, no markdown formatting.',
            },
            { inline_data: { mime_type: mimeType, data: base64Image } },
          ],
        },
      ],
      generationConfig: {
        maxOutputTokens: includeSummary ? 4096 : 2048,
        temperature: 0.1,
        ...(includeSummary ? { responseMimeType: 'application/json' } : {}),
      },
    }),
  });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const json = await res.json();
  const rawText =
    json.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || '')
      .join('')
      .trim() || '';
  const data = parseGeminiDocumentPayload(rawText, includeSummary);
  if (!data.text) return { ok: false, status: 502, error: 'Gemini document scan returned no readable text' };
  if (includeSummary && !data.summary) {
    return { ok: false, status: 502, error: 'Gemini document scan returned no summary' };
  }
  return { ok: true, data };
}

async function callGeminiDocument(key, base64Image, mimeType, options) {
  return callGeminiDocumentWithModel(key, GEMINI_DOCUMENT_MODEL, base64Image, mimeType, options);
}

async function callOcrSpace(key, base64Image, mimeType, language = 'eng') {
  const form = new FormData();
  form.append('base64Image', `data:${mimeType};base64,${base64Image}`);
  form.append('language', language === 'urd' ? 'urd' : 'eng');
  form.append('isOverlayRequired', 'false');
  form.append('detectOrientation', 'true');
  form.append('scale', 'true');
  form.append('OCREngine', '2');

  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST',
    headers: { apikey: key },
    body: form,
  });
  if (!res.ok) return { ok: false, status: res.status, error: await res.text() };
  const payload = await res.json();
  if (payload.IsErroredOnProcessing) {
    const messages = Array.isArray(payload.ErrorMessage) ? payload.ErrorMessage.join('; ') : payload.ErrorMessage;
    return { ok: false, status: 422, error: messages || 'OCR.space could not process the file' };
  }
  const text = (payload.ParsedResults || [])
    .map((page) => page.ParsedText || '')
    .join('\n\n')
    .trim();
  return { ok: true, data: text };
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
    authToken: {
      uses: 1,
      expireTime: new Date(now + 30 * 60 * 1000).toISOString(), // session can run 30 min
      newSessionExpireTime: new Date(now + 60 * 1000).toISOString(), // must START within 1 min
      bidiGenerateContentSetup: {
        model: `models/${model}`,
        generationConfig: {
          responseModalities: ['AUDIO'],
        },
        systemInstruction: { parts: [{ text: systemInstruction }] },
        inputAudioTranscription: {},
        outputAudioTranscription: {},
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
  return {
    ok: true,
    data: { token: data.name, expireTime: data.expireTime, newSessionExpireTime: data.newSessionExpireTime },
  };
}

// ---------------- ROUTE: /chat ----------------
async function handleChat(req, env) {
  const body = await req.json();
  const {
    provider = 'groq',
    tier = 'mini',
    messages,
    max_tokens = 2048,
    temperature = 0.7,
    strict_provider = false,
  } = body;

  if (!messages || !Array.isArray(messages)) return json({ error: 'messages array required' }, 400);

  const model = getModel(env, provider, tier);
  let result;

  if (provider === 'local') {
    result = await callLocalLlama(env, model, messages, max_tokens, temperature);
  } else if (provider === 'groq') {
    result = await withKeyRotation(
      getKeys(env, 'GROQ_API_KEY'),
      (k) => callGroq(k, model, messages, max_tokens, temperature),
      'Assistant',
      DEFAULT_KEY_ATTEMPTS,
      'groq'
    );
  } else if (provider === 'grok') {
    result = await withKeyRotation(
      getKeys(env, 'GROK_API_KEY'),
      (k) => callGrok(k, model, messages, max_tokens),
      'Grok',
      DEFAULT_KEY_ATTEMPTS,
      'grok'
    );
  } else if (provider === 'claude') {
    result = await withKeyRotation(
      getKeys(env, 'CLAUDE_API_KEY'),
      (k) => callClaude(k, model, messages, max_tokens),
      'Claude',
      DEFAULT_KEY_ATTEMPTS,
      'claude'
    );
  } else if (provider === 'gpt') {
    result = await withKeyRotation(
      getKeys(env, 'GPT_API_KEY'),
      (k) => callOpenAI(k, model, messages, max_tokens, temperature),
      'GPT',
      DEFAULT_KEY_ATTEMPTS,
      'gpt'
    );
  } else if (provider === 'gemini') {
    result = await withKeyRotation(
      getKeys(env, 'GEMINI_API_KEY'),
      (k) => callGemini(k, model, messages, max_tokens),
      'Gemini',
      DEFAULT_KEY_ATTEMPTS,
      'gemini'
    );
  } else if (provider === 'deepseek') {
    result = await withKeyRotation(
      getKeys(env, 'DEEPSEEK_API_KEY'),
      (k) => callDeepSeek(k, model, messages, max_tokens, temperature),
      'DeepSeek',
      DEFAULT_KEY_ATTEMPTS,
      'deepseek'
    );
  } else if (provider === 'openrouter') {
    result = await withOpenRouterFallback(env, messages, max_tokens, temperature);
  } else {
    return json({ error: `Unknown provider: ${provider}` }, 400);
  }

  // Missing or exhausted paid-provider keys fall directly back to Groq. This
  // keeps optional providers optional and avoids spending through another paid
  // provider merely because the selected provider has not been configured.
  if (!strict_provider && !result.ok && provider !== 'groq') {
    const groqFallback = await withKeyRotation(
      getKeys(env, 'GROQ_API_KEY'),
      (k) => callGroq(k, getModel(env, 'groq', 'mini'), messages, max_tokens, temperature),
      'Assistant (fallback)',
      DEFAULT_KEY_ATTEMPTS,
      'groq'
    );
    if (groqFallback.ok) {
      return json({
        text: groqFallback.data,
        providerUsed: 'groq',
        modelUsed: getModel(env, 'groq', 'mini'),
        keyIndexUsed: groqFallback.keyIndexUsed,
        fallbackTriggered: true,
        originalProvider: provider,
        dailyLimit: TIER_DAILY_LIMITS[tier],
      });
    }
  }

  if (!result.ok) return json({ error: result.error || 'All providers failed' }, 502);
  return json({
    text: result.data,
    providerUsed: provider,
    modelUsed: result.modelUsed || model,
    keyIndexUsed: result.keyIndexUsed,
    dailyLimit: TIER_DAILY_LIMITS[tier],
  });
}

// ---------------- ROUTE: /document-scan ----------------
async function handleDocumentScan(req, env) {
  const body = await req.json();
  const {
    imageBase64,
    mimeType = 'image/jpeg',
    includeSummary = false,
    documentType = 'document',
    language = 'en',
  } = body;
  if (!imageBase64) return json({ error: 'imageBase64 required' }, 400);

  const geminiKeys = getKeys(env, 'GEMINI_API_KEY');
  const result = await withKeyRotation(
    geminiKeys,
    (key) => callGeminiDocument(key, imageBase64, mimeType, { includeSummary, documentType, language }),
    'Gemini document scan',
    DEFAULT_KEY_ATTEMPTS,
    'gemini'
  );
  if (!result.ok) return json({ error: result.error || 'Gemini document scan failed' }, 502);
  return json({
    text: result.data.text,
    summary: result.data.summary,
    providerUsed: 'gemini-flash-lite',
    modelUsed: GEMINI_DOCUMENT_MODEL,
    keyIndexUsed: result.keyIndexUsed,
  });
}

async function handleOcrSpace(req, env) {
  const body = await req.json();
  const { imageBase64, mimeType = 'image/jpeg', language = 'eng' } = body;
  if (!imageBase64) return json({ error: 'imageBase64 required' }, 400);

  const result = await withKeyRotation(
    getKeys(env, 'OCRSPACE_API_KEY'),
    (key) => callOcrSpace(key, imageBase64, mimeType, language),
    'OCR.space',
    DEFAULT_KEY_ATTEMPTS,
    'ocrspace'
  );
  if (!result.ok) return json({ error: result.error || 'OCR.space failed' }, 502);
  return json({ text: result.data, providerUsed: 'ocr-space', keyIndexUsed: result.keyIndexUsed });
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
    'Gemini Live Token',
    DEFAULT_KEY_ATTEMPTS,
    'gemini'
  );

  if (!result.ok) return json({ error: result.error || 'Could not start a live voice session' }, 502);

  return json({
    token: result.data.token,
    expireTime: result.data.expireTime,
    newSessionExpireTime: result.data.newSessionExpireTime,
    model,
    keyIndexUsed: result.keyIndexUsed,
    // v1alpha + *Constrained variant is required when connecting with an ephemeral token
    wsUrl:
      'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContentConstrained',
  });
}

// ---------------- ENTRY POINT ----------------
export default {
  async fetch(req, env) {
    if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders() });

    const url = new URL(req.url);

    if (url.pathname === '/health') return json({ status: 'ok', service: 'ilm-ai-gateway' });
    if (url.pathname === '/ready') {
      const providers = {
        local: Boolean(env.LLAMA_CPP_URL),
        groq: getKeys(env, 'GROQ_API_KEY').length > 0,
        grok: getKeys(env, 'GROK_API_KEY').length > 0,
        claude: getKeys(env, 'CLAUDE_API_KEY').length > 0,
        gpt: getKeys(env, 'GPT_API_KEY').length > 0,
        gemini: getKeys(env, 'GEMINI_API_KEY').length > 0,
        deepseek: getKeys(env, 'DEEPSEEK_API_KEY').length > 0,
        openrouter: Boolean(env.OPENROUTER_API_KEY),
        ocrSpace: getKeys(env, 'OCRSPACE_API_KEY').length > 0,
      };
      const ready = providers.local || providers.gemini || providers.deepseek || providers.groq;
      return json(
        {
          status: ready ? 'ready' : 'not_ready',
          service: 'ilm-ai-gateway',
          primaryProvider: providers.gemini ? 'gemini' : providers.deepseek ? 'deepseek' : providers.local ? 'local' : 'groq',
          fallbackProvider: providers.groq ? 'groq' : null,
          providers,
          error: ready ? undefined : 'Configure GEMINI_API_KEY_1, DEEPSEEK_API_KEY, LLAMA_CPP_URL, or a Groq key in Coolify.',
        },
        ready ? 200 : 503
      );
    }

    // Auth check (skip only for /health)
    const auth = req.headers.get('Authorization') || '';
    if (auth !== `Bearer ${env.GATEWAY_SECRET}`) {
      return json({ error: 'Unauthorized — missing or invalid gateway secret' }, 401);
    }

    try {
      if (url.pathname === '/chat' && req.method === 'POST') return await handleChat(req, env);
      if (url.pathname === '/document-scan' && req.method === 'POST') return await handleDocumentScan(req, env);
      if (url.pathname === '/ocr-space' && req.method === 'POST') return await handleOcrSpace(req, env);
      if (url.pathname === '/live/token' && req.method === 'POST') return await handleLiveToken(req, env);
      if (url.pathname === '/key-health' && req.method === 'GET') {
        return json({ status: 'success', data: getKeyHealth(env), generatedAt: new Date().toISOString() });
      }
      return json({ error: 'Not found. Use /chat, /document-scan, /ocr-space, /live/token, /key-health, /health, or /ready' }, 404);
    } catch (err) {
      return json({ error: `Gateway error: ${err.message}` }, 500);
    }
  },
};
