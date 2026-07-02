import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronRight } from 'lucide-react';

export default async function SubjectDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const supabase = await createClient();
  const { data: subject } = await supabase.from('subjects').select('*').eq('slug', slug).single();
  if (!subject) notFound();
  const { data: chapters } = await supabase.from('chapters').select('*').eq('subject_id', subject.id).order('order_index');

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{subject.name}</h1>
        <p className="text-muted-foreground">{subject.description || `${chapters?.length || 0} chapters available`}</p>
      </div>
      <div className="space-y-2">
        {(chapters || []).map((chapter, i) => (
          <Link key={chapter.id} href={`/study/${slug}/${chapter.slug}`}>
            <Card className="hover:border-violet-500/30 transition-colors">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-400 font-semibold text-sm">{i + 1}</div>
                  <div>
                    <p className="font-medium text-sm">{chapter.name}</p>
                    <p className="text-xs text-muted-foreground">{chapter.total_topics} topics</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ))}
        {(!chapters || chapters.length === 0) && <p className="text-center py-8 text-muted-foreground">Chapters jald hi add honge!</p>}
      </div>
    </div>
  );
}
