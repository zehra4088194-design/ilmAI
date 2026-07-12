export type PresentationTheme =
  | 'modern-blue'
  | 'warm-academic'
  | 'dark-tech'
  | 'nature-green'
  | 'vibrant-purple'
  | 'minimal-mono';

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
  mode?: PresentationGenerateMode;
};

export const PRESENTATION_THEMES: PresentationTheme[] = [
  'modern-blue',
  'warm-academic',
  'dark-tech',
  'nature-green',
  'vibrant-purple',
  'minimal-mono',
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
