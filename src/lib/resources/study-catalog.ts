import {
  inferLibraryContentSection,
  isCatalogResourceVisible,
  type LibraryContentSection,
} from '@/lib/resources/catalog';

export type StudyCatalogResource = {
  id: string;
  title: string;
  chapter_id: string | null;
  book_title: string;
  content_section: LibraryContentSection;
  has_context_text: boolean;
  board: string | null;
  grade_level: string | null;
};

type StudyCatalogProfile = {
  board?: string | null;
  grade_level?: string | null;
};

type LoadStudyCatalogOptions = {
  subjectId: string;
  subjectName: string;
  profile: StudyCatalogProfile | null;
  chapterId?: string;
};

export async function loadStudyCatalogResources(
  supabase: any,
  { subjectId, subjectName, profile, chapterId }: LoadStudyCatalogOptions
): Promise<StudyCatalogResource[]> {
  let catalogQuery = supabase
    .from('library_resources')
    .select('id, title, chapter_id, book_title, content_section, has_context_text, board, grade_level')
    .eq('resource_type', 'notes')
    .eq('subject_id', subjectId);

  catalogQuery = chapterId ? catalogQuery.eq('chapter_id', chapterId) : catalogQuery.not('chapter_id', 'is', null);

  const catalogResult = await catalogQuery;
  let resources: StudyCatalogResource[] = [];

  if (!catalogResult.error) {
    resources = (catalogResult.data || []).map((resource: any) => ({
      id: resource.id,
      title: resource.title,
      chapter_id: resource.chapter_id,
      book_title: resource.book_title || `${subjectName} Notes`,
      content_section: resource.content_section || inferLibraryContentSection(resource.title || ''),
      has_context_text: Boolean(resource.has_context_text),
      board: resource.board,
      grade_level: resource.grade_level,
    }));
  } else {
    console.warn('Study catalog is using the legacy library resource schema.');
    let legacyQuery = supabase
      .from('library_resources')
      .select('id, title, chapter_id, context_text_url, board, grade_level')
      .eq('resource_type', 'notes')
      .eq('subject_id', subjectId);

    legacyQuery = chapterId ? legacyQuery.eq('chapter_id', chapterId) : legacyQuery.not('chapter_id', 'is', null);

    const legacyResult = await legacyQuery;
    resources = (legacyResult.data || []).map((resource: any) => ({
      id: resource.id,
      title: resource.title,
      chapter_id: resource.chapter_id,
      book_title: `${subjectName} Notes`,
      content_section: inferLibraryContentSection(resource.title || ''),
      has_context_text: Boolean(resource.context_text_url),
      board: resource.board,
      grade_level: resource.grade_level,
    }));
  }

  return resources.filter((resource) => isCatalogResourceVisible(resource, profile));
}

export function countStudyResourceSections(resources: StudyCatalogResource[]) {
  const counts: Record<LibraryContentSection, number> = {
    reading: 0,
    mcq: 0,
    short: 0,
    long: 0,
  };

  for (const resource of resources) {
    counts[resource.content_section] += 1;
  }

  return counts;
}
