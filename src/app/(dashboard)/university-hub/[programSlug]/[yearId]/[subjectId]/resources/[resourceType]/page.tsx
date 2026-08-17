import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { UNIVERSITY_RESOURCE_TYPES, type UniversityResourceType } from '@/lib/university-hub/types';
import { getUniversitySubjectById, getUniversitySubjectResources } from '@/lib/university-hub/queries';

export default async function UniversityResourceListPage({
  params,
}: {
  params: Promise<{ programSlug: string; yearId: string; subjectId: string; resourceType: string }>;
}) {
  const { programSlug, yearId, subjectId, resourceType } = await params;
  const typeMeta = UNIVERSITY_RESOURCE_TYPES.find((type) => type.key === resourceType);
  if (!typeMeta) notFound();
  const subject = await getUniversitySubjectById(subjectId);
  if (!subject || subject.program_year_id !== yearId) notFound();

  const resources = (await getUniversitySubjectResources(subjectId)).filter(
    (resource: any) => resource.resource_type === (resourceType as UniversityResourceType)
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/university-hub/${programSlug}/${yearId}/${subjectId}`}
        className="text-primary inline-flex items-center gap-1.5 text-sm hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> {subject.name}
      </Link>
      <header>
        <h1 className="text-2xl font-bold">
          {typeMeta.label} - {subject.name}
        </h1>
      </header>

      {resources.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={`No ${typeMeta.label.toLowerCase()} yet`}
          description="Check back later — your admin adds these regularly."
        />
      ) : (
        <div className="space-y-2">
          {resources.map((resource: any) => (
            <Card key={resource.id}>
              <CardContent className="flex items-center justify-between gap-3 p-4">
                <span className="truncate text-sm font-medium">{resource.title}</span>
                {resource.url && (
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-semibold hover:underline"
                  >
                    Open <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
