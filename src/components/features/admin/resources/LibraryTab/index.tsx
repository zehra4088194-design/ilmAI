'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LibraryFormDialog } from '../LibraryFormDialog';

export type LibraryResource = {
  id: string;
  title: string;
  description: string | null;
  category: 'local' | 'international';
  subject_id: string | null;
  subject_name?: string | null;
  board: string | null;
  grade_level: string | null;
  drive_url: string;
  drive_file_id: string | null;
  thumbnail_url: string | null;
  file_type: 'pdf' | 'docx' | 'pptx' | 'other';
  created_at: string;
};

export function LibraryTab() {
  const [resources, setResources] = useState<LibraryResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingResource, setEditingResource] = useState<LibraryResource | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<LibraryResource | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/library-resources');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Library load nahi ho saki');
      setResources(data.resources ?? []);
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
      const res = await fetch(`/api/admin/library-resources/${deleteTarget.id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Delete fail ho gaya');
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete mein masla hua');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{resources.length} resource{resources.length === 1 ? '' : 's'}</p>
        <Button
          onClick={() => {
            setEditingResource(null);
            setFormOpen(true);
          }}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Resource
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Board</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  <Loader2 className="h-4 w-4 animate-spin inline-block mr-2" />
                  Loading...
                </TableCell>
              </TableRow>
            ) : resources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Abhi tak koi resource add nahi hua.
                </TableCell>
              </TableRow>
            ) : (
              resources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="font-medium">{resource.title}</TableCell>
                  <TableCell>{resource.subject_name ?? 'All Subjects'}</TableCell>
                  <TableCell>{resource.grade_level ?? 'All Grades'}</TableCell>
                  <TableCell>{resource.board ?? 'All Boards'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{resource.file_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={resource.category === 'international' ? 'secondary' : 'outline'}>{resource.category}</Badge>
                  </TableCell>
                  <TableCell>{new Date(resource.created_at).toLocaleDateString()}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingResource(resource);
                          setFormOpen(true);
                        }}
                        aria-label="Edit resource"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(resource)} aria-label="Delete resource">
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

      <LibraryFormDialog open={formOpen} onOpenChange={setFormOpen} resource={editingResource} onSaved={refetch} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Resource delete karein?</AlertDialogTitle>
            <AlertDialogDescription>
              &quot;{deleteTarget?.title}&quot; permanently delete ho jayega. Yeh action undo nahi ho sakta.
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
