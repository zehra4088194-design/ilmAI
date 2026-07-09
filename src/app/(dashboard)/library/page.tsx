import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { LibraryGrid } from '@/components/features/library/LibraryGrid';

export const metadata: Metadata = { title: 'Library' };

export default async function LibraryPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('board, grade_level').eq('id', user!.id).single();
  const { data: resources } = await supabase
    .from('library_resources')
    .select('*, subjects(name, color)')
    .order('created_at', { ascending: false });

  const visibleResources = (resources || []).filter((resource) => {
    const boardVisible = !resource.board || resource.board === profile?.board;
    const gradeVisible = !resource.grade_level || resource.grade_level === profile?.grade_level;
    return boardVisible && gradeVisible;
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Library</h1>
        <p className="text-muted-foreground">Books aur notes - sirf aapki class aur board ke mutabiq</p>
      </div>
      <LibraryGrid resources={visibleResources} />
    </div>
  );
}
