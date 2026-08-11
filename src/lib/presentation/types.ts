export type PresentationTheme =
  | 'modern-blue'
  | 'warm-academic'
  | 'dark-tech'
  | 'nature-green'
  | 'vibrant-purple'
  | 'minimal-mono'
  | 'ocean-teal'
  | 'royal-violet'
  | 'charcoal-slate'
  | 'sunset-coral'
  | 'blush-rose'
  | 'golden-sand';

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

export const PRESENTATION_THEMES: PresentationTheme[] = [
  'modern-blue',
  'warm-academic',
  'dark-tech',
  'nature-green',
  'vibrant-purple',
  'minimal-mono',
  'ocean-teal',
  'royal-violet',
  'charcoal-slate',
  'sunset-coral',
  'blush-rose',
  'golden-sand',
];

// Themes with a light background need dark slide text (and no dark photo overlay)
// to stay readable — this is the single source of truth other modules key off of
// instead of special-casing 'minimal-mono' by name.
export const PRESENTATION_LIGHT_THEMES: PresentationTheme[] = [
  'minimal-mono',
  'sunset-coral',
  'blush-rose',
  'golden-sand',
];

export const PRESENTATION_SLIDE_TYPES: PresentationSlideType[] = [
  'title',
  'bullets',
  'two-column',
  'quote',
  'stats',
  'section-break',
  'closing',
];
