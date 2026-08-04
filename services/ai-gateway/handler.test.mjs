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

test('local llama.cpp serves chat without a provider API key', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (url, options = {}) => {
    assert.equal(String(url), 'http://llama:8080/v1/chat/completions');
    requestBody = JSON.parse(options.body);
    return Response.json({
      model: 'qwen3-4b-q4',
      choices: [{ message: { content: '<think>hidden</think>\nThe answer.' } }],
    });
  };

  try {
    const response = await gateway.fetch(chatRequest('local'), {
      GATEWAY_SECRET: 'test-secret',
      LLAMA_CPP_URL: 'http://llama:8080/v1',
      LLAMA_CPP_MODEL: 'qwen3-4b-q4',
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.text, 'The answer.');
    assert.equal(body.providerUsed, 'local');
    assert.equal(body.modelUsed, 'qwen3-4b-q4');
    assert.deepEqual(requestBody.chat_template_kwargs, { enable_thinking: false });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('readiness accepts local llama.cpp without Groq', async () => {
  const response = await gateway.fetch(new Request('http://gateway/ready'), {
    GATEWAY_SECRET: 'test-secret',
    LLAMA_CPP_URL: 'http://llama:8080/v1',
  });
  const body = await response.json();
  assert.equal(response.status, 200);
  assert.equal(body.primaryProvider, 'local');
  assert.equal(body.providers.groq, false);
});

test('direct DeepSeek key serves text without OpenRouter', async () => {
  const originalFetch = globalThis.fetch;
  let requestBody;
  globalThis.fetch = async (url, options = {}) => {
    assert.equal(String(url), 'https://api.deepseek.com/chat/completions');
    assert.equal(options.headers.Authorization, 'Bearer direct-deepseek-key');
    requestBody = JSON.parse(options.body);
    return Response.json({ choices: [{ message: { content: 'Direct response' } }] });
  };

  try {
    const response = await gateway.fetch(chatRequest('deepseek'), {
      GATEWAY_SECRET: 'test-secret',
      DEEPSEEK_API_KEY: 'direct-deepseek-key',
    });
    const body = await response.json();
    assert.equal(response.status, 200);
    assert.equal(body.providerUsed, 'deepseek');
    assert.equal(body.modelUsed, 'deepseek-v4-flash');
    assert.equal(requestBody.model, 'deepseek-v4-flash');
  } finally {
    globalThis.fetch = originalFetch;
  }
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
