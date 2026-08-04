# Private AI Gateway

This Node service runs only on Coolify's private Docker network. The public Next.js web container calls it through `http://ai-gateway:8787`; raw provider keys never reach the browser or the web container. TXT-grounded resource tools use the private `llama.cpp` service first.

## Required Coolify variables

- `AI_GATEWAY_SECRET`: shared by the `web` and `ai-gateway` services.
- `LLAMA_CPP_URL`: supplied by Compose as `http://llama:8080/v1`.
- Groq and every hosted provider are optional fallbacks.

## Local model

Compose runs the official ARM64 `llama.cpp` server with `Qwen/Qwen3-4B-GGUF:Q4_K_M`. Its cache is stored in the persistent `llama-cache` volume, so the model is downloaded once rather than on every deployment.

Resource summaries, resource analysis, and tests receive only the resource's attached companion `.txt`. A missing or unreadable TXT returns an error; the application never loads the PDF and sends it through OCR as an AI fallback.

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
- `LLAMA_CPP_HF_REPO`, `LLAMA_CPP_MODEL`, `LLAMA_CPP_CONTEXT_SIZE`, `LLAMA_CPP_THREADS`, `LLAMA_CPP_TIMEOUT_MS`

Changing a Coolify variable requires redeploying the Compose resource so the private gateway container receives the new environment.

`GET /health` checks the process. `GET /ready` succeeds when local llama.cpp is configured or a Groq fallback key exists; Coolify uses `/ready` for container health.
