'use client';

import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, Circle, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { PastPaperFormDialog } from '../PastPaperFormDialog';

export type PastPaper = {
  id: string;
  subject_id: string;
  subject_name?: string | null;
  board: string;
  year: number;
  paper_type: 'ANNUAL' | 'SUPPLEMENTARY' | 'MODEL';
  file_url: string;
  thumbnail_url: string | null;
  total_questions: number;
  duration: number;
  is_verified: boolean;
  download_count: number;
  created_at: string;
};

export function PastPapersTab() {
  const [papers, setPapers] = useState<PastPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState<PastPaper | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<PastPaper | null>(null);
  const [deleting, setDeleting] = useState(false);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/past-papers');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Past papers load nahi ho sakay');
      setPapers(data.papers ?? []);
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
      const res = await fetch(`/api/admin/past-papers/${deleteTarget.id}`, { method: 'DELETE' });
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
        <p className="text-sm text-muted-foreground">{papers.length} paper{papers.length === 1 ? '' : 's'}</p>
        <Button
          onClick={() => {
            setEditingPaper(null);
            setFormOpen(true);
          }}
          size="sm"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Add Past Paper
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Subject</TableHead>
              <TableHead>Board</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Downloads</TableHead>
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
            ) : papers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Abhi tak koi past paper add nahi hua.
                </TableCell>
              </TableRow>
            ) : (
              papers.map((paper) => (
                <TableRow key={paper.id}>
                  <TableCell className="font-medium">{paper.subject_name ?? '-'}</TableCell>
                  <TableCell>{paper.board}</TableCell>
                  <TableCell>{paper.year}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{paper.paper_type}</Badge>
                  </TableCell>
                  <TableCell>
                    {paper.is_verified ? (
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                    ) : (
                      <Circle className="h-4 w-4 text-muted-foreground" />
                    )}
                  </TableCell>
                  <TableCell>{paper.download_count}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingPaper(paper);
                          setFormOpen(true);
                        }}
                        aria-label="Edit past paper"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteTarget(paper)} aria-label="Delete past paper">
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

      <PastPaperFormDialog open={formOpen} onOpenChange={setFormOpen} paper={editingPaper} onSaved={refetch} />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Past paper delete karein?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget?.subject_name ?? 'Yeh paper'} ({deleteTarget?.year}) permanently delete ho jayega. Yeh action undo nahi ho sakta.
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
