import { gatewayChat, type AiProviderId } from '@/lib/ai/gateway';
import { parseAiJson } from '@/lib/utils/json-extract';
import { getPlatformSettings } from '@/lib/platform-settings/server';
import { getAdminAiProvider } from '@/lib/platform-settings/shared';

export type ContentProfile = 'language' | 'stem' | 'general';
export type ExtendedKind = 'LETTER' | 'VOCAB' | 'GRAMMAR' | 'NUMERICAL';

export const EXTENDED_KINDS_BY_PROFILE: Record<ContentProfile, ExtendedKind[]> = {
  language: ['LETTER', 'VOCAB', 'GRAMMAR'],
  stem: ['NUMERICAL'],
  general: [],
};

export type ExtendedQuestion = {
  q: string;
  marks: number;
  subtype?: string; // e.g. 'letter' | 'application' for LETTER kind
  keyPoints: string[];
  modelAnswer: string;
  difficulty?: string | null;
};

function promptForKind(kind: ExtendedKind, title: string, context: string): { system: string; user: string } {
  const truncatedContext = context.length > 6000 ? context.slice(0, 6000) + '...' : context;

  if (kind === 'LETTER') {
    return {
      system: `You are an expert exam setter specializing in letter and application writing instruction for Pakistani board exams.
Return valid JSON only, with no markdown fences.`,
      user: `Extract realistic letter-writing and application-writing prompts from this chapter that students could realistically write based on the source material.

Each prompt should specify a clear context, recipient, and purpose rooted in the chapter content. Include both:
- Personal/formal letters (subtype: 'letter')
- Job/college application letters (subtype: 'application')

Each must include:
- q: The prompt/question (e.g., "Write a letter to your friend describing a scientific discovery mentioned in the chapter...")
- marks: 3 (standard marks for a letter)
- subtype: 'letter' or 'application'
- keyPoints: List of key elements a complete answer should address (format, salutation, body points, closing)
- modelAnswer: A complete, well-formatted model answer in proper letter format

Base every prompt ONLY on real content in this source text. Never invent scenarios or facts not present in the material. If the source contains fewer than 3 suitable letter prompts, return fewer rather than inventing filler.

Return exactly:
{"items":[{"q":"...","marks":3,"subtype":"letter|application","keyPoints":["..."],"modelAnswer":"..."}]}

RESOURCE: ${title}

SOURCE TEXT:
${truncatedContext}`,
    };
  }

  if (kind === 'VOCAB') {
    return {
      system: `You are an expert exam setter specializing in vocabulary and language skills for Pakistani board exams.
Return valid JSON only, with no markdown fences.`,
      user: `Extract vocabulary drill questions from this chapter based on actual words and phrases used in the source material.

Create questions asking students to:
- Provide synonyms of highlighted vocabulary words
- Provide antonyms where applicable
- Define important technical or literary terms
- Use words in context

Each question must include:
- q: The prompt (e.g., "Give synonyms of the following words: ..." with the actual words from the source)
- marks: 3 (standard marks for vocabulary)
- keyPoints: List of expected synonyms, antonyms, or definition points
- modelAnswer: A complete model answer listing the synonyms, antonyms, or proper definitions

Base every question ONLY on vocabulary that actually appears in this source text. Never invent words or meanings not present in the material. If the source contains fewer than 4 suitable vocabulary questions, return fewer rather than inventing filler.

Return exactly:
{"items":[{"q":"...","marks":3,"keyPoints":["..."],"modelAnswer":"..."}]}

RESOURCE: ${title}

SOURCE TEXT:
${truncatedContext}`,
    };
  }

  if (kind === 'GRAMMAR') {
    return {
      system: `You are an expert exam setter specializing in grammar and language rules for Pakistani board exams.
Return valid JSON only, with no markdown fences.`,
      user: `Extract grammar exercise questions from this chapter relevant to English language grammar instruction.

Create questions covering:
- Tense transformations (active to passive, direct to indirect, tense changes)
- Parts of speech identification and usage
- Sentence correction and restructuring
- Clause and phrase identification
- Punctuation and spelling

Each question must include:
- q: The prompt (e.g., "Transform the following sentences from active to passive: ..." with example sentences from the chapter context)
- marks: 3 (standard marks for grammar)
- keyPoints: List of key grammar rules or concepts being tested
- modelAnswer: A complete model answer showing correct transformations or corrections with brief explanations

Base every question ONLY on content and examples from this source text. Never invent example sentences or grammar points not present in the material. If the source contains fewer than 4 suitable grammar questions, return fewer rather than inventing filler.

Return exactly:
{"items":[{"q":"...","marks":3,"keyPoints":["..."],"modelAnswer":"..."}]}

RESOURCE: ${title}

SOURCE TEXT:
${truncatedContext}`,
    };
  }

  // NUMERICAL kind
  return {
    system: `You are an expert exam setter specializing in numerical problems for Pakistani board exams in STEM subjects.
Return valid JSON only, with no markdown fences.`,
    user: `Extract numerical textbook-exercise-style problems from this chapter that students can solve based on the source material.

Create problems that:
- Are grounded directly in worked examples, explanations, or data presented in the chapter
- Require calculation, derivation, or problem-solving using formulas or concepts explained in the source
- Include clear numerical values, units, and realistic scenarios from the subject domain

Each problem must include:
- q: The problem statement (e.g., "A object with mass 5 kg..." following the style and examples in the chapter)
- marks: 5 (standard marks for a numerical problem)
- keyPoints: List of formulas, concepts, or steps required to solve
- modelAnswer: A complete worked solution showing all steps and intermediate calculations, ending with a plain-text line "Final Answer: <value> <unit>" (plain text only — no LaTeX, no backslashes, no $ signs; write formulas and exponents in plain text, e.g. "3.36 x 10^5 J kg^-1", so the string stays valid JSON)
- difficulty: 'EASY', 'MEDIUM', or 'HARD' based on the solution steps required

Base every problem ONLY on real data, formulas, and examples in this source text. Never invent numbers, scenarios, or physics/chemistry not present in the material. If the source contains fewer than 4 suitable numerical problems, return fewer rather than inventing filler.

IMPORTANT: the response must be strictly valid JSON. Never use LaTeX, backslash escape sequences (like \boxed, \times, \;), or unescaped special characters inside any string value — write all math in plain text (x for multiplication, ^ for exponents, / for fractions).

Return exactly:
{"items":[{"q":"...","marks":5,"keyPoints":["..."],"modelAnswer":"...","difficulty":"EASY|MEDIUM|HARD"}]}

RESOURCE: ${title}

SOURCE TEXT:
${truncatedContext}`,
  };
}

