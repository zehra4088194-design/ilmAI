import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { ResearchWorkspaceClient } from '@/components/features/university/ResearchWorkspaceClient';
import { createClient } from '@/lib/supabase/server';

export const metadata: Metadata = { title: 'Research Workspace' };

export default async function ResearchWorkspacePage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = await params;
  const supabase = await createClient();
  const db = supabase as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();
  const { data: project } = await db
    .from('research_projects')
    .select('*')
    .eq('id', projectId)
    .eq('student_id', user.id)
    .single();
  if (!project) notFound();
  return <ResearchWorkspaceClient projectId={project.id} title={project.title} topic={project.topic} />;
}
