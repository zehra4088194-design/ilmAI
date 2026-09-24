import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { UniversityToolClient } from '@/components/features/university/UniversityToolClient';

export const metadata: Metadata = { title: 'Assignment Helper' };

export default async function AssignmentHelperPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('university_courses, preferred_output_style').eq('id', user!.id).single();
  return <UniversityToolClient tool="assignment" title="Assignment Helper" description="Create clear assignment drafts, explanations, examples and viva follow-up questions without fake citations." defaultSubject={profile?.university_courses?.[0] || ''} defaultStyle={profile?.preferred_output_style || 'simple'} />;
}
