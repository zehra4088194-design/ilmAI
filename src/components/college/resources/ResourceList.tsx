'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { FileText, Pencil, Trash2, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { deleteResource } from '@/lib/college/actions/resources';
import { ResourceFormDialog } from '@/components/college/resources/ResourceFormDialog';
import type { CollegeResource } from '@/lib/college/types';

const TYPE_LABELS: Record<CollegeResource['resource_type'], string> = {
  notes: 'Notes',
  past_paper: 'Past paper',
  slides: 'Slides',
  other: 'Other',
};

export function ResourceList({
  collegeId,
  initialResources,
}: {
  collegeId: string;
  initialResources: CollegeResource[];
}) {
  const [resources, setResources] = useState(initialResources);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CollegeResource | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setResources(initialResources);
  }, [initialResources]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(resource: CollegeResource) {
    setEditing(resource);
    setDialogOpen(true);
  }

  function handleDelete(resource: CollegeResource) {
    if (!confirm(`Delete "${resource.title}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteResource(resource.id, resource.file_url);
      if (result.success) {
        setResources((prev) => prev.filter((r) => r.id !== resource.id));
        toast.success('Resource deleted.');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Could not delete the resource.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          Add resource
        </Button>
      </div>

      {resources.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No resources yet"
          description="Upload notes, past papers, or slides for your college's students."
        />
      ) : (
        <div className="space-y-3">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="glass border-border/60 bg-card/60 flex items-start justify-between gap-4 rounded-2xl border p-4 backdrop-blur-xl"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-medium">{resource.title}</p>
                  <Badge variant="secondary">{TYPE_LABELS[resource.resource_type]}</Badge>
                  {resource.dark_file_url && <Badge variant="outline">Dark file</Badge>}
                  {resource.context_text_url && <Badge variant="outline">AI TXT</Badge>}
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {[
                    resource.stream,
                    resource.degree_name,
                    resource.semester,
                    resource.course_name,
                    resource.chapter_title,
                  ]
                    .filter(Boolean)
                    .join(' · ') || 'No structure set'}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button size="icon-sm" variant="ghost" asChild>
                  <a
                    href={resource.light_file_url || resource.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Download file"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                </Button>
                <Button size="icon-sm" variant="ghost" onClick={() => openEdit(resource)} aria-label="Edit resource">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleDelete(resource)}
                  aria-label="Delete resource"
                >
                  <Trash2 className="text-destructive h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ResourceFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        collegeId={collegeId}
        resource={editing}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
