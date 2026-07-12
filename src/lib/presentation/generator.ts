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
  return PRESENTATION_SLIDE_TYPES.includes(value as PresentationSlideType) ? (value as PresentationSlideType) : 'bullets';
}

function stringArray(value: unknown, fallback: string[] = []) {
  if (!Array.isArray(value)) return fallback;
  return value.map((item) => cleanString(item, '', 140)).filter(Boolean).slice(0, 8);
}

function buildSystemPrompt() {
  return `You are an expert university-level presentation content writer.
Your job is CONTENT only; the app controls design.

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
4. Bullet text should be short, clear, and presentation-friendly.
5. Pick a theme based on topic: science/tech -> dark-tech or modern-blue, literature/history -> warm-academic, environment -> nature-green.
6. Match the requested language. Use Roman Urdu/Urdu-English only when requested.
7. Add useful speaker notes for university students.
8. Do not add fake citations. If references are needed, mention reference placeholders only.`;
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

Create a polished, colorful, university-grade presentation deck.`;
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
    const left = raw.left && typeof raw.left === 'object' ? raw.left as Record<string, unknown> : {};
    const right = raw.right && typeof raw.right === 'object' ? raw.right as Record<string, unknown> : {};
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
      ? raw.stats.map((item) => {
        const stat = item && typeof item === 'object' ? item as Record<string, unknown> : {};
        return {
          value: cleanString(stat.value, 'Key', 40),
          label: cleanString(stat.label, 'Insight', 90),
        };
      }).slice(0, 4)
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
  const deck = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
  const rawSlides = Array.isArray(deck.slides) ? deck.slides : [];
  const slides = rawSlides
    .map((slide, index) => normalizeSlide(slide && typeof slide === 'object' ? slide as Record<string, unknown> : {}, index, rawSlides.length))
    .filter(Boolean);

  return {
    topic: cleanString(deck.topic, fallbackTopic, 140),
    theme: asTheme(deck.theme),
    slides,
  };
}

async function askForDeck(input: PresentationGenerateInput, tier: ModelTier) {
  const result = await gatewayChat({
    provider: 'groq',
    tier,
    messages: [
      { role: 'system', content: buildSystemPrompt() },
      { role: 'user', content: buildUserPrompt(input) },
    ],
    maxTokens: 6500,
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
    provider: 'groq',
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
Use exactly ${slideCount} slides. First type title, last type closing, include mixed slide types.`,
      },
    ],
    maxTokens: 2200,
    temperature: 0.35,
  });
  const parsed = parseAiJson<Record<string, unknown>>(result.text, {});
  const rawSlides = Array.isArray(parsed.slides) ? parsed.slides : [];
  return {
    topic: cleanString(parsed.topic, input.topic, 140),
    theme: asTheme(parsed.theme),
    slides: rawSlides.map((slide, index) => {
      const item = slide && typeof slide === 'object' ? slide as Record<string, unknown> : {};
      return {
        type: index === 0 ? 'title' : index === rawSlides.length - 1 ? 'closing' : asSlideType(item.type),
        title: cleanString(item.title, `Slide ${index + 1}`, 120),
        focus: cleanString(item.focus, cleanString(item.title, `Slide ${index + 1}`, 160), 180),
      };
    }).slice(0, slideCount),
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
    provider: 'groq',
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

Return exactly one slide JSON object matching the schema for this slide type.`,
      },
    ],
    maxTokens: 1600,
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

async function askForDeckPerSlide(input: PresentationGenerateInput, tier: ModelTier) {
  const outline = await askForOutline(input, tier);
  if (!outline.slides.length) return askForDeck(input, tier);

  const rawSlides = await mapInBatches(outline.slides, 3, (slide, index) =>
    askForSingleSlide({
      input,
      outlineTopic: outline.topic,
      theme: outline.theme,
      slide,
      index,
      total: outline.slides.length,
      previousSummary: outline.slides.slice(0, index).map((item) => item.title || item.focus).join(' -> '),
      tier,
    }),
  );

  return normalizePresentationDeck({ topic: outline.topic, theme: outline.theme, slides: rawSlides }, input.topic);
}

export async function generatePresentationDeck(input: PresentationGenerateInput, tier: ModelTier): Promise<PresentationDeck> {
  const mode = input.mode === 'per-slide' || cleanNumber(input.slideCount, 8, 4, 24) > 14 ? 'per-slide' : 'bulk';
  const deck = mode === 'per-slide' ? await askForDeckPerSlide(input, tier) : await askForDeck(input, tier);
  if (!deck.slides.length) throw new Error('Presentation slides generate nahi ho sake.');
  return deck;
}
