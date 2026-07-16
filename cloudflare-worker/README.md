# ilm AI Gateway — Cloudflare Worker

This is the secret vault + failover router for every AI/OCR call the app makes.
Full guided steps are in **ilm AI - Deployment Guide.docx** (section "Cloudflare Worker Setup").

Quick version:

1. Cloudflare Dashboard → Workers & Pages → Create → "Create Worker"
2. Replace the default code with the contents of `worker.js`
3. Settings → Variables and Secrets → add every secret listed at the top of `worker.js`
4. Deploy
5. In your Next.js project's `.env.local`, set:
   ```
   AI_GATEWAY_URL=https://ilm-ai1.noorhusnain791.workers.dev
   AI_GATEWAY_SECRET=<same value you set as GATEWAY_SECRET in step 3>
   ```
6. Test it: `curl https://ilm-ai1.noorhusnain791.workers.dev/health`

Use one JSON secret per provider. This fits all seven 20-key pools under the Cloudflare Workers Free environment-variable limit:

```text
GROQ_API_KEYS_JSON=["gsk_...","gsk_..."]
GROK_API_KEYS_JSON=["xai-...","xai-..."]
CLAUDE_API_KEYS_JSON=["sk-ant-..."]
GPT_API_KEYS_JSON=["sk-..."]
GEMINI_API_KEYS_JSON=["AIza...","AIza..."]
OPENROUTER_API_KEYS_JSON=["sk-or-..."]
OCR_API_KEYS_JSON=["...","..."]
```

Each array supports up to 20 unique keys. Existing numbered secrets such as `GROQ_API_KEY_1` still work and are merged with the JSON pool. Never commit real key arrays to this repository.

The Worker rotates the starting key between requests and bounds retries so one request remains below Cloudflare Free's 50-subrequest ceiling. After every Worker deploy, run `node scripts/check-ai-gateway.js` from the project root.
