import { Metadata } from 'next';
import { CompetitionPlayClient } from '@/components/features/competitions/CompetitionPlayClient';

export const metadata: Metadata = { title: 'Competition' };

export default async function CompetitionPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl">
      <CompetitionPlayClient
        startUrl={`/api/competitions/${id}/start`}
        completeUrl={`/api/competitions/${id}/complete`}
        redirectUrl={`/competitions/${id}`}
      />
    </div>
  );
}
