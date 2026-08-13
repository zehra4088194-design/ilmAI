// Simplified down to two modes on purpose — the many named color themes were
// replaced with a single dark look and a single light look, each paired with
// dark/light-tagged background photos instead (see PresentationBackground.mode).
export type PresentationTheme = 'dark' | 'light';

export type PresentationSlideType =
  | 'title'
  | 'bullets'
  | 'two-column'
  | 'quote'
  | 'stats'
  | 'section-break'
  | 'closing';

export type PresentationColumn = {
  heading: string;
  bullets: string[];
};

export type PresentationStat = {
  value: string;
  label: string;
};

export type PresentationSlide = {
  type: PresentationSlideType;
  title?: string;
  subtitle?: string;
  bullets?: string[];
  left?: PresentationColumn;
  right?: PresentationColumn;
  quote?: string;
  author?: string;
  stats?: PresentationStat[];
  speakerNotes?: string;
  backgroundImageUrl?: string;
};

export type PresentationDeck = {
  topic: string;
  theme: PresentationTheme;
  slides: PresentationSlide[];
};

export type PresentationGenerateMode = 'bulk' | 'per-slide';

export type PresentationGenerateInput = {
  topic: string;
  subject?: string;
  slideCount?: number;
  tone?: string;
  audienceLevel?: string;
  language?: string;
  outputStyle?: string;
  theme?: PresentationTheme;
  mode?: PresentationGenerateMode;
  backgroundImageUrls?: string[];
};

export type PresentationBackground = {
  name: string;
  url: string;
  size: number;
  subject: string;
  keywords: string[];
  // Optional so older sidecar metadata (saved before this field existed) keeps
  // type-checking; readers should treat a missing value as 'uncategorized'.
  category?: string;
  // Which slide theme this photo suits — a dark, moody photo for the 'dark'
  // theme (rendered with a dark scrim + white text) or a bright, light photo
  // for the 'light' theme (light scrim + dark text). Optional so pre-existing
  // rows keep type-checking; readers should treat a missing value as 'dark'
  // (the tone every background was designed for before this field existed).
  mode?: PresentationTheme;
  isGlobal: boolean;
};

// Suggested categories shown in the admin picker. Admins can still type a custom
// value — this list only seeds the dropdown/datalist for consistent naming.
export const PRESENTATION_BACKGROUND_CATEGORIES = [
  'science',
  'technology',
  'business',
  'history',
  'nature',
  'abstract',
  'arts',
  'health',
  'sports',
  'education',
] as const;

export const DEFAULT_PRESENTATION_BACKGROUND_CATEGORY = 'uncategorized';

export const PRESENTATION_THEMES: PresentationTheme[] = ['dark', 'light'];

export const PRESENTATION_SLIDE_TYPES: PresentationSlideType[] = [
  'title',
  'bullets',
  'two-column',
  'quote',
  'stats',
  'section-break',
  'closing',
];
