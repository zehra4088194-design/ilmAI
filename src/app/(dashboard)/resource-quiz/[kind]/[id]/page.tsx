import { ResourceQuizClient } from '@/components/features/resources/ResourceQuizClient';
import type { ProtectedResourceKind } from '@/lib/resources/server';

export const metadata = { title: 'Chapter MCQs | ilm AI' };

export default async function ResourceQuizPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  return <ResourceQuizClient kind={kind as ProtectedResourceKind} resourceId={id} />;
}
