import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { EssayWriterForm } from '@/components/features/essay-writer/EssayWriterForm';
import { getUserGradeLevel } from '@/lib/supabase/getUserGradeLevel';
export const metadata: Metadata = { title: 'Essay Writer' };

export default async function EssayWriterPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('subscription_tier').eq('id', user!.id).single();
  const { gradeLevel } = await getUserGradeLevel(supabase, user!.id);
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div><h1 className="text-2xl font-bold">Essay Writer ✍️</h1><p className="text-muted-foreground">Enter a topic, choose an essay type and word count, and let AI write it for you.</p></div>
      <EssayWriterForm userTier={(profile?.subscription_tier as any) || 'FREE'} gradeLevel={gradeLevel} />
    </div>
  );
}
