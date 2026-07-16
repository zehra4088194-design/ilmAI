'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LibraryFormDialog } from '../LibraryFormDialog';

export type LibraryResource = {
  id: string;
  title: string;
  description: string | null;
  category: 'local' | 'international';
  resource_type: 'text_book' | 'notes' | 'other';
  subject_id: string | null;
  subject_name?: string | null;
  chapter_id?: string | null;
  chapter_name?: string | null;
  board: string | null;
  grade_level: string | null;
  drive_url: string;
  drive_file_id: string | null;
  light_file_url: string | null;
  dark_file_url: string | null;
  context_text_url: string | null;
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
  const [gradeFilter, setGradeFilter] = useState('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | LibraryResource['resource_type']>('ALL');

  const filteredResources = resources.filter((resource) => {
    const gradeMatches = gradeFilter === 'ALL' || resource.grade_level === gradeFilter;
    const typeMatches = typeFilter === 'ALL' || resource.resource_type === typeFilter;
    return gradeMatches && typeMatches;
  });

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
        <div>
          <p className="text-muted-foreground text-sm">
            {filteredResources.length} of {resources.length} resource{resources.length === 1 ? '' : 's'}
          </p>
          <p className="text-muted-foreground text-xs">Class aur type select karke manage karo.</p>
        </div>
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

      {error && <p className="text-destructive text-sm">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <select
          value={gradeFilter}
          onChange={(event) => setGradeFilter(event.target.value)}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          <option value="ALL">All classes</option>
          <option value="GRADE_9">Grade 9</option>
          <option value="GRADE_10">Grade 10</option>
          <option value="GRADE_11">Grade 11</option>
          <option value="GRADE_12">Grade 12</option>
          <option value="O_LEVEL">O Level</option>
          <option value="A_LEVEL">A Level</option>
        </select>
        <select
          value={typeFilter}
          onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}
          className="border-input bg-background h-9 rounded-md border px-3 text-sm"
        >
          <option value="ALL">All resource types</option>
          <option value="text_book">Text Books</option>
          <option value="notes">Notes</option>
          <option value="other">Other</option>
        </select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Chapter</TableHead>
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
                <TableCell colSpan={9} className="py-8 text-center">
                  <Loader2 className="mr-2 inline-block h-4 w-4 animate-spin" />
                  Loading...
                </TableCell>
              </TableRow>
            ) : filteredResources.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-muted-foreground py-8 text-center">
                  Is filter ke liye koi resource nahi mila.
                </TableCell>
              </TableRow>
            ) : (
              filteredResources.map((resource) => (
                <TableRow key={resource.id}>
                  <TableCell className="font-medium">{resource.title}</TableCell>
                  <TableCell>{resource.subject_name ?? 'All Subjects'}</TableCell>
                  <TableCell>{resource.chapter_name ?? 'All Chapters'}</TableCell>
                  <TableCell>{resource.grade_level ?? 'All Grades'}</TableCell>
                  <TableCell>{resource.board ?? 'All Boards'}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      <Badge variant="outline">
                        {resource.resource_type === 'text_book' ? 'Text Book' : resource.resource_type}
                      </Badge>
                      <Badge variant="secondary">{resource.file_type}</Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={resource.category === 'international' ? 'secondary' : 'outline'}>
                      {resource.category}
                    </Badge>
                    {(resource.light_file_url || resource.drive_url) && <Badge variant="outline">Light</Badge>}
                    {resource.dark_file_url && <Badge variant="secondary">Dark</Badge>}
                    {resource.context_text_url && <Badge variant="success">AI TXT</Badge>}
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
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setDeleteTarget(resource)}
                        aria-label="Delete resource"
                      >
                        <Trash2 className="text-destructive h-4 w-4" />
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