async function extractKind(kind: ExtendedKind, title: string, context: string): Promise<ExtendedQuestion[]> {
  try {
    const platformSettings = await getPlatformSettings();
    const adminProvider = getAdminAiProvider(platformSettings, 'resourceTest');
    const providerToUse: AiProviderId = adminProvider === 'local' ? 'groq' : adminProvider;
    const { system, user } = promptForKind(kind, title, context);
    const result = await gatewayChat({
      provider: providerToUse,
      tier: 'mini',
      maxTokens: 4096,
      temperature: 0.3,
      strictProvider: true,
      routingPolicy: 'text',
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    // Defense-in-depth: even with the prompt's plain-text instruction, a model can still slip in
    // a stray LaTeX/backslash sequence (e.g. \boxed, \times) that breaks JSON.parse outright. Escape
    // any backslash that isn't already a valid JSON escape before handing the text to parseAiJson,
    // rather than silently losing the whole batch to a parse failure.
    const sanitized = result.text.replace(/\\(?!["\\/bfnrtu])/g, '\\\\');
    const parsed = parseAiJson<{ items?: any[] }>(sanitized, { items: [] });
    const items = Array.isArray(parsed.items) ? parsed.items : [];
    return items
      .map((raw) => normalizeExtendedQuestion(raw, kind))
      .filter((item): item is ExtendedQuestion => item !== null)
      .slice(0, 30);
  } catch (error) {
    console.warn(`Extended extraction failed for kind ${kind}:`, error);
    return []; // graceful degrade — never throw, ingestion must still succeed for MCQ/short/long
  }
}

function normalizeExtendedQuestion(raw: any, kind: ExtendedKind): ExtendedQuestion | null {
  const q = String(raw?.q || '').trim();
  if (!q) return null;
  return {
    q,
    marks: Number(raw?.marks) || (kind === 'NUMERICAL' ? 5 : 3),
    subtype: raw?.subtype ? String(raw.subtype) : undefined,
    keyPoints: Array.isArray(raw?.keyPoints) ? raw.keyPoints.map(String).filter(Boolean) : [],
    modelAnswer: String(raw?.modelAnswer || '').trim(),
    difficulty: raw?.difficulty ? String(raw.difficulty).toUpperCase() : null,
  };
}

/** Builds the extended (Letter/Vocab/Grammar/Numerical) question bank for one resource, for whichever
 *  kinds apply to its subject's content_profile. Runs all applicable kinds in parallel. Never throws —
 *  returns {} if the profile has no applicable kinds or if the AI call fails. */
export async function buildExtendedQuestionBank(
  profile: ContentProfile,
  title: string,
  context: string
): Promise<Partial<Record<ExtendedKind, ExtendedQuestion[]>>> {
  const kinds = EXTENDED_KINDS_BY_PROFILE[profile] || [];
  if (!kinds.length) return {};
  const results = await Promise.all(kinds.map((kind) => extractKind(kind, title, context)));
  const bank: Partial<Record<ExtendedKind, ExtendedQuestion[]>> = {};
  kinds.forEach((kind, index) => {
    const result = results[index];
    if (result && result.length) bank[kind] = result;
  });
  return bank;
}
