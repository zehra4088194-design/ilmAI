'use client';

import { FormEvent, useEffect, useState } from 'react';
import { ImageOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { YouTubeThumbnailImage } from '@/components/ui/YouTubeThumbnailImage';
import { deriveThumbnailFromUrl, isValidYouTubeUrl } from '@/lib/utils/extractYouTubeId';
import type { Lecture } from '../LecturesTab';

type Option = { id: string; name: string };

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lecture: Lecture | null;
  onSaved: () => void | Promise<void>;
};

const NONE_VALUE = '__none__';

const emptyForm = {
  subject_id: '',
  chapter_id: '',
  topic_id: NONE_VALUE,
  title: '',
  youtube_url: '',
  kind: 'lecture' as Lecture['kind'],
  exercise_number: '',
  order_index: 0,
};

export function LectureFormDialog({ open, onOpenChange, lecture, onSaved }: Props) {
  const [subjects, setSubjects] = useState<Option[]>([]);
  const [chapters, setChapters] = useState<Option[]>([]);
  const [topics, setTopics] = useState<Option[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlError, setUrlError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const isEdit = !!lecture;

  useEffect(() => {
    if (!open) return;
    fetch('/api/admin/subjects')
      .then((response) => response.json())
      .then((data) => setSubjects(data.subjects ?? []))
      .catch(() => setSubjects([]));
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (lecture) {
      setForm({
        subject_id: lecture.subject_id ?? '',
        chapter_id: lecture.chapter_id,
        topic_id: lecture.topic_id ?? NONE_VALUE,
        title: lecture.title,
        youtube_url: lecture.youtube_url,
        kind: lecture.kind,
        exercise_number: lecture.exercise_number ?? '',
        order_index: lecture.order_index,
      });
    } else {
      setForm(emptyForm);
    }
    setError(null);
    setUrlError(null);
  }, [open, lecture]);

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

  useEffect(() => {
    if (!form.chapter_id) {
      setTopics([]);
      return;
    }

    fetch(`/api/admin/topics?chapterId=${form.chapter_id}`)
      .then((response) => response.json())
      .then((data) => setTopics(data.topics ?? []))
      .catch(() => setTopics([]));
  }, [form.chapter_id]);

  useEffect(() => {
    const handle = setTimeout(() => {
      setPreviewUrl(deriveThumbnailFromUrl(form.youtube_url));
    }, 300);
    return () => clearTimeout(handle);
  }, [form.youtube_url]);

  function handleUrlChange(value: string) {
    setForm((current) => ({ ...current, youtube_url: value }));
    setUrlError(value && !isValidYouTubeUrl(value) ? 'This is not a valid YouTube link.' : null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!form.chapter_id) {
      setError('Chapter is required.');
      return;
    }
    if (!isValidYouTubeUrl(form.youtube_url)) {
      setUrlError('This is not a valid YouTube link.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const payload = {
        chapter_id: form.chapter_id,
        topic_id: form.topic_id === NONE_VALUE ? null : form.topic_id,
        title: form.title.trim(),
        youtube_url: form.youtube_url.trim(),
        thumbnail_url: deriveThumbnailFromUrl(form.youtube_url),
        kind: form.kind,
        exercise_number: form.kind === 'exercise_walkthrough' ? form.exercise_number.trim() : null,
        order_index: Number(form.order_index) || 0,
      };

      const res = await fetch(isEdit ? `/api/admin/lectures/${lecture!.id}` : '/api/admin/lectures', {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Lecture' : 'Add Lecture'}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Subject</Label>
              <Select value={form.subject_id} onValueChange={(value) => setForm((current) => ({ ...current, subject_id: value, chapter_id: '', topic_id: NONE_VALUE }))}>
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
              <Select value={form.chapter_id} onValueChange={(value) => setForm((current) => ({ ...current, chapter_id: value, topic_id: NONE_VALUE }))} disabled={!form.subject_id}>
                <SelectTrigger>
                  <SelectValue placeholder="Chapter chunein" />
                </SelectTrigger>
                <SelectContent>
                  {chapters.map((chapter) => (
                    <SelectItem key={chapter.id} value={chapter.id}>
                      {chapter.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Topic</Label>
            <Select value={form.topic_id} onValueChange={(value) => setForm((current) => ({ ...current, topic_id: value }))} disabled={!form.chapter_id}>
              <SelectTrigger>
                <SelectValue placeholder="Sab topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE_VALUE}>Sab topics</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lecture-title">Title</Label>
            <Input id="lecture-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Chapter 5 - Introduction to Waves" required />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="youtube-url">YouTube URL</Label>
            <Input id="youtube-url" value={form.youtube_url} onChange={(event) => handleUrlChange(event.target.value)} placeholder="https://www.youtube.com/watch?v=..." required />
            {urlError && <p className="text-xs text-destructive">{urlError}</p>}
            <div className="mt-1 flex h-32 w-full items-center justify-center overflow-hidden rounded-md border bg-muted">
              {previewUrl ? (
                <YouTubeThumbnailImage
                  youtubeUrl={form.youtube_url}
                  thumbnailUrl={previewUrl}
                  alt="Video thumbnail preview"
                  className="h-full w-full object-cover"
                  fallbackClassName="h-full w-full"
                />
              ) : (
                <div className="flex flex-col items-center gap-1 text-muted-foreground">
                  <ImageOff className="h-5 w-5" />
                  <span className="text-xs">{form.youtube_url ? 'Thumbnail not found' : 'Thumbnail will appear here'}</span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label>Kind</Label>
              <Select value={form.kind} onValueChange={(value) => setForm((current) => ({ ...current, kind: value as Lecture['kind'] }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="lecture">Lecture</SelectItem>
                  <SelectItem value="exercise_walkthrough">Exercise Walkthrough</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="order-index">Order</Label>
              <Input id="order-index" type="number" value={form.order_index} onChange={(event) => setForm((current) => ({ ...current, order_index: Number(event.target.value) }))} />
            </div>
          </div>

          {form.kind === 'exercise_walkthrough' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exercise-number">Exercise Number</Label>
              <Input id="exercise-number" value={form.exercise_number} onChange={(event) => setForm((current) => ({ ...current, exercise_number: event.target.value }))} placeholder="Exercise 5.2" />
            </div>
          )}

          {error && <p className="text-sm text-destructive">{error}</p>}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving || !!urlError}>
              {saving ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Lecture'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
