import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { HouseAdBanner } from '@/components/features/ads/HouseAdBanner';
import { UNIVERSITY_RESOURCE_TYPES, type UniversityResourceType } from '@/lib/university-hub/types';
import { UniversityResourceRow } from '@/components/features/university-hub/UniversityResourceRow';
import {
  getUniversitySubjectById,
  getUniversitySubjectResources,
} from '@/lib/university-hub/queries';

export default async function UniversityResourceListPage({
  params,
}: {
  params: Promise<{ programSlug: string; yearId: string; subjectId: string; resourceType: string }>;
}) {
  const { programSlug, yearId, subjectId, resourceType } = await params;
  const typeMeta = UNIVERSITY_RESOURCE_TYPES.find((type) => type.key === resourceType);
  if (!typeMeta) notFound();
  const subject = await getUniversitySubjectById(subjectId, yearId);
  if (!subject) notFound();

  const matchingResources = (await getUniversitySubjectResources(subjectId)).filter(
    (resource: any) => resource.resource_type === (resourceType as UniversityResourceType)
  );

  // One logical note may have Light PDF, Dark PDF, and a companion TXT. Keep
  // those together as one item; the TXT remains available to the protected
  // reader/AI layer and is never shown as a separate openable file.
  const stem = (title: string) =>
    title
      .replace(/_(?:Dark|Light)\\.pdf$/i, '')
      .replace(/_content\\.txt$/i, '')
      .replace(/\\.(?:pdf|txt)$/i, '')
      .trim()
      .toLowerCase();

  const displayTitle = (title: string) =>
    title
      .replace(/_(?:Dark|Light)\\.pdf$/i, '')
      .replace(/_content\\.txt$/i, '')
      .replace(/\\.(?:pdf|txt)$/i, '')
      .replace(/_/g, ' ')
      .replace(/\\s+/g, ' ')
      .trim();

  const grouped = new Map<string, { id: string; title: string; sort_order: number }>();
  for (const resource of matchingResources) {
    if (!resource.url || !/\\.pdf$/i.test(resource.title)) continue;
    const key = stem(resource.title);
    if (!key) continue;
    const existing = grouped.get(key);
    const isLight = /_Light\\.pdf$/i.test(resource.title);
    if (!existing || (isLight && !/_Light\\.pdf$/i.test(existing.title))) {
      grouped.set(key, {
        id: resource.id,
        title: displayTitle(resource.title),
        sort_order: resource.sort_order ?? 0,
      });
    }
  }

  const resources = [...grouped.values()].sort(
    (a, b) => a.sort_order - b.sort_order || a.title.localeCompare(b.title)
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

      <HouseAdBanner slot="store_products" categoryContext={subject.name} />

      {resources.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={`No ${typeMeta.label.toLowerCase()} yet`}
          description="Check back later — your admin adds these regularly."
        />
      ) : (
        <div className="space-y-2">
          {resources.map((resource) => (
            <UniversityResourceRow
              key={resource.id}
              id={resource.id}
              title={resource.title}
            />
          ))}
        </div>
      )}
    </div>
  );
}
