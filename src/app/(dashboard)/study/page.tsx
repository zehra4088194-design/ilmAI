import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { BookOpen } from 'lucide-react';
export const metadata: Metadata = { title: 'Study' };

export default async function StudyPage() {
  const supabase = await createClient();
  const { data: subjects } = await supabase.from('subjects').select('*').eq('is_active', true).order('name');
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Study Materials</h1><p className="text-muted-foreground">Apne subjects explore karo aur seekho</p></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(subjects || []).map((subject) => (
          <Link key={subject.id} href={`/study/${subject.slug}`}>
            <Card className="hover:border-violet-500/30 transition-colors h-full">
              <CardContent className="p-5">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${subject.color}20` }}>
                  <BookOpen className="w-5 h-5" style={{ color: subject.color }} />
                </div>
                <h3 className="font-semibold mb-1">{subject.name}</h3>
                <p className="text-xs text-muted-foreground mb-3">{subject.total_chapters} chapters</p>
                <Progress value={0} className="h-1.5" />
              </CardContent>
            </Card>
          </Link>
        ))}
        {(!subjects || subjects.length === 0) && <div className="col-span-full text-center py-12 text-muted-foreground">Subjects jald hi add honge!</div>}
      </div>
    </div>
  );
}
