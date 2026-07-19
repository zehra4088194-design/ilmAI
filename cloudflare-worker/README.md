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

## Local gateway

The same Worker source can run locally through `services/ai-gateway/server.mjs`. Set `AI_GATEWAY_URL=http://localhost:8787` and `AI_GATEWAY_SECRET` in `.env.local`.
