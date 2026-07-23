import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { LibraryGrid } from '@/components/features/library/LibraryGrid';
import { AdSenseBanner } from '@/components/features/ads/AdSenseBanner';
import { normalizeLegacyCatalogResource } from '@/lib/resources/catalog';

export const metadata: Metadata = { title: 'Library' };

export default async function LibraryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = user
    ? await supabase.from('profiles').select('board, grade_level').eq('id', user.id).single()
    : { data: null };
  const catalogResult = await (supabase.from('library_resources') as any)
    .select(
      'id, title, description, category, resource_type, book_title, content_section, has_context_text, drive_url, light_file_url, dark_file_url, subject_id, chapter_id, board, grade_level, file_type, created_at, subjects(id, name, slug, color), chapters(id, name, slug, order_index)'
    )
    .order('created_at', { ascending: false });
  let resources = catalogResult.data;
  if (catalogResult.error) {
    console.warn('Structured library catalog is not migrated yet; using the safe legacy catalog fallback.');
    const fallbackResult = await (supabase.from('library_resources') as any)
      .select(
        'id, title, description, category, resource_type, subject_id, chapter_id, board, grade_level, file_type, drive_url, light_file_url, dark_file_url, context_text_url, created_at, subjects(id, name, slug, color), chapters(id, name, slug, order_index)'
      )
      .order('created_at', { ascending: false });
    resources = (fallbackResult.data || []).map(normalizeLegacyCatalogResource);
  }

  const visibleResources = (resources || []).filter((resource: any) => {
    const boardVisible = !resource.board || resource.board === profile?.board;
    const gradeVisible = !profile?.grade_level || !resource.grade_level || resource.grade_level === profile.grade_level;
    return boardVisible && gradeVisible;
  });

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Library</h1>
        <p className="text-muted-foreground mt-1">Choose a book, then open its chapter and exact file section.</p>
      </div>
      <AdSenseBanner slot="inline" className="mx-auto max-w-5xl" />
      <LibraryGrid resources={visibleResources as any} />
    </div>
  );
}
