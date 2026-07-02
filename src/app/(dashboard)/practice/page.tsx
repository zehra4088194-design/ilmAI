import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { SubjectSelector } from '@/components/features/quiz/SubjectSelector';
export const metadata: Metadata = { title: 'Practice MCQs' };

export default async function PracticePage() {
  const supabase = await createClient();
  const { data: subjects } = await supabase.from('subjects').select('*').eq('is_active', true).order('name');
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Practice MCQs</h1>
        <p className="text-muted-foreground">Apna subject choose karo aur practice shuru karo</p>
      </div>
      <SubjectSelector subjects={subjects || []} />
    </div>
  );
}
