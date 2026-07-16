'use client';

import { useRef, useTransition } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { createLecture, updateLecture } from '@/lib/college/actions/lectures';
import { LECTURE_VIDEO_URL_HINT } from '@/lib/college/validators';
import type { CollegeLecture } from '@/lib/college/types';

interface LectureFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collegeId: string;
  lecture?: CollegeLecture | null;
  onSaved: () => void;
}

export function LectureFormDialog({ open, onOpenChange, collegeId, lecture, onSaved }: LectureFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);
  const isEditing = Boolean(lecture);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = lecture ? await updateLecture(lecture.id, formData) : await createLecture(formData);
      if (result.success) {
        toast.success(isEditing ? 'Lecture updated.' : 'Lecture added.');
        onOpenChange(false);
        onSaved();
      } else {
        toast.error(result.error ?? 'Something went wrong.');
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/60 rounded-2xl border backdrop-blur-xl sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit lecture' : 'Add a lecture'}</DialogTitle>
        </DialogHeader>
        <form ref={formRef} action={handleSubmit} className="space-y-4">
          <input type="hidden" name="collegeId" value={collegeId} />

          <div className="space-y-1.5">
            <Label htmlFor="lecture-title">Title</Label>
            <Input id="lecture-title" name="title" required defaultValue={lecture?.title ?? ''} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lecture-video-url">Video link</Label>
            <Input
              id="lecture-video-url"
              name="videoUrl"
              required
              defaultValue={lecture?.video_url ?? ''}
              placeholder="https://youtube.com/watch?v=…"
            />
            <p className="text-muted-foreground text-xs">{LECTURE_VIDEO_URL_HINT}</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lecture-stream">Section</Label>
              <Input
                id="lecture-stream"
                name="stream"
                defaultValue={lecture?.stream ?? ''}
                placeholder="Engineering / Medical"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lecture-degree">Degree</Label>
              <Input
                id="lecture-degree"
                name="degreeName"
                defaultValue={lecture?.degree_name ?? ''}
                placeholder="MBBS / BSCS"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="lecture-course">Course</Label>
              <Input
                id="lecture-course"
                name="courseName"
                defaultValue={lecture?.course_name ?? ''}
                placeholder="Anatomy / Data Structures"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lecture-semester">Semester</Label>
              <Input
                id="lecture-semester"
                name="semester"
                defaultValue={lecture?.semester ?? ''}
                placeholder="Semester 3"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lecture-chapter">Chapter</Label>
            <Input
              id="lecture-chapter"
              name="chapterTitle"
              defaultValue={lecture?.chapter_title ?? ''}
              placeholder="Chapter 5 - Nervous System"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="lecture-description">Description</Label>
            <Textarea id="lecture-description" name="description" rows={3} defaultValue={lecture?.description ?? ''} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              {isEditing ? 'Save changes' : 'Add lecture'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
