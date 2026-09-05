export type Subject = { id: string; name: string; grade_levels: string[] };
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
  sourceCount: number;
  requestedCounts: { mcq: number; short: number; long: number };
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
