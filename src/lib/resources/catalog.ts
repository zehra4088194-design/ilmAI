export type LibraryResourceType = 'text_book' | 'notes';
export type LibraryContentSection = 'reading' | 'mcq' | 'short' | 'long';

export const LIBRARY_SECTIONS: Array<{
  value: LibraryContentSection;
  slug: string;
  title: string;
  description: string;
}> = [
  {
    value: 'reading',
    slug: 'reading',
    title: 'Chapter Reading',
    description: 'Text book pages, notes aur concept files',
  },
  {
    value: 'mcq',
    slug: 'mcqs',
    title: 'MCQs',
    description: 'Sirf objective aur multiple-choice files',
  },
  {
    value: 'short',
    slug: 'short-questions',
    title: 'Short Questions',
    description: 'Sirf short-question files',
  },
  {
    value: 'long',
    slug: 'long-questions',
    title: 'Long Questions',
    description: 'Sirf detailed aur long-question files',
  },
];

export function parseLibraryResourceType(value?: string): LibraryResourceType {
  return value === 'notes' ? 'notes' : 'text_book';
}

export function getLibrarySection(slug: string) {
  return LIBRARY_SECTIONS.find((section) => section.slug === slug) || null;
}

export function isCatalogResourceVisible(
  resource: { board?: string | null; grade_level?: string | null },
  profile: { board?: string | null; grade_level?: string | null } | null
) {
  // A null profile is the public, read-only catalog. Authenticated students
  // still receive board/grade filtering below.
  if (!profile) return true;
  const boardVisible = !resource.board || resource.board === profile.board;
  const gradeVisible = !resource.grade_level || resource.grade_level === profile.grade_level;
  return boardVisible && gradeVisible;
}

export function buildCatalogSearch(type: LibraryResourceType, bookTitle?: string | null) {
  const params = new URLSearchParams({ type });
  if (bookTitle) params.set('book', bookTitle);
  return params.toString();
}
