import { Metadata } from 'next';
import { createClient } from '@/lib/supabase/server';
import { UniversityToolClient } from '@/components/features/university/UniversityToolClient';

export const metadata: Metadata = { title: 'Semester Planner' };

export default async function SemesterPlannerPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase.from('profiles').select('university_courses, preferred_output_style').eq('id', user!.id).single();
  return <UniversityToolClient tool="planner" title="Subject-wise Semester Planner" description="Create daily revision tasks, MCQ practice, flashcards, past paper style tasks and next action." defaultSubject={(profile?.university_courses || []).join(', ')} defaultStyle={profile?.preferred_output_style || 'detailed'} />;
}
