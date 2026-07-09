import { Metadata } from 'next';
import Link from 'next/link';
import { createAdminClient } from '@/lib/supabase/server';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GRADE_LEVELS } from '@/lib/constants';

export const metadata: Metadata = { title: 'Admin - Content' };

export default async function AdminContentPage({ searchParams }: { searchParams: Promise<{ grade?: string }> }) {
  const { grade } = await searchParams;
  const selectedGrade = GRADE_LEVELS.some((g) => g.value === grade) ? grade : undefined;
  const supabase = await createAdminClient();

  let subjectsQuery = supabase.from('subjects').select('*, chapters(count)').order('name');
  if (selectedGrade) subjectsQuery = subjectsQuery.contains('grade_levels', [selectedGrade]);
  const { data: subjects } = await subjectsQuery;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Content Management</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Class select karo, phir us class ke subjects aur chapters manage karo. Board aur grade tags se curriculum separate rahega.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/admin/content">
          <Badge variant={!selectedGrade ? 'default' : 'secondary'} className="cursor-pointer">All classes</Badge>
        </Link>
        {GRADE_LEVELS.map((g) => (
          <Link key={g.value} href={`/admin/content?grade=${g.value}`}>
            <Badge variant={selectedGrade === g.value ? 'default' : 'secondary'} className="cursor-pointer">{g.label}</Badge>
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {(subjects || []).map((s) => (
          <Link key={s.id} href={`/admin/content/${s.id}`}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardContent className="p-5">
                <h3 className="font-semibold">{s.name}</h3>
                <p className="text-xs text-muted-foreground mt-1">{s.total_chapters} chapters · {s.total_questions} questions</p>
                <p className="text-[10px] text-muted-foreground mt-2">{(s.boards || []).join(', ') || 'No boards set'}</p>
                <div className="flex flex-wrap gap-1 mt-3">
                  {(s.grade_levels || []).length === 0 ? (
                    <Badge variant="outline" className="text-[10px]">No grades set</Badge>
                  ) : (
                    s.grade_levels.map((level: string) => {
                      const label = GRADE_LEVELS.find((g) => g.value === level)?.label || level;
                      return <Badge key={level} variant="outline" className="text-[10px]">{label}</Badge>;
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
        {(!subjects || subjects.length === 0) && <p className="text-muted-foreground col-span-full text-center py-8">Is class ke liye koi subject nahi mila.</p>}
      </div>
    </div>
  );
}
