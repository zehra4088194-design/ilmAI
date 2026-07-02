import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { PastPapersGrid } from '@/components/features/past-papers/PastPapersGrid';
export const metadata: Metadata = { title: 'Past Papers' };

export default async function PastPapersPage() {
  const supabase = await createClient();
  const { data: subjects } = await supabase.from('subjects').select('id, name, slug, color').order('name');
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Past Papers</h1><p className="text-muted-foreground">20 saal ke verified past papers, board-wise organized</p></div>
      <PastPapersGrid subjects={subjects || []} />
    </div>
  );
}
