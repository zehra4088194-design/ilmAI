import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';

export const runtime = 'nodejs';

export async function GET() {
  const supabase = createServiceClient() as any;
  const { data, error } = await supabase
    .from('questions')
    .select('subject_id, subjects(id, name, slug, color)')
    .eq('is_demo_eligible', true)
    .eq('type', 'MCQ')
    .not('subject_id', 'is', null);

  if (error) {
    console.error('demo subjects error:', error);
    return NextResponse.json({ subjects: [] });
  }

  const subjectMap = new Map<string, { id: string; name: string; slug?: string; color?: string | null; count: number }>();
  for (const row of data || []) {
    const subject = Array.isArray(row.subjects) ? row.subjects[0] : row.subjects;
    if (!subject?.id) continue;
    const existing = subjectMap.get(subject.id);
    subjectMap.set(subject.id, {
      id: subject.id,
      name: subject.name,
      slug: subject.slug,
      color: subject.color,
      count: (existing?.count || 0) + 1,
    });
  }

  return NextResponse.json({ subjects: Array.from(subjectMap.values()).filter((subject) => subject.count >= 5) });
}
