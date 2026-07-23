'use client';

import { FormEvent, useEffect, useState } from 'react';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { extractGoogleDriveFileId } from '@/lib/utils/filePreview';
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

function isAcceptableResourceUrl(url: string) {
  if (!/^https?:\/\//i.test(url)) return false;
  if (extractGoogleDriveFileId(url)) return true;
  try {
    const parsed = new URL(url);
    const path = parsed.pathname.toLowerCase();
    return ['.pdf', '.docx', '.pptx'].some((extension) => path.endsWith(extension));
  } catch {
    return false;
  }
}

const emptyForm = {
  title: '',
  book_title: '',
  description: '',
  category: 'local' as LibraryResource['category'],
  resource_type: 'text_book' as LibraryResource['resource_type'],
  content_section: 'reading' as LibraryResource['content_section'],
  subject_id: ALL_VALUE,
  chapter_id: ALL_VALUE,
  board: ALL_VALUE,
  grade_level: ALL_VALUE,
  light_file_url: '',
  dark_file_url: '',
  context_text_url: '',
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
        book_title: resource.book_title || '',
        description: resource.description ?? '',
        category: resource.category,
        resource_type: resource.resource_type ?? 'text_book',
        content_section: resource.content_section ?? 'reading',
        subject_id: resource.subject_id ?? ALL_VALUE,
        chapter_id: resource.chapter_id ?? ALL_VALUE,
        board: resource.board ?? ALL_VALUE,
        grade_level: resource.grade_level ?? ALL_VALUE,
        light_file_url: resource.light_file_url || resource.drive_url,
        dark_file_url: resource.dark_file_url || '',
        context_text_url: resource.context_text_url || '',
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

    const lightFileUrl = form.light_file_url.trim();
    const darkFileUrl = form.dark_file_url.trim();
    const contextTextUrl = form.context_text_url.trim();
    if (form.subject_id === ALL_VALUE || form.chapter_id === ALL_VALUE) {
      setError('Subject and chapter are required for the organized library.');
      return;
    }
    if (form.board === ALL_VALUE || form.grade_level === ALL_VALUE) {
      setError('Board and grade/class are required for the correct student library.');
      return;
    }
    if (!isAcceptableResourceUrl(lightFileUrl)) {
      setError('Light/default Google Drive/Docs share link ya direct PDF URL paste karein.');
      return;
    }
    if (darkFileUrl && !isAcceptableResourceUrl(darkFileUrl)) {
      setError('Paste a valid Google Drive, Google Docs, or direct PDF URL for dark mode.');
      return;
    }
    if (contextTextUrl && !/^https:\/\//i.test(contextTextUrl)) {
      setError('Paste an HTTPS or Google Drive link for the companion .txt file.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        book_title: form.book_title.trim() || null,
        description: form.description.trim() || null,
        category: form.category,
        resource_type: form.resource_type,
        content_section: form.content_section,
        subject_id: form.subject_id === ALL_VALUE ? null : form.subject_id,
        chapter_id: form.chapter_id === ALL_VALUE ? null : form.chapter_id,
        board: form.board === ALL_VALUE ? null : form.board,
        grade_level: form.grade_level === ALL_VALUE ? null : form.grade_level,
        drive_url: lightFileUrl,
        light_file_url: lightFileUrl,
        dark_file_url: darkFileUrl || null,
        context_text_url: contextTextUrl || null,
        file_type: form.file_type,
      };

      const res = await fetch(
        isEdit ? `/api/admin/library-resources/${resource!.id}` : '/api/admin/library-resources',
        {
          method: isEdit ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || data.details || 'Save failed.');

      await onSaved();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92dvh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Resource' : 'Add Resource'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resource-title">Title</Label>
            <Input
              id="resource-title"
              value={form.title}
              onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
              placeholder="Physics Notes - Chapter 5"
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resource-book-title">Book / Collection name</Label>
            <Input
              id="resource-book-title"
              value={form.book_title}
              onChange={(event) => setForm((current) => ({ ...current, book_title: event.target.value }))}
              placeholder="Class 9 Physics Text Book"
              required
            />
            <p className="text-muted-foreground text-xs">Chapter files with the same book name will be grouped together.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="resource-description">Description</Label>
            <Textarea
              id="resource-description"
              value={form.description}
              onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
              placeholder="Short note about what's inside"
              rows={2}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Subject</Label>
              <Select
                value={form.subject_id}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, subject_id: value, chapter_id: ALL_VALUE }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Select Subject</SelectItem>
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
              <Select
                value={form.chapter_id}
                onValueChange={(value) => setForm((current) => ({ ...current, chapter_id: value }))}
                disabled={form.subject_id === ALL_VALUE}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>Select Chapter</SelectItem>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Resource Type</Label>
              <Select
                value={form.resource_type}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, resource_type: value as LibraryResource['resource_type'] }))
                }
              >
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
              <Label>File Section</Label>
              <Select
                value={form.content_section}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, content_section: value as LibraryResource['content_section'] }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reading">Chapter Reading</SelectItem>
                  <SelectItem value="mcq">MCQs</SelectItem>
                  <SelectItem value="short">Short Questions</SelectItem>
                  <SelectItem value="long">Long Questions</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, category: value as LibraryResource['category'] }))
                }
              >
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
              <Select
                value={form.file_type}
                onValueChange={(value) =>
                  setForm((current) => ({ ...current, file_type: value as LibraryResource['file_type'] }))
                }
              >
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>Board</Label>
              <Select
                value={form.board}
                onValueChange={(value) => setForm((current) => ({ ...current, board: value }))}
              >
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
              <Select
                value={form.grade_level}
                onValueChange={(value) => setForm((current) => ({ ...current, grade_level: value }))}
              >
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
            <Label htmlFor="light-drive-url">Light mode PDF / Drive link</Label>
            <Input
              id="light-drive-url"
              value={form.light_file_url}
              onChange={(event) => setForm((current) => ({ ...current, light_file_url: event.target.value }))}
              placeholder="https://drive.google.com/file/d/.../view"
              required
            />
            <p className="text-muted-foreground text-xs">
              Light PDF default bhi rahegi. Drive sharing &quot;Anyone with the link can view&quot; rakhein.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="dark-drive-url">Dark mode PDF / Drive link (optional)</Label>
            <Input
              id="dark-drive-url"
              value={form.dark_file_url}
              onChange={(event) => setForm((current) => ({ ...current, dark_file_url: event.target.value }))}
              placeholder="https://drive.google.com/file/d/.../view"
            />
            <p className="text-muted-foreground text-xs">Student dark mode on kare to ye PDF open hogi.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="context-text-url">Companion context .txt link (optional)</Label>
            <Input
              id="context-text-url"
              value={form.context_text_url}
              onChange={(event) => setForm((current) => ({ ...current, context_text_url: event.target.value }))}
              placeholder="https://drive.google.com/file/d/.../view"
            />
            <p className="text-muted-foreground text-xs">
              If left empty, the server will OCR the PDF once and create a private TXT sidecar. Providing complete
              readable TXT content is more accurate and faster.
            </p>
          </div>

          {error && <p className="text-destructive text-sm">{error}</p>}

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
