import { gatewayChat, type ModelTier } from '@/lib/ai/gateway';
import { parseAiJson } from '@/lib/utils/json-extract';
import {
  PRESENTATION_SLIDE_TYPES,
  PRESENTATION_THEMES,
  type PresentationDeck,
  type PresentationGenerateInput,
  type PresentationSlide,
  type PresentationSlideType,
  type PresentationTheme,
} from './types';

const DEFAULT_THEME: PresentationTheme = 'modern-blue';

function cleanString(value: unknown, fallback = '', max = 500) {
  return typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : fallback;
}

function cleanNumber(value: unknown, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(Math.max(Math.floor(parsed), min), max);
}

function asTheme(value: unknown): PresentationTheme {
  return PRESENTATION_THEMES.includes(value as PresentationTheme) ? (value as PresentationTheme) : DEFAULT_THEME;
}

function asSlideType(value: unknown): PresentationSlideType {
  return PRESENTATION_SLIDE_TYPES.includes(value as PresentationSlideType)
    ? (value as PresentationSlideType)
    : 'bullets';
}

function stringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback;
  return value
    .map((item) => cleanString(item, '', 140))
    .filter(Boolean)
    .slice(0, 8);
}

function buildSystemPrompt(compact = false) {
  return `You are an expert university-level presentation content writer.
Your job is CONTENT for a premium PowerPoint-style university presentation. The app controls visual design, but your content must feel ready for real slides.

Strict rules:
1. Return only clean JSON. No markdown fences, no explanation.
2. Use this schema:
{
  "topic": "string",
  "theme": "modern-blue | warm-academic | dark-tech | nature-green | vibrant-purple | minimal-mono",
  "slides": [
    {"type":"title","title":"string","subtitle":"string","speakerNotes":"string"},
    {"type":"bullets","title":"string","bullets":["short point"],"speakerNotes":"string"},
    {"type":"two-column","title":"string","left":{"heading":"string","bullets":["..."]},"right":{"heading":"string","bullets":["..."]},"speakerNotes":"string"},
    {"type":"quote","quote":"string","author":"string","speakerNotes":"string"},
    {"type":"stats","title":"string","stats":[{"value":"92%","label":"short label"}],"speakerNotes":"string"},
    {"type":"section-break","title":"string","speakerNotes":"string"},
    {"type":"closing","title":"string","subtitle":"string","speakerNotes":"string"}
  ]
}
3. Mix slide types. Do not repeat bullets only.
4. ${compact ? 'Bulk mode: use 3-4 strong bullets per bullet slide, each 8-14 words.' : 'Per-slide mode: use 4-6 strong bullets per bullet slide, each 8-16 words.'}
5. ${compact ? 'Bulk mode: use 2-4 bullets per column and speaker notes of 45-80 words.' : 'Per-slide mode: use 3-5 bullets per column and speaker notes of 80-130 words.'}
7. Include practical examples, key terms, mini case studies, viva-ready ideas, and one memorable takeaway across the deck.
8. Pick a theme based on topic: science/tech -> dark-tech or modern-blue, literature/history -> warm-academic, environment -> nature-green.
9. Match the requested language. Use Roman Urdu/Urdu-English only when requested.
10. Do not add fake citations. If references are needed, mention reference placeholders only.`;
}

function buildUserPrompt(input: PresentationGenerateInput) {
  const slideCount = cleanNumber(input.slideCount, 8, 4, 24);
  return `Topic: ${cleanString(input.topic, 'University presentation')}
Subject/course: ${cleanString(input.subject, 'General')}
Total slides: exactly ${slideCount}
Audience level: ${cleanString(input.audienceLevel, 'University students')}
Tone: ${cleanString(input.tone, 'Professional')}
Language: ${cleanString(input.language, 'English')}
Output style: ${cleanString(input.outputStyle, 'professional')}

Create a polished, colorful, university-grade presentation deck that feels like a complete PowerPoint presentation, not short notes.
Bulk output must stay compact enough to return reliably in one response while still teaching one clear idea per slide.`;
}

