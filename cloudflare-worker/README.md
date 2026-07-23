# ilm AI AI gateway

`worker.js` contains the provider routing and key-pool logic for the lightweight Cloudflare Worker gateway. It is separate from the Next.js web container and never exposes raw provider keys to the browser.

## Deploy

From this directory:

```bash
npm install -g wrangler
wrangler login
wrangler deploy --config wrangler.toml
```

Set secrets with Wrangler. Use only authorized API keys and do not use multiple personal accounts to bypass provider quotas or terms:

```bash
wrangler secret put GATEWAY_SECRET
wrangler secret put GROQ_API_KEYS_JSON
wrangler secret put GEMINI_API_KEYS_JSON
wrangler secret put OPENROUTER_API_KEYS_JSON
wrangler secret put OCRSPACE_API_KEYS_JSON
```

The Worker exposes `/health`, `/chat`, `/ocr`, `/ocr-space`, and `/live/token`. All routes except `/health` require the `Authorization: Bearer ...` value matching `GATEWAY_SECRET`.

## Key order

Put keys in `*_API_KEYS_JSON` in the exact order you want them used, for example:

```json
["first-key", "second-key", "third-key"]
```

Each provider has its own round-robin queue. The first request uses key 1, the
next uses key 2, then key 3, and it wraps back to key 1. This same queue is
shared by the provider's chat, OCR, and Live-token routes. A retry moves to a
following key only when the provider returns an auth, quota, or server error.

## Local gateway

The same Worker source can run locally through `services/ai-gateway/server.mjs`. Set `AI_GATEWAY_URL=http://localhost:8787` and `AI_GATEWAY_SECRET` in `.env.local`.
