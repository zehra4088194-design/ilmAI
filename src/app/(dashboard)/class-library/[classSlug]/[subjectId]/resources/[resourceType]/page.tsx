import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { CLASS_LIBRARY_RESOURCE_TYPES, type ClassLibraryResourceType } from '@/lib/class-library/types';
import { getClassLibraryClassBySlug, getClassLibrarySubjectById, getClassLibrarySubjectResources } from '@/lib/class-library/queries';

export default async function ClassLibraryResourceListPage({
  params,
}: {
  params: Promise<{ classSlug: string; subjectId: string; resourceType: string }>;
}) {
  const { classSlug, subjectId, resourceType } = await params;
  const typeMeta = CLASS_LIBRARY_RESOURCE_TYPES.find((type) => type.key === resourceType);
  if (!typeMeta) notFound();
  const klass = await getClassLibraryClassBySlug(classSlug);
  if (!klass) notFound();
  const subject = await getClassLibrarySubjectById(subjectId);
  if (!subject || subject.class_id !== klass.id) notFound();

  const resources = (await getClassLibrarySubjectResources(subjectId)).filter(
    (resource: any) => resource.resource_type === (resourceType as ClassLibraryResourceType)
  );

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href={`/class-library/${classSlug}/${subjectId}`}
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
