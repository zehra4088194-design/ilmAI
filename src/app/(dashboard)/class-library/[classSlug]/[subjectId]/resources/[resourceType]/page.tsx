import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { EmptyState } from '@/components/ui/EmptyState';
import { ClassLibraryResourceRow } from '@/components/features/class-library/ClassLibraryResourceRow';
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
            <ClassLibraryResourceRow
              key={resource.id}
              id={resource.id}
              title={resource.title}
              url={resource.url}
              resourceType={resource.resource_type}
            />
          ))}
        </div>
      )}
    </div>
  );
}
