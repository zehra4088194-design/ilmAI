import assert from 'node:assert/strict';
import test from 'node:test';
import gateway from './handler.mjs';

function chatRequest(provider) {
  return new Request('http://gateway/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-secret' },
    body: JSON.stringify({
      provider,
      tier: 'mini',
      messages: [{ role: 'user', content: 'Reply with OK' }],
    }),
  });
}

test('falls back to Coolify Groq when the selected provider has no key', async () => {
  const originalFetch = globalThis.fetch;
  let authorization = '';
  globalThis.fetch = async (url, options = {}) => {
    assert.match(String(url), /api\.groq\.com/);
    authorization = options.headers.Authorization;
    return Response.json({ choices: [{ message: { content: 'OK' } }] });
  };

  try {
    const response = await gateway.fetch(chatRequest('gpt'), {
      GATEWAY_SECRET: 'test-secret',
      GROQ_API_KEY: 'coolify-groq-key',
    });
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.text, 'OK');
    assert.equal(body.providerUsed, 'groq');
    assert.equal(body.originalProvider, 'gpt');
    assert.equal(body.fallbackTriggered, true);
    assert.equal(authorization, 'Bearer coolify-groq-key');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('readiness requires the universal Groq fallback key', async () => {
  const missing = await gateway.fetch(new Request('http://gateway/ready'), {
    GATEWAY_SECRET: 'test-secret',
  });
  assert.equal(missing.status, 503);

  const ready = await gateway.fetch(new Request('http://gateway/ready'), {
    GATEWAY_SECRET: 'test-secret',
    GROQ_API_KEYS_JSON: JSON.stringify([{ key: 'coolify-groq-key' }]),
  });
  const body = await ready.json();
  assert.equal(ready.status, 200);
  assert.equal(body.status, 'ready');
  assert.equal(body.providers.groq, true);
});

test('handwritten vision returns transcription and summary in one Gemini call', async () => {
  const originalFetch = globalThis.fetch;
  let calls = 0;
  let requestBody;
  globalThis.fetch = async (url, options = {}) => {
    calls += 1;
    assert.match(String(url), /models\/gemini-3\.5-flash-lite:generateContent/);
    requestBody = JSON.parse(options.body);
    return Response.json({
      candidates: [
        {
          content: {
            parts: [{ text: JSON.stringify({ text: 'Force = mass x acceleration', summary: 'Newton second law.' }) }],
          },
        },
      ],
    });
  };

  try {
    const response = await gateway.fetch(
      new Request('http://gateway/document-scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer test-secret' },
        body: JSON.stringify({
          imageBase64: 'aW1hZ2U=',
          mimeType: 'image/png',
          includeSummary: true,
          documentType: 'handwritten',
          language: 'en',
        }),
      }),
      { GATEWAY_SECRET: 'test-secret', GEMINI_API_KEY: 'gemini-key' }
    );
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(calls, 1);
    assert.equal(requestBody.generationConfig.responseMimeType, 'application/json');
    assert.equal(body.text, 'Force = mass x acceleration');
    assert.equal(body.summary, 'Newton second law.');
    assert.equal(body.modelUsed, 'gemini-3.5-flash-lite');
  } finally {
    globalThis.fetch = originalFetch;
  }
});
