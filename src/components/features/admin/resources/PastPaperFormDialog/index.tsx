'use client';

import { FormEvent, useEffect, useState } from 'react';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PastPaper } from '../PastPapersTab';

type Option = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  paper: PastPaper | null;
  onSaved: () => void | Promise<void>;
};

const ALL_VALUE = '__all__';
const PAPER_TYPES: PastPaper['paper_type'][] = ['ANNUAL', 'SUPPLEMENTARY', 'MODEL'];
const currentYear = new Date().getFullYear();

const emptyForm = {
  subject_id: '',
  chapter_id: ALL_VALUE,
  board: '',
  grade_level: '',
  year: currentYear,
  paper_type: 'ANNUAL' as PastPaper['paper_type'],
  file_url: '',
  context_text_url: '',
  total_questions: 0,
  duration: 180,
  is_verified: false,
};

export function PastPaperFormDialog({ open, onOpenChange, paper, onSaved }: Props) {
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [chapters, setChapters] = useState<Option[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEdit = !!paper;

  useEffect(() => {
    if (!open) return;
    fetch('/api/admin/subjects')
      .then((response) => response.json())
      .then((data) => setSubjects(data.subjects ?? []))
      .catch(() => setSubjects([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (paper) {
      setForm({
        subject_id: paper.subject_id,
        chapter_id: paper.chapter_id ?? ALL_VALUE,
        board: paper.board,
        grade_level: paper.grade_level ?? '',
        year: paper.year,
        paper_type: paper.paper_type,
        file_url: paper.file_url,
        context_text_url: paper.context_text_url || '',
        total_questions: paper.total_questions,
        duration: paper.duration,
        is_verified: paper.is_verified,
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
  }, [open, paper]);

  useEffect(() => {
    if (!form.subject_id) {
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

    if (!form.subject_id) {
      setError('Subject select karna zaroori hai');
      return;
    }
    if (!form.board) {
      setError('Board select karna zaroori hai');
      return;
    }
    if (!form.grade_level) {
      setError('Class select karna zaroori hai');
      return;
    }
    if (!/^https?:\/\//.test(form.file_url.trim())) {
      setError('File URL valid nahi lag raha');
      return;
    }
    if (!/^https:\/\//i.test(form.context_text_url.trim())) {
      setError('AI summary/test ke liye companion .txt file ka HTTPS ya Google Drive link zaroori hai.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        subject_id: form.subject_id,
        chapter_id: form.chapter_id === ALL_VALUE ? null : form.chapter_id,
        board: form.board,
        grade_level: form.grade_level,
        year: Number(form.year),
        paper_type: form.paper_type,
        file_url: form.file_url.trim(),
        context_text_url: form.context_text_url.trim(),
        total_questions: Number(form.total_questions) || 0,
        duration: Number(form.duration) || 180,
        is_verified: form.is_verified,
      };

      const res = await fetch(isEdit ? `/api/admin/past-papers/${paper!.id}` : '/api/admin/past-papers', {
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
          <DialogTitle>{isEdit ? 'Edit Past Paper' : 'Add Past Paper'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Subject</Label>
              <Select value={form.subject_id} onValueChange={(value) => setForm((current) => ({ ...current, subject_id: value, chapter_id: ALL_VALUE }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Subject chunein" />
                </SelectTrigger>
                <SelectContent>
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
              <Select value={form.chapter_id} onValueChange={(value) => setForm((current) => ({ ...current, chapter_id: value }))} disabled={!form.subject_id}>
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
              <Label>Board</Label>
              <Select value={form.board} onValueChange={(value) => setForm((current) => ({ ...current, board: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Board chunein" />
                </SelectTrigger>
                <SelectContent>
                  {BOARDS.map((board) => (
                    <SelectItem key={board.value} value={board.value}>
                      {board.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Paper Type</Label>
              <Select value={form.paper_type} onValueChange={(value) => setForm((current) => ({ ...current, paper_type: value as PastPaper['paper_type'] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PAPER_TYPES.map((paperType) => (
                    <SelectItem key={paperType} value={paperType}>
                      {paperType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Grade Level</Label>
              <Select value={form.grade_level} onValueChange={(value) => setForm((current) => ({ ...current, grade_level: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Class chunein" />
                </SelectTrigger>
                <SelectContent>
                  {GRADE_LEVELS.map((grade) => (
                    <SelectItem key={grade.value} value={grade.value}>
                      {grade.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paper-year">Year</Label>
              <Input id="paper-year" type="number" value={form.year} onChange={(event) => setForm((current) => ({ ...current, year: Number(event.target.value) }))} min={1990} max={currentYear + 1} required />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="paper-duration">Duration (minutes)</Label>
              <Input id="paper-duration" type="number" value={form.duration} onChange={(event) => setForm((current) => ({ ...current, duration: Number(event.target.value) }))} min={1} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="file-url">File URL</Label>
            <Input id="file-url" value={form.file_url} onChange={(event) => setForm((current) => ({ ...current, file_url: event.target.value }))} placeholder="https://.../paper.pdf" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="paper-context-text-url">Companion context .txt link</Label>
            <Input
              id="paper-context-text-url"
              value={form.context_text_url}
              onChange={(event) => setForm((current) => ({ ...current, context_text_url: event.target.value }))}
              placeholder="https://drive.google.com/file/d/.../view"
              required
            />
            <p className="text-muted-foreground text-xs">Paper ka complete text; summary aur test server isi file se banayega.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="total-questions">Total Questions</Label>
            <Input id="total-questions" type="number" value={form.total_questions} onChange={(event) => setForm((current) => ({ ...current, total_questions: Number(event.target.value) }))} min={0} />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox id="is-verified" checked={form.is_verified} onCheckedChange={(checked) => setForm((current) => ({ ...current, is_verified: checked === true }))} />
            <Label htmlFor="is-verified" className="cursor-pointer">
              Verified
            </Label>
          </div>

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Past Paper'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
