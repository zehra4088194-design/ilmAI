export type LibraryResourceType = 'text_book' | 'notes' | 'pairing_scheme' | 'guess_paper';
export type LibraryContentSection = 'reading' | 'mcq' | 'short' | 'long' | 'numericals';

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
    description: 'Textbook pages, notes, and concept files',
  },
  {
    value: 'numericals',
    slug: 'numericals',
    title: 'Numericals',
    description: 'Numerical problems and worked solutions',
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
  return value === 'notes' || value === 'pairing_scheme' || value === 'guess_paper' ? value : 'text_book';
}

export function getLibraryResourceTypeLabel(type: LibraryResourceType, collection = false) {
  if (type === 'notes') return collection ? 'Notes collection' : 'Notes';
  if (type === 'pairing_scheme') return collection ? 'Pairing scheme collection' : 'Pairing Scheme';
  if (type === 'guess_paper') return collection ? 'Guess paper collection' : 'Guess Papers';
  return collection ? 'Text book' : 'Text Book';
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
  const resourceType = parseLibraryResourceType(resource.resource_type);
  return {
    ...resource,
    resource_type: resourceType,
    book_title: `${resource.subjects?.name || 'General'} ${getLibraryResourceTypeLabel(resourceType)}`,
    content_section: inferLibraryContentSection(resource.title || ''),
    has_context_text: Boolean(resource.context_text_url),
    context_text_url: undefined,
  };
}
