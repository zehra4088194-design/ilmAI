export type ContentProfile = 'language' | 'stem' | 'general';

export type Subject = { id: string; name: string; grade_levels: string[]; content_profile?: ContentProfile };
export type Chapter = { id: string; subject_id: string; name: string; grade_levels?: string[] | null };
export type PlanTier = 'FREE' | 'PRO' | 'ELITE';
export type PaperTheme = 'classic' | 'modern' | 'minimal';
export type DifficultyChoice = 'MIXED' | 'EASY' | 'MEDIUM' | 'HARD' | 'EXPERT';

export type Question = {
  q: string;
  marks: number;
  keyPoints: string[];
  modelAnswer: string;
  guide?: string;
  difficulty?: string | null;
  subtype?: string;
};
export type Mcq = { q: string; opts: string[]; correct: number; exp: string; difficulty?: string | null };

export type ResolvedBranding = {
  forceIlmAiWatermark: boolean;
  requiresAdGate: boolean;
  customHeader: string | null;
  customWatermarkText: string | null;
  customWatermarkImageUrl: string | null;
  hidePlatformBranding: boolean;
};

export type Paper = {
  subject: Subject;
  chapter: { id: string; name: string };
  gradeLevel: string;
  institutionName: string;
  title: string;
  timeAllowed: number;
  totalMarks: number;
  includeAnswerKey: boolean;
  theme: PaperTheme;
  difficulty: DifficultyChoice;
  planTier: PlanTier;
  branding: ResolvedBranding;
  mcqs: Mcq[];
  shortQuestions: Question[];
  longQuestions: Question[];
  letterQuestions: Question[];
  vocabQuestions: Question[];
  grammarQuestions: Question[];
  numericalQuestions: Question[];
  // Always hand-typed — there's no chapter-bank category for "whatever else the teacher wants to
  // add", so unlike every other section above, this one has no Auto counterpart or count.
  extraQuestions: Question[];
  sourceCount: number;
  requestedCounts: {
    mcq: number;
    short: number;
    long: number;
    letter: number;
    vocab: number;
    grammar: number;
    numerical: number;
    extra: number;
  };
  testId?: string | null;
};

export type TestHistoryRow = {
  id: string;
  title: string;
  institutionName: string | null;
  subjectName: string;
  chapterName: string;
  gradeLevel: string;
  theme: PaperTheme;
  difficulty: DifficultyChoice;
  counts: { mcq: number; short: number; long: number };
  totalMarks: number;
  durationMinutes: number;
  planTier: PlanTier;
  createdAt: string;
};

export function formatGrade(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export const EXTRA_TYPES_BY_PROFILE: Record<
  ContentProfile,
  { key: 'letter' | 'vocab' | 'grammar' | 'numerical'; label: string }[]
> = {
  language: [
    { key: 'letter', label: 'Letters / Applications' },
    { key: 'vocab', label: 'Vocabulary (Synonyms/Antonyms)' },
    { key: 'grammar', label: 'Grammar' },
  ],
  stem: [{ key: 'numerical', label: 'Numericals' }],
  general: [],
};
