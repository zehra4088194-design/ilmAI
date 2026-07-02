export const BOARDS = [
  { value: 'FBISE', label: 'FBISE (Federal Board)', province: 'Federal' },
  { value: 'BISE_LHR', label: 'BISE Lahore', province: 'Punjab' },
  { value: 'BISE_KHI', label: 'BISE Karachi', province: 'Sindh' },
  { value: 'BISE_RWP', label: 'BISE Rawalpindi', province: 'Punjab' },
  { value: 'BISE_FSD', label: 'BISE Faisalabad', province: 'Punjab' },
  { value: 'AKU', label: 'Aga Khan University', province: 'International' },
  { value: 'OTHER', label: 'Other', province: '' },
] as const;

export const GRADE_LEVELS = [
  { value: 'GRADE_9', label: 'Grade 9 (Matric Part-I)', level: 'Matric' },
  { value: 'GRADE_10', label: 'Grade 10 (Matric Part-II)', level: 'Matric' },
  { value: 'GRADE_11', label: 'Grade 11 (Inter Part-I)', level: 'Inter' },
  { value: 'GRADE_12', label: 'Grade 12 (Inter Part-II)', level: 'Inter' },
  { value: 'O_LEVEL', label: 'O Level', level: 'Cambridge' },
  { value: 'A_LEVEL', label: 'A Level', level: 'Cambridge' },
] as const;

export const SUBSCRIPTION_PLANS = {
  FREE: {
    name: 'Free',
    price: 0,
    limits: { aiMessages: 10, quizzes: 5, flashcards: 50, pastPapers: false, downloadPDF: false },
    features: ['10 AI messages/day', '5 quizzes/day', '50 flashcards', 'Basic progress tracking'],
  },
  PRO: {
    name: 'Pro',
    priceMonthly: 499,
    priceAnnual: 4990,
    limits: { aiMessages: 100, quizzes: -1, flashcards: 1000, pastPapers: true, downloadPDF: true },
    features: ['100 AI messages/day', 'Unlimited quizzes', '1000 flashcards', 'All past papers', 'PDF downloads', 'Priority support'],
  },
  ELITE: {
    name: 'Elite',
    priceMonthly: 999,
    priceAnnual: 9990,
    limits: { aiMessages: -1, quizzes: -1, flashcards: -1, pastPapers: true, downloadPDF: true },
    features: ['Unlimited AI messages', 'Unlimited everything', 'Offline mode', '1-on-1 AI sessions', 'Exam simulations', 'Parent dashboard'],
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
