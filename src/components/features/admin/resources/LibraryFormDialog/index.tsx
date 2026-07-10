'use client';

import { FormEvent, useEffect, useState } from 'react';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { LibraryResource } from '../LibraryTab';

type Option = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resource: LibraryResource | null;
  onSaved: () => void | Promise<void>;
};

const ALL_VALUE = '__all__';
const FILE_TYPES: LibraryResource['file_type'][] = ['pdf', 'docx', 'pptx', 'other'];

const emptyForm = {
  title: '',
  description: '',
  category: 'local' as LibraryResource['category'],
  resource_type: 'text_book' as LibraryResource['resource_type'],
  subject_id: ALL_VALUE,
  chapter_id: ALL_VALUE,
  board: ALL_VALUE,
  grade_level: ALL_VALUE,
  drive_url: '',
  file_type: 'pdf' as LibraryResource['file_type'],
};

export function LibraryFormDialog({ open, onOpenChange, resource, onSaved }: Props) {
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [chapters, setChapters] = useState<Option[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!resource;

  useEffect(() => {
    if (!open) return;
    fetch('/api/admin/subjects')
      .then((response) => response.json())
      .then((data) => setSubjects(data.subjects ?? []))
      .catch(() => setSubjects([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (resource) {
      setForm({
        title: resource.title,
        description: resource.description ?? '',
        category: resource.category,
        resource_type: resource.resource_type ?? 'text_book',
        subject_id: resource.subject_id ?? ALL_VALUE,
        chapter_id: resource.chapter_id ?? ALL_VALUE,
        board: resource.board ?? ALL_VALUE,
        grade_level: resource.grade_level ?? ALL_VALUE,
        drive_url: resource.drive_url,
        file_type: resource.file_type,
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [open, resource]);

  useEffect(() => {
    if (form.subject_id === ALL_VALUE) {
      setChapters([]);
      return;
    }

    fetch(`/api/admin/chapters?subjectId=${form.subject_id}`)
      .then((response) => response.json())
      .then((data) => setChapters(data.chapters ?? []))
      .catch(() => setChapters([]));
  }, [form.subject_id]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!/^https?:\/\/.+drive\.google\.com/.test(form.drive_url.trim())) {
      setError('Drive URL valid nahi lag raha (drive.google.com link chahiye)');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        category: form.category,
        resource_type: form.resource_type,
        subject_id: form.subject_id === ALL_VALUE ? null : form.subject_id,
        chapter_id: form.chapter_id === ALL_VALUE ? null : form.chapter_id,
        board: form.board === ALL_VALUE ? null : form.board,
        grade_level: form.grade_level === ALL_VALUE ? null : form.grade_level,
        drive_url: form.drive_url.trim(),
        file_type: form.file_type,
      };

      const res = await fetch(isEdit ? `/api/admin/library-resources/${resource!.id}` : '/api/admin/library-resources', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save nahi ho saka');

      await onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kuch ghalat ho gaya');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resource-title">Title</Label>
            <Input id="resource-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Physics Notes - Chapter 5" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resource-description">Description</Label>
            <Textarea id="resource-description" value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Short note about what's inside" rows={2} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Subject</Label>
              <Select value={form.subject_id} onValueChange={(value) => setForm((current) => ({ ...current, subject_id: value, chapter_id: ALL_VALUE }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All Subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Chapter</Label>
              <Select value={form.chapter_id} onValueChange={(value) => setForm((current) => ({ ...current, chapter_id: value }))} disabled={form.subject_id === ALL_VALUE}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All Chapters</SelectItem>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Resource Type</Label>
              <Select value={form.resource_type} onValueChange={(value) => setForm((current) => ({ ...current, resource_type: value as LibraryResource['resource_type'] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text_book">Text Book</SelectItem>
                  <SelectItem value="notes">Notes</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(value) => setForm((current) => ({ ...current, category: value as LibraryResource['category'] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="local">Local</SelectItem>
                  <SelectItem value="international">International</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>File Type</Label>
              <Select value={form.file_type} onValueChange={(value) => setForm((current) => ({ ...current, file_type: value as LibraryResource['file_type'] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FILE_TYPES.map((fileType) => (
                    <SelectItem key={fileType} value={fileType}>
                      {fileType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Board</Label>
              <Select value={form.board} onValueChange={(value) => setForm((current) => ({ ...current, board: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All Boards</SelectItem>
                  {BOARDS.map((board) => (
                    <SelectItem key={board.value} value={board.value}>
                      {board.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Grade Level</Label>
              <Select value={form.grade_level} onValueChange={(value) => setForm((current) => ({ ...current, grade_level: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All Grades</SelectItem>
                  {GRADE_LEVELS.map((grade) => (
                    <SelectItem key={grade.value} value={grade.value}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="drive-url">Google Drive Link</Label>
            <Input id="drive-url" value={form.drive_url} onChange={(event) => setForm((current) => ({ ...current, drive_url: event.target.value }))} placeholder="https://drive.google.com/file/d/..." required />
            <p className="text-xs text-muted-foreground">Pehle Drive file ki sharing setting &quot;Anyone with the link can view&quot; par set karein.</p>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Resource'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
