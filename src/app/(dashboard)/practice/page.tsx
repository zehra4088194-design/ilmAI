import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { SubjectSelector } from '@/components/features/quiz/SubjectSelector';

export const metadata: Metadata = { title: 'Practice MCQs' };

export default async function PracticePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .eq('is_active', true)
    .order('name');

  let grade = 'GRADE_10';
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('grade_level')
      .eq('id', user.id)
      .single();
    grade = profile?.grade_level || 'GRADE_10';
  }

  // Fetch chapters for every active subject, then filter to this student's
  // grade client-side per subject (empty grade_levels = visible to all grades,
  // same convention as the existing `boards` column).
  const { data: allChapters } = await supabase
    .from('chapters')
    .select('id, subject_id, name, order_index, grade_levels')
    .eq('is_active', true)
    .order('order_index', { ascending: true });

  const chaptersBySubject: Record<string, { id: string; name: string }[]> = {};
  (allChapters || []).forEach((c) => {
    const levels = c.grade_levels || [];
    const visible = levels.length === 0 || levels.includes(grade);
    if (!visible) return;
    if (!chaptersBySubject[c.subject_id]) chaptersBySubject[c.subject_id] = [];
    chaptersBySubject[c.subject_id]!.push({ id: c.id, name: c.name });
  });

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Practice MCQs</h1>
        <p className="text-muted-foreground">Apna subject aur chapter choose karo aur practice shuru karo</p>
      </div>
      <SubjectSelector subjects={subjects || []} chaptersBySubject={chaptersBySubject} />
    </div>
  );
}