function normalizeSlide(raw: Record<string, unknown>, index: number, total: number): PresentationSlide {
  const type = index === 0 ? 'title' : index === total - 1 ? 'closing' : asSlideType(raw.type);
  const title = cleanString(raw.title, index === 0 ? 'Presentation' : `Slide ${index + 1}`, 120);
  const speakerNotes = cleanString(raw.speakerNotes, cleanString(raw.speaker_notes, '', 700), 700);

  if (type === 'title') {
    return {
      type,
      title,
      subtitle: cleanString(raw.subtitle, 'University presentation', 160),
      speakerNotes,
    };
  }

  if (type === 'two-column') {
    const left = raw.left && typeof raw.left === 'object' ? (raw.left as Record<string, unknown>) : {};
    const right = raw.right && typeof raw.right === 'object' ? (raw.right as Record<string, unknown>) : {};
    return {
      type,
      title,
      left: {
        heading: cleanString(left.heading, 'Point A', 80),
        bullets: stringArray(left.bullets, ['Key idea']),
      },
      right: {
        heading: cleanString(right.heading, 'Point B', 80),
        bullets: stringArray(right.bullets, ['Key idea']),
      },
      speakerNotes,
    };
  }

  if (type === 'quote') {
    return {
      type,
      quote: cleanString(raw.quote, title, 220),
      author: cleanString(raw.author, '', 80),
      speakerNotes,
    };
  }

  if (type === 'stats') {
    const stats = Array.isArray(raw.stats)
      ? raw.stats
          .map((item) => {
            const stat = item && typeof item === 'object' ? (item as Record<string, unknown>) : {};
            return {
              value: cleanString(stat.value, 'Key', 40),
              label: cleanString(stat.label, 'Insight', 90),
            };
          })
          .slice(0, 4)
      : [];
    return {
      type,
      title,
      stats: stats.length ? stats : [{ value: '3x', label: 'Important learning point' }],
      speakerNotes,
    };
  }

  if (type === 'section-break') {
    return { type, title, speakerNotes };
  }

  if (type === 'closing') {
    return {
      type,
      title: cleanString(raw.title, 'Thank You', 120),
      subtitle: cleanString(raw.subtitle, 'Questions and discussion', 160),
      speakerNotes,
    };
  }

  return {
    type: 'bullets',
    title,
    bullets: stringArray(raw.bullets, stringArray(raw.keyPoints, ['Core concept', 'Important example', 'Exam point'])),
    speakerNotes,
  };
}

export function normalizePresentationDeck(raw: unknown, fallbackTopic: string): PresentationDeck {
  const deck = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const rawSlides = Array.isArray(deck.slides) ? deck.slides : [];
  const slides = rawSlides
    .map((slide, index) =>
      normalizeSlide(
        slide && typeof slide === 'object' ? (slide as Record<string, unknown>) : {},
        index,
        rawSlides.length
      )
    )
    .filter(Boolean);

  return {
    topic: cleanString(deck.topic, fallbackTopic, 140),
    theme: asTheme(deck.theme),
    slides,
  };
}

async function askForDeck(input: PresentationGenerateInput, tier: ModelTier) {
  const result = await gatewayChat({
    provider: 'gemini',
    tier,
    messages: [
      { role: 'system', content: buildSystemPrompt(true) },
      { role: 'user', content: buildUserPrompt(input) },
    ],
    maxTokens: 7600,
    temperature: 0.45,
  });
  return normalizePresentationDeck(parseAiJson(result.text, {}), input.topic);
}

type OutlineSlide = {
  type: PresentationSlideType;
  focus: string;
  title?: string;
};

async function askForOutline(input: PresentationGenerateInput, tier: ModelTier) {
  const slideCount = cleanNumber(input.slideCount, 10, 4, 24);
  const result = await gatewayChat({
    provider: 'gemini',
    tier,
    messages: [
      { role: 'system', content: 'Return only valid JSON. You create presentation outlines for university decks.' },
      {
        role: 'user',
        content: `Create an outline for a ${slideCount}-slide university presentation.
Topic: ${cleanString(input.topic, 'University presentation')}
Subject/course: ${cleanString(input.subject, 'General')}
Audience: ${cleanString(input.audienceLevel, 'University students')}
Tone: ${cleanString(input.tone, 'Professional')}
Language: ${cleanString(input.language, 'English')}

Return JSON:
{"topic":"...","theme":"modern-blue | warm-academic | dark-tech | nature-green | vibrant-purple | minimal-mono","slides":[{"type":"title","title":"...","focus":"..."},{"type":"bullets","title":"...","focus":"..."}]}
Use exactly ${slideCount} slides. First type title, last type closing, include mixed slide types and a logical PowerPoint-style story arc.`,
      },
    ],
    maxTokens: 2400,
    temperature: 0.35,
  });
  const parsed = parseAiJson<Record<string, unknown>>(result.text, {});
  const rawSlides = Array.isArray(parsed.slides) ? parsed.slides : [];
  return {
    topic: cleanString(parsed.topic, input.topic, 140),
    theme: asTheme(parsed.theme),
    slides: rawSlides
      .map((slide, index) => {
        const item = slide && typeof slide === 'object' ? (slide as Record<string, unknown>) : {};
        return {
          type: index === 0 ? 'title' : index === rawSlides.length - 1 ? 'closing' : asSlideType(item.type),
          title: cleanString(item.title, `Slide ${index + 1}`, 120),
          focus: cleanString(item.focus, cleanString(item.title, `Slide ${index + 1}`, 160), 180),
        };
      })
      .slice(0, slideCount),
  };
}

