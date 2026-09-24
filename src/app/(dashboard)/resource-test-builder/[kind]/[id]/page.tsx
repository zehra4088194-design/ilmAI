import { ResourceTestBuilderClient } from '@/components/features/resources/ResourceTestBuilderClient';
import type { ProtectedResourceKind } from '@/lib/resources/server';

export const metadata = { title: 'Test from this file | ilm AI' };

export default async function ResourceTestBuilderPage({
  params,
}: {
  params: Promise<{ kind: string; id: string }>;
}) {
  const { kind, id } = await params;
  return <ResourceTestBuilderClient kind={kind as ProtectedResourceKind} resourceId={id} />;
}
