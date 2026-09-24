import {
  CLASS_SELECTION_GRADE_LEVELS,
  type ClassSelectionGradeLevel,
  type GradeLevel as ProfileGradeLevel,
} from '@/lib/supabase/getUserGradeLevel';

export type GradeLevel = ClassSelectionGradeLevel;

export const ALL_GRADE_LEVELS: readonly GradeLevel[] = CLASS_SELECTION_GRADE_LEVELS;
export const DEFAULT_GRADE_LEVEL: GradeLevel = 'GRADE_10';

export const GRADE_SHORT_LABEL: Record<GradeLevel, string> = {
  GRADE_9: '9',
  GRADE_10: '10',
  GRADE_11: '11',
  GRADE_12: '12',
};

export function isGradeLevel(value: unknown): value is GradeLevel {
  return typeof value === 'string' && (ALL_GRADE_LEVELS as readonly string[]).includes(value);
}

export function normalizeEssayGradeLevel(
  gradeLevel: ProfileGradeLevel | string | null | undefined
): GradeLevel {
  return isGradeLevel(gradeLevel) ? gradeLevel : DEFAULT_GRADE_LEVEL;
}

const MATRIC_CONTEXT =
  "Write at a Matric (O-Level equivalent) student's level - clear, simple sentence " +
  'structure, everyday vocabulary, and shorter paragraphs. Avoid overly complex clauses ' +
  'or advanced academic vocabulary.';

const INTERMEDIATE_CONTEXT =
  "Write at an FSc/A-Level student's level - more sophisticated vocabulary and argument " +
  'structure is expected, with well-developed paragraphs and the analytical depth expected ' +
  'of an intermediate student.';

export function buildGradeContext(gradeLevel: ProfileGradeLevel | string | null | undefined): string {
  switch (normalizeEssayGradeLevel(gradeLevel)) {
    case 'GRADE_9':
    case 'GRADE_10':
      return MATRIC_CONTEXT;
    case 'GRADE_11':
    case 'GRADE_12':
      return INTERMEDIATE_CONTEXT;
    default:
      return MATRIC_CONTEXT;
  }
}

export interface EssayWriterRequestBody {
  topic: string;
  wordCount: number;
  essayType: string;
  language: string;
  provider: string;
  aiTier: string;
  gradeLevel?: GradeLevel;
}

export interface EssayWriterResponseData {
  essay: string;
  gradeLevel: GradeLevel;
}
