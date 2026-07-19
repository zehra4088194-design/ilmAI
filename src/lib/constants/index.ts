export const BOARDS = [
  { value: 'FBISE', label: 'FBISE (Federal Board)', province: 'Federal', country: 'PK' },
  { value: 'BISE_LHR', label: 'BISE Lahore', province: 'Punjab', country: 'PK' },
  { value: 'BISE_KHI', label: 'BISE Karachi', province: 'Sindh', country: 'PK' },
  { value: 'BISE_RWP', label: 'BISE Rawalpindi', province: 'Punjab', country: 'PK' },
  { value: 'BISE_FSD', label: 'BISE Faisalabad', province: 'Punjab', country: 'PK' },
  { value: 'AKU', label: 'Aga Khan University', province: 'International', country: 'PK' },
  { value: 'CBSE', label: 'CBSE', province: 'All India', country: 'IN' },
  { value: 'ICSE', label: 'ICSE', province: 'All India', country: 'IN' },
  { value: 'STATE_BOARD_IN', label: 'State Board (India)', province: '', country: 'IN' },
  { value: 'OTHER', label: 'Other', province: '', country: '' },
] as const;

export const GRADE_LEVELS = [
  { value: 'GRADE_9', label: 'Grade 9 / Class 9', level: 'Matric' },
  { value: 'GRADE_10', label: 'Grade 10 / Class 10 (Matric)', level: 'Matric' },
  { value: 'GRADE_11', label: 'Grade 11 / Class 11 (Inter Part-I)', level: 'Inter' },
  { value: 'GRADE_12', label: 'Grade 12 / Class 12 (Inter Part-II)', level: 'Inter' },
  { value: 'O_LEVEL', label: 'O Level', level: 'Cambridge' },
  { value: 'A_LEVEL', label: 'A Level', level: 'Cambridge' },
] as const;

// Used to auto-detect Pakistan vs India (and default the boards dropdown +
// payment region) from the visitor's country. See app/api/geo/route.ts.
export const COUNTRY_BOARD_DEFAULTS: Record<string, string> = {
  PK: 'FBISE',
  IN: 'CBSE',
};

export type Currency = 'USD' | 'PKR';

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  USD: '$',
  PKR: 'Rs.',
};

export const MANUAL_PAYMENT_OPTIONS = [
  { label: 'Easypaisa', number: '03480049900' },
  { label: 'JazzCash', number: '03006596490' },
] as const;

/**
 * Resolve a student's country from their `profiles.board` value, using the
 * same `country` field already on each BOARDS entry. Falls back to 'PK' for
 * unset/unknown/'OTHER' boards, matching the app's Pakistan-first default.
 */
export function getCountryForBoard(board?: string | null): 'PK' | 'IN' {
  const entry = BOARDS.find((b) => b.value === board);
  return entry?.country === 'IN' ? 'IN' : 'PK';
}

/** Pakistan uses fixed PKR pricing; every other country uses USD. */
export function getCurrencyForCountry(country?: string | null): Currency {
  return country?.toUpperCase() === 'PK' ? 'PKR' : 'USD';
}

/**
 * profile.board -> currency. Prefer this over IP geolocation whenever a
 * logged-in user's board is known - it's set once at signup and doesn't
 * change if the student is travelling or using a VPN.
 */
export function getCurrencyForBoard(board?: string | null): Currency {
  return getCurrencyForCountry(getCountryForBoard(board));
}

export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: {
      USD: { monthly: 0, annual: 0 },
      PKR: { monthly: 0, annual: 0 },
    },
    limits: { aiMessages: 10, quizzes: 3, flashcards: 50, pastPapers: false, downloadPDF: false },
    features: [
      '10 side-chat messages/day',
      '20 shared weighted AI credits/week',
      '10 printed and 5 handwritten scans/week',
      '3 University Hub uses/week',
      'Read notes/books in-app',
      'No PDF downloads',
      'Student chat requests only',
    ],
  },
  PRO: {
    name: 'Pro',
    price: {
      USD: { monthly: 2.99, annual: 28.7 },
      PKR: { monthly: 849, annual: 8150 },
    },
    limits: { aiMessages: 20, quizzes: 10, flashcards: 1000, pastPapers: true, downloadPDF: true },
    features: [
      '8 shared AI tool uses/day',
      '50 printed and 10 handwritten scans/week',
      '1000 flashcards',
      'All past papers',
      'PDF downloads unlocked',
      'Student chat unlocked',
      'Parent weekly reports and chat',
      'Priority support',
    ],
  },
  ELITE: {
    name: 'Elite',
    price: {
      USD: { monthly: 4.99, annual: 47.9 },
      PKR: { monthly: 1399, annual: 13430 },
    },
    limits: { aiMessages: 40, quizzes: 25, flashcards: 5000, pastPapers: true, downloadPDF: true },
    features: [
      '15 shared AI tool uses/day',
      'Offline mode',
      'Live Voice Call coming soon',
      'Priority AI routing when capacity is available',
      '100 printed and 25 handwritten scans/week',
      'Elite parent insights',
      'Exam simulations',
      'Parent dashboard',
    ],
  },
} as const;

export const XP_REWARDS = {
  QUIZ_CORRECT: 10,
  QUIZ_COMPLETE: 50,
  FLASHCARD_REVIEW: 5,
  STUDY_SESSION_30MIN: 30,
  STREAK_DAILY: 20,
  PERFECT_QUIZ: 100,
  FIRST_LOGIN: 50,
  PROFILE_COMPLETE: 100,
} as const;

// Fallback colors used before a subject's own `color` (from the DB) loads.
// Includes both Pakistani-board and Indian-board subjects.
export const SUBJECTS_COLORS: Record<string, string> = {
  mathematics: '#7c3aed',
  physics: '#2563eb',
  chemistry: '#16a34a',
  biology: '#dc2626',
  english: '#d97706',
  urdu: '#0891b2',
  computer: '#7c3aed',
  islamiat: '#059669',
  pakistan_studies: '#6d28d9',
  hindi: '#ea580c',
  social_science: '#6d28d9',
};

export const AI_PROVIDERS_CONFIG = {
  groq: { model: 'llama-3.3-70b-versatile', maxTokens: 2048, temperature: 0.7, free: true },
  anthropic: { model: 'claude-3-haiku-20240307', maxTokens: 4096, temperature: 0.7, free: false },
  openai: { model: 'gpt-4o-mini', maxTokens: 4096, temperature: 0.7, free: false },
} as const;

export const ROUTES = {
  HOME: '/',
  LOGIN: '/login',
  REGISTER: '/register',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  VERIFY_EMAIL: '/verify-email',
  DASHBOARD: '/dashboard',
  STUDY: '/study',
  PRACTICE: '/practice',
  AI_TUTOR: '/ai-tutor',
  PAST_PAPERS: '/past-papers',
  PROGRESS: '/progress',
  LEADERBOARD: '/leaderboard',
  SETTINGS: '/settings',
  MCQ: '/mcq',
  FLASHCARDS: '/flashcards',
  NOTES: '/notes',
  RESULTS: '/results',
  SUBSCRIPTION: '/subscription',
  ADMIN: '/admin',
} as const;
