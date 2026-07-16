'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Video, Pencil, Trash2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { deleteLecture } from '@/lib/college/actions/lectures';
import { LectureFormDialog } from '@/components/college/lectures/LectureFormDialog';
import type { CollegeLecture } from '@/lib/college/types';

export function LectureList({ collegeId, initialLectures }: { collegeId: string; initialLectures: CollegeLecture[] }) {
  const [lectures, setLectures] = useState(initialLectures);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CollegeLecture | null>(null);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  useEffect(() => {
    setLectures(initialLectures);
  }, [initialLectures]);

  function openCreate() {
    setEditing(null);
    setDialogOpen(true);
  }

  function openEdit(lecture: CollegeLecture) {
    setEditing(lecture);
    setDialogOpen(true);
  }

  function handleDelete(lecture: CollegeLecture) {
    if (!confirm(`Delete "${lecture.title}"? This can't be undone.`)) return;
    startTransition(async () => {
      const result = await deleteLecture(lecture.id);
      if (result.success) {
        setLectures((prev) => prev.filter((l) => l.id !== lecture.id));
        toast.success('Lecture deleted.');
        router.refresh();
      } else {
        toast.error(result.error ?? 'Could not delete the lecture.');
      }
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-end">
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4" />
          Add lecture
        </Button>
      </div>

      {lectures.length === 0 ? (
        <EmptyState
          icon={Video}
          title="No lectures added yet"
          description="Add your first lecture link (YouTube or Google Drive) so students can start watching."
        />
      ) : (
        <div className="space-y-3">
          {lectures.map((lecture) => (
            <div
              key={lecture.id}
              className="glass border-border/60 bg-card/60 flex items-start justify-between gap-4 rounded-2xl border p-4 backdrop-blur-xl"
            >
              <div className="min-w-0 flex-1">
                <p className="font-medium">{lecture.title}</p>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {[lecture.stream, lecture.degree_name, lecture.semester, lecture.course_name, lecture.chapter_title]
                    .filter(Boolean)
                    .join(' · ') || 'No structure set'}
                </p>
                {lecture.description && (
                  <p className="text-muted-foreground mt-1 line-clamp-2 text-sm">{lecture.description}</p>
                )}
              </div>
              <div className="flex shrink-0 items-center gap-1.5">
                <Button size="icon-sm" variant="ghost" onClick={() => openEdit(lecture)} aria-label="Edit lecture">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  size="icon-sm"
                  variant="ghost"
                  disabled={isPending}
                  onClick={() => handleDelete(lecture)}
                  aria-label="Delete lecture"
                >
                  <Trash2 className="text-destructive h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <LectureFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        collegeId={collegeId}
        lecture={editing}
        onSaved={() => router.refresh()}
      />
    </div>
  );
}
