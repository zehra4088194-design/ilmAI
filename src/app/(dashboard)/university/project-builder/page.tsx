import { Metadata } from 'next';
import { ProjectBuilderClient } from '@/components/features/university/ProjectBuilderClient';

export const metadata: Metadata = { title: 'AI Project Builder' };

export default async function ProjectBuilderPage() {
  return <ProjectBuilderClient />;
}
