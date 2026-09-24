import { Metadata } from 'next';
import { CompetitionPlayClient } from '@/components/features/competitions/CompetitionPlayClient';

export const metadata: Metadata = { title: 'Subject Championship' };

export default async function SubjectChampionshipPlayPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl">
      <CompetitionPlayClient
        startUrl={`/api/boss-quiz/${id}/start`}
        completeUrl={`/api/boss-quiz/${id}/complete`}
        redirectUrl={`/competitions/subject/${id}`}
      />
    </div>
  );
}
