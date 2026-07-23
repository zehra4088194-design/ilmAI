// ============================================
// MODULE: Personalized Onboarding + Voice Tutor + Paper Checker
// Additive types only — extends the existing UserProfile/Subject shapes
// (see index.ts) without touching anything already there. Import these
// alongside the base types: `import type { UserProfile, Subject } from '@/types'`
// then merge with the Ai* fields below where needed, or — once you're ready —
// fold these fields directly into index.ts's UserProfile/Subject interfaces.
// ============================================

/** New profile fields from migration 006_ai_features_onboarding.sql */
export interface AiOnboardingProfileFields {
  aiOnboardingComplete: boolean;
  targetMarksPercentage?: number;
  totalMarksPercentage?: number;
  previousRollNumber?: string;
  optionalSubjectIds: string[];
}

/** New subject fields from migration 006_ai_features_onboarding.sql */
export interface OptionalSubjectFields {
  isOptional: boolean;
  stream?: string; // 'pre-medical' | 'pre-engineering' | 'computer-science' | 'arts' | 'commerce'
}

export type PaperCheckInputType = 'text' | 'image';

export interface PaperCheckMissingElement {
  label: string; // e.g. "Heading is missing"
}

export interface PaperCheckResult {
  id: string;
  studentId: string;
  subjectId?: string;
  inputType: PaperCheckInputType;
  questionText?: string;
  answerText?: string;
  imageUrl?: string;
  marksObtained: number;
  marksTotal: number;
  missingElements: string[];
  feedback: string;
  provider: string;
  createdAt: string;
}

export const OPTIONAL_SUBJECT_STREAMS = [
  { value: 'pre-medical', label: 'Pre-Medical' },
  { value: 'pre-engineering', label: 'Pre-Engineering' },
  { value: 'computer-science', label: 'Computer Science' },
  { value: 'arts', label: 'Arts / Humanities' },
  { value: 'commerce', label: 'Commerce' },
] as const;
