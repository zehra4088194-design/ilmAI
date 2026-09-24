// ============================================
// ROBUST JSON EXTRACTION FOR AI RESPONSES
// LLMs sometimes wrap JSON in markdown fences, add a preamble sentence,
// or sprinkle in **bold** markers. This pulls out just the JSON by
// bracket-depth matching instead of trusting the model followed
// instructions exactly — much more resilient than a plain regex strip.
// ============================================

/** Strips markdown fences/bold, then finds the first balanced [...] or {...} block. */
export function extractJson(raw: string): string {
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```/g, '').trim();
  cleaned = cleaned.replace(/\*\*/g, '').trim();

  const startIndex = cleaned.search(/[[{]/);
  if (startIndex === -1) return cleaned;

  const openChar = cleaned[startIndex];
  const closeChar = openChar === '[' ? ']' : '}';
  let depth = 0;
  let endIndex = -1;

  for (let i = startIndex; i < cleaned.length; i++) {
    if (cleaned[i] === openChar) depth++;
    else if (cleaned[i] === closeChar) {
      depth--;
      if (depth === 0) { endIndex = i; break; }
    }
  }

  return endIndex > -1 ? cleaned.slice(startIndex, endIndex + 1) : cleaned.slice(startIndex);
}

/** Parses an AI response as JSON, with a fallback value if parsing still fails after extraction. */
export function parseAiJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(extractJson(raw)) as T;
  } catch {
    return fallback;
  }
}
