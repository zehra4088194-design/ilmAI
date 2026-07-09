import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { UniversityToolClient } from '@/components/features/university/UniversityToolClient';

export const metadata: Metadata = { title: 'Presentation Builder' };

export default async function PresentationBuilderPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('university_courses, preferred_output_style').eq('id', user!.id).single();
  return <UniversityToolClient tool="presentation" title="AI Presentation Builder" description="Build slide-by-slide content, speaker notes, key points, summary and viva questions." defaultSubject={profile?.university_courses?.[0] || ''} defaultStyle={profile?.preferred_output_style || 'professional'} />;
}