async function askForSingleSlide(params: {
  input: PresentationGenerateInput;
  outlineTopic: string;
  theme: PresentationTheme;
  slide: OutlineSlide;
  index: number;
  total: number;
  previousSummary: string;
  tier: ModelTier;
}) {
  const result = await gatewayChat({
    provider: 'gemini',
    tier: params.tier,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      {
        role: 'user',
        content: `Generate only slide ${params.index + 1} of ${params.total} as JSON object, not full deck.
Presentation topic: ${params.outlineTopic}
Theme to keep: ${params.theme}
Slide type: ${params.slide.type}
Slide title: ${params.slide.title || ''}
Slide focus: ${params.slide.focus}
Previous flow summary: ${params.previousSummary || 'Start of deck'}
Subject/course: ${cleanString(params.input.subject, 'General')}
Language: ${cleanString(params.input.language, 'English')}
Tone: ${cleanString(params.input.tone, 'Professional')}

Return exactly one slide JSON object matching the schema for this slide type.
Make this slide substantial: presentation-ready bullets, useful speaker notes, and no filler.`,
      },
    ],
    maxTokens: 2400,
    temperature: 0.42,
  });
  return parseAiJson<Record<string, unknown>>(result.text, {});
}

async function mapInBatches<T, R>(items: T[], batchSize: number, mapper: (item: T, index: number) => Promise<R>) {
  const results: R[] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    const values = await Promise.all(batch.map((item, batchIndex) => mapper(item, index + batchIndex)));
    results.push(...values);
  }
  return results;
}

function fallbackOutline(input: PresentationGenerateInput): {
  topic: string;
  theme: PresentationTheme;
  slides: OutlineSlide[];
} {
  const slideCount = cleanNumber(input.slideCount, 8, 4, 24);
  const topic = cleanString(input.topic, 'University presentation', 140);
  const titles = [
    topic,
    'Why this topic matters',
    'Core concepts',
    'How it works',
    'Practical example',
    'Common challenges',
    'Key takeaways',
    'Discussion and questions',
  ];
  const slides: OutlineSlide[] = Array.from({ length: slideCount }, (_, index) => ({
    type:
      index === 0
        ? 'title'
        : index === slideCount - 1
          ? 'closing'
          : asSlideType(index % 3 === 0 ? 'two-column' : 'bullets'),
    title: titles[index] || `Key point ${index}`,
    focus:
      index === 0
        ? `Introduce ${topic} and set the learning goal.`
        : `Explain ${titles[index] || `key point ${index}`} with a useful example.`,
  }));
  return { topic, theme: DEFAULT_THEME, slides };
}

async function askForDeckPerSlide(input: PresentationGenerateInput, tier: ModelTier) {
  const fallback = fallbackOutline(input);
  let outline: typeof fallback;
  try {
    outline = await askForOutline(input, tier);
  } catch {
    // Still make one request per slide when the planning call is unavailable.
    outline = fallback;
  }
  const slideCount = cleanNumber(input.slideCount, 8, 4, 24);
  const outlineSlides = outline.slides.length ? outline.slides.slice(0, slideCount) : fallback.slides;
  while (outlineSlides.length < slideCount) {
    const index = outlineSlides.length;
    outlineSlides.push(
      fallback.slides[index] || {
        type: index === slideCount - 1 ? 'closing' : 'bullets',
        title: `Key point ${index + 1}`,
        focus: `Explain an important part of ${fallback.topic}.`,
      }
    );
  }

  // Keep each slide as its own Gemini request, but limit concurrency so the
  // gateway does not rate-limit a larger deck.
  const rawSlides = await mapInBatches(outlineSlides, 2, async (slide, index) => {
    try {
      return await askForSingleSlide({
        input,
        outlineTopic: outline.topic || fallback.topic,
        theme: outline.theme || fallback.theme,
        slide,
        index,
        total: outlineSlides.length,
        previousSummary: outlineSlides
          .slice(0, index)
          .map((item) => item.title || item.focus)
          .join(' -> '),
        tier,
      });
    } catch {
      return {
        type: slide.type,
        title: slide.title || `Slide ${index + 1}`,
        subtitle: slide.focus,
        bullets: [slide.focus],
        speakerNotes: `Explain ${slide.focus} using one clear classroom example and connect it to the presentation topic.`,
      };
    }
  });

  return normalizePresentationDeck(
    { topic: outline.topic || fallback.topic, theme: outline.theme || fallback.theme, slides: rawSlides },
    input.topic
  );
}

export async function generatePresentationDeck(
  input: PresentationGenerateInput,
  tier: ModelTier
): Promise<PresentationDeck> {
  const slideCount = cleanNumber(input.slideCount, 8, 4, 24);
  // Detailed per-slide generation is the safe default. Bulk remains available
  // only when explicitly selected for a quick, compact draft.
  const mode = input.mode === 'bulk' && slideCount <= 12 ? 'bulk' : 'per-slide';
  const deck = mode === 'per-slide' ? await askForDeckPerSlide(input, tier) : await askForDeck(input, tier);
  if (!deck.slides.length) throw new Error('Presentation slides generate nahi ho sake.');
  return deck;
}
