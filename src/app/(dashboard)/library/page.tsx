import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { LibraryGrid } from '@/components/features/library/LibraryGrid';
import { HouseAdBanner } from '@/components/features/ads/HouseAdBanner';
import { isCatalogResourceVisible, normalizeLegacyCatalogResource } from '@/lib/resources/catalog';

export const metadata: Metadata = {
  title: 'Public Study Library',
  description: 'Browse textbooks, notes, pairing schemes, and guess papers by board, grade, subject, and chapter.',
  alternates: { canonical: '/library' },
};

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('board, grade_level').eq('id', user.id).single()
    : { data: null };
  const pdfStorage = createServiceClient();
  // The table has 1500+ rows and PostgREST/supabase-js caps a single .select() at 1000 by
  // default — without paging through with .range(), everything past the first (most-recently
  // created) 1000 rows silently never reached this array at all. That's what made whole subjects'
  // notes appear to be missing/inconsistent per grade: which rows survived the cutoff depended on
  // upload order, not on any actual board/grade filtering (isCatalogResourceVisible below was
  // never even the problem — most of the data just never arrived here to be filtered).
  const CATALOG_COLUMNS =
    'id, title, description, category, resource_type, book_title, content_section, has_context_text, drive_url, light_file_url, dark_file_url, subject_id, chapter_id, board, grade_level, file_type, created_at, subjects(id, name, slug, color), chapters(id, name, slug, order_index)';
  const LEGACY_CATALOG_COLUMNS =
    'id, title, description, category, resource_type, subject_id, chapter_id, board, grade_level, file_type, drive_url, light_file_url, dark_file_url, context_text_url, created_at, subjects(id, name, slug, color), chapters(id, name, slug, order_index)';
  const PAGE_SIZE = 1000;

  async function fetchAllRows(columns: string) {
    const rows: any[] = [];
    for (let from = 0; ; from += PAGE_SIZE) {
      const page = await (pdfStorage.from('library_resources') as any)
        .select(columns)
        .order('created_at', { ascending: false })
        .range(from, from + PAGE_SIZE - 1);
      if (page.error) return { data: null, error: page.error };
      rows.push(...(page.data || []));
      if (page.data.length < PAGE_SIZE) break;
    }
    return { data: rows, error: null };
  }

  const catalogResult = await fetchAllRows(CATALOG_COLUMNS);
  let resources = catalogResult.data;
  if (catalogResult.error) {
    console.warn('Structured library catalog is not migrated yet; using the safe legacy catalog fallback.');
    const fallbackResult = await fetchAllRows(LEGACY_CATALOG_COLUMNS);
    resources = (fallbackResult.data || []).map(normalizeLegacyCatalogResource);
  }

  const visibleResources = (resources || []).filter((resource: any) => isCatalogResourceVisible(resource, profile));

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Library</h1>
        <p className="text-muted-foreground mt-1">
          Choose textbooks, notes, pairing schemes, or guess papers, then open the relevant subject and file.
        </p>
      </div>
      <HouseAdBanner slot="content_inline" className="mx-auto max-w-5xl" />
      <LibraryGrid resources={visibleResources as any} />
    </div>
  );
}
