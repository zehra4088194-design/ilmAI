// Class Library — platform-wide (not tenant-scoped) content system for Class 1
// upward. See the migration header (20260817180000_class_library_content.sql)
// for why this doesn't follow the school_erp organization-scoped pattern.

export type ClassLibraryActionState = {
  success: boolean;
  message: string;
};

export const INITIAL_CLASS_LIBRARY_ACTION_STATE: ClassLibraryActionState = {
  success: false,
  message: '',
};

export const CLASS_LIBRARY_RESOURCE_TYPES = [
  { key: 'book', label: 'Books' },
  { key: 'past_paper', label: 'Past Papers' },
  { key: 'topic_notes', label: 'Topic Wise Notes' },
  { key: 'video_lecture', label: 'Video Lectures' },
  { key: 'practical_guide', label: 'Practical Guide' },
  { key: 'recent_past_paper', label: 'Recent Past Papers' },
  { key: 'result', label: 'Results' },
] as const;

export type ClassLibraryResourceType = (typeof CLASS_LIBRARY_RESOURCE_TYPES)[number]['key'];

export type ClassLibraryClass = {
  id: string;
  slug: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type ClassLibrarySubject = {
  id: string;
  class_id: string;
  name: string;
  icon_key: string | null;
  is_active: boolean;
  sort_order: number;
};

export type ClassLibrarySubjectResource = {
  id: string;
  subject_id: string;
  resource_type: ClassLibraryResourceType;
  title: string;
  url: string | null;
  sort_order: number;
};

export type ClassLibraryQuestion = {
  id: string;
  subject_id: string;
  text: string;
  options: { id: string; text: string }[];
  correct_answer: string;
  explanation: string | null;
  difficulty: 'EASY' | 'MEDIUM' | 'HARD';
  marks: number;
};
