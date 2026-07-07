import { Metadata } from 'next';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
export const metadata: Metadata = { title: 'Admin - Content' };

export default async function AdminContentPage() {
  const supabase = await createAdminClient();
  const { data: subjects } = await supabase.from('subjects').select('*, chapters(count)').order('name');
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Management</h1>
        <p className="text-sm text-muted-foreground mt-1">Kisi subject par click karo uske chapters manage karne ke liye — add/edit/delete, aur Pakistan/India ke liye alag alag chapters set karo.</p>
      </div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(subjects || []).map((s: any) => (
          <Link key={s.id} href={`/admin/content/${s.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-5">
                <h3 className="font-semibold">{s.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{s.total_chapters} chapters · {s.total_questions} questions</p>
                <p className="text-[10px] text-muted-foreground mt-2">{(s.boards || []).join(', ') || 'No boards set'}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
        {(!subjects || subjects.length === 0) && <p className="text-muted-foreground col-span-full text-center py-8">Koi subjects nahi hain. Database seed run karo.</p>}
      </div>
    </div>
  );
}
