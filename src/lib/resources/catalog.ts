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
    description: 'Textbook pages, solved exercises, notes, and concept files',
  },
  {
    value: 'mcq',
    slug: 'mcqs',
    title: 'MCQs',
    description: 'Objective and multiple-choice files only',
  },
  {
    value: 'short',
    slug: 'short-questions',
    title: 'Short Questions',
    description: 'Short-question files only',
  },
  {
    value: 'long',
    slug: 'long-questions',
    title: 'Long Questions',
    description: 'Detailed and long-question files only',
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

export function inferLibraryContentSection(title: string): LibraryContentSection {
  if (/\bmcqs?\b/i.test(title)) return 'mcq';
  if (/\bshort questions?\b/i.test(title)) return 'short';
  if (/\blong questions?\b/i.test(title)) return 'long';
  return 'reading';
}

export function normalizeLegacyCatalogResource(resource: any) {
  return {
    ...resource,
    book_title: `${resource.subjects?.name || 'General'} ${resource.resource_type === 'notes' ? 'Notes' : 'Text Book'}`,
    content_section: inferLibraryContentSection(resource.title || ''),
    has_context_text: Boolean(resource.context_text_url),
    context_text_url: undefined,
  };
}
