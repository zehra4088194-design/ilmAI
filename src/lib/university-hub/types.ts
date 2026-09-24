// University Hub — platform-wide (not tenant-scoped) content system. See the
// migration header comment (20260817150000_university_hub_content.sql) for why
// this doesn't follow the school_erp/college_erp organization-scoped pattern.

export type UniversityActionState = {
  success: boolean;
  message: string;
};

export const INITIAL_UNIVERSITY_ACTION_STATE: UniversityActionState = {
  success: false,
  message: '',
};

export const UNIVERSITY_RESOURCE_TYPES = [
  { key: 'book', label: 'Books' },
  { key: 'past_paper', label: 'Past Papers' },
  { key: 'topic_notes', label: 'Topic Wise Notes' },
  { key: 'video_lecture', label: 'Video Lectures' },
  { key: 'practical_guide', label: 'Practical Guide' },
  { key: 'recent_past_paper', label: 'Recent Past Papers' },
  { key: 'result', label: 'Results' },
] as const;

export type UniversityResourceType = (typeof UNIVERSITY_RESOURCE_TYPES)[number]['key'];

export type UniversityDegreeProgram = {
  id: string;
  slug: string;
  name: string;
  stream: string | null;
  total_years: number;
  is_active: boolean;
  sort_order: number;
};

export type UniversityProgramYear = {
  id: string;
  program_id: string;
  year_number: number;
  label: string;
  sort_order: number;
};

// No longer scoped to a single program_year_id (20260905130000_university_subject_pool.sql) —
// a subject is a shared pool entry now, linked to whichever program-year(s) include it via
// university_program_year_subjects. Its resources/MCQs (keyed by subject_id) are then visible
// under every program-year that links it.
export type UniversitySubject = {
  id: string;
  name: string;
  icon_key: string | null;
  is_active: boolean;
  sort_order: number;
};

export type UniversitySubjectResource = {
  id: string;
  subject_id: string;
  resource_type: UniversityResourceType;
  title: string;
  url: string | null;
  sort_order: number;
};

export type UniversityQuestion = {
  id: string;
  subject_id: string;
  text: string;
  options: { id: string; text: string }[];
  correct_answer: string;
  explanation: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  marks: number;
};
