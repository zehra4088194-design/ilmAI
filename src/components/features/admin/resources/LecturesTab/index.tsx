'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { YouTubeThumbnailImage } from '@/components/ui/YouTubeThumbnailImage';
import { LectureFormDialog } from '../LectureFormDialog';

export type Lecture = {
  id: string;
  subject_id?: string | null;
  chapter_id: string;
  chapter_name?: string | null;
  topic_id: string | null;
  topic_name?: string | null;
  title: string;
  youtube_url: string;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  kind: 'lecture' | 'exercise_walkthrough';
  exercise_number: string | null;
  order_index: number;
  created_at: string;
};

export function LecturesTab() {
  const [lectures, setLectures] = useState<Lecture[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingLecture, setEditingLecture] = useState<Lecture | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Lecture | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/lectures');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Lectures could not be loaded.');
      setLectures(data.lectures ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kuch ghalat ho gaya');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/lectures/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete fail ho gaya');
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{lectures.length} lecture{lectures.length === 1 ? '' : 's'}</p>
        <Button
          onClick={() => {
            setEditingLecture(null);
            setFormOpen(true);
          }}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Lecture
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Thumbnail</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Chapter</TableHead>
              <TableHead>Kind</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                  Loading...
                </TableCell>
              </TableRow>
            ) : lectures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  No lectures have been added yet.
                </TableCell>
              </TableRow>
            ) : (
              lectures.map((lecture) => (
                <TableRow key={lecture.id}>
                  <TableCell>
                    <YouTubeThumbnailImage
                      youtubeUrl={lecture.youtube_url}
                      thumbnailUrl={lecture.thumbnail_url}
                      alt={lecture.title}
                      className="h-10 w-16 rounded object-cover"
                      fallbackClassName="h-10 w-16"
                    />
                  </TableCell>
                  <TableCell className="font-medium">{lecture.title}</TableCell>
                  <TableCell>{lecture.chapter_name ?? '-'}</TableCell>
                  <TableCell>
                    <Badge variant={lecture.kind === 'exercise_walkthrough' ? 'secondary' : 'outline'}>
                      {lecture.kind === 'exercise_walkthrough' ? lecture.exercise_number ?? 'Exercise' : 'Lecture'}
                    </Badge>
                  </TableCell>
                  <TableCell>{lecture.order_index}</TableCell>
                  <TableCell>{new Date(lecture.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingLecture(lecture);
                          setFormOpen(true);
                        }}
                        aria-label="Edit lecture"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(lecture)} aria-label="Delete lecture">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <LectureFormDialog open={formOpen} onOpenChange={setFormOpen} lecture={editingLecture} onSaved={refetch} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Lecture delete karein?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.title}&quot; will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
