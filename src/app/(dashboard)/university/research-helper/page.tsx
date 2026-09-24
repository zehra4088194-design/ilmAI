import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { UniversityToolClient } from '@/components/features/university/UniversityToolClient';
import { ResearchProjectStarter } from '@/components/features/university/ResearchProjectStarter';

export const metadata: Metadata = { title: 'Research Helper' };

export default async function ResearchHelperPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('university_courses, preferred_output_style').eq('id', user!.id).single();
  return (
    <div className="space-y-6">
      <ResearchProjectStarter />
      <UniversityToolClient tool="research" title="Research / Project Helper" description="Create project titles, abstract, problem statement, objectives, methodology and reference placeholders." defaultSubject={profile?.university_courses?.[0] || ''} defaultStyle={profile?.preferred_output_style || 'academic'} />
    </div>
  );
}
