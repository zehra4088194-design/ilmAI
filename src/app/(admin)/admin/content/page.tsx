import { Metadata } from 'next';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
export const metadata: Metadata = { title: 'Admin - Content' };

export default async function AdminContentPage() {
  const supabase = await createAdminClient();
  const { data: subjects } = await supabase.from('subjects').select('*, chapters(count)').order('name');
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Content Management</h1>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(subjects || []).map((s: any) => (
          <Card key={s.id}><CardContent className="p-5">
            <h3 className="font-semibold">{s.name}</h3>
            <p className="text-xs text-muted-foreground mt-1">{s.total_chapters} chapters · {s.total_questions} questions</p>
          </CardContent></Card>
        ))}
        {(!subjects || subjects.length === 0) && <p className="text-muted-foreground col-span-full text-center py-8">Koi subjects nahi hain. Database seed run karo.</p>}
      </div>
    </div>
  );
}
