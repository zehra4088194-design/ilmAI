# Private AI Gateway

This Node service runs only on Coolify's private Docker network. The public Next.js web container calls it through `http://ai-gateway:8787`; raw provider keys never reach the browser or the web container.

## Required Coolify variables

- `AI_GATEWAY_SECRET`: shared by the `web` and `ai-gateway` services.
- `GROQ_API_KEY` or `GROQ_API_KEYS_JSON` is required because Groq is the universal text fallback.
- Other providers are optional; selecting one without a configured/working key automatically falls back to Groq.

## Provider keys

JSON arrays support up to 20 rotating keys. A singular variable can be used for one key.

| Provider   | Key pool                   | Singular key         |
| ---------- | -------------------------- | -------------------- |
| Groq       | `GROQ_API_KEYS_JSON`       | `GROQ_API_KEY`       |
| xAI Grok   | `GROK_API_KEYS_JSON`       | `GROK_API_KEY`       |
| Anthropic  | `CLAUDE_API_KEYS_JSON`     | `CLAUDE_API_KEY`     |
| OpenAI     | `GPT_API_KEYS_JSON`        | `GPT_API_KEY`        |
| Gemini     | `GEMINI_API_KEYS_JSON`     | `GEMINI_API_KEY`     |
| OpenRouter | `OPENROUTER_API_KEYS_JSON` | `OPENROUTER_API_KEY` |
| OCR.space  | `OCRSPACE_API_KEYS_JSON`   | `OCRSPACE_API_KEY`   |

Example pool:

```json
["key-one", "key-two"]
```

## Model overrides

- `GROQ_MINI_MODEL`, `GROQ_MEDIUM_MODEL`, `GROQ_PRO_MODEL`
- `GROK_MINI_MODEL`, `GROK_MEDIUM_MODEL`, `GROK_PRO_MODEL`
- `CLAUDE_MINI_MODEL`, `CLAUDE_MEDIUM_MODEL`, `CLAUDE_PRO_MODEL`
- `GPT_MINI_MODEL`, `GPT_MEDIUM_MODEL`, `GPT_PRO_MODEL`
- `GEMINI_FLASH_MODEL`, `GEMINI_LIVE_MODEL`, `GEMINI_VISION_MODEL`
- `OPENROUTER_MODELS_JSON`

Changing a Coolify variable requires redeploying the Compose resource so the private gateway container receives the new environment.

`GET /health` checks the process. `GET /ready` checks that the mandatory Groq fallback key is configured; Coolify uses `/ready` for container health.
