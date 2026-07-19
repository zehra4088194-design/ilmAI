'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { createResource, updateResource } from '@/lib/college/actions/resources';
import type { CollegeResource } from '@/lib/college/types';

const RESOURCE_TYPE_OPTIONS: { value: CollegeResource['resource_type']; label: string }[] = [
  { value: 'notes', label: 'Notes' },
  { value: 'past_paper', label: 'Past paper' },
  { value: 'slides', label: 'Slides' },
  { value: 'other', label: 'Other' },
];

interface ResourceFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  collegeId: string;
  resource?: CollegeResource | null;
  onSaved: () => void;
}

export function ResourceFormDialog({ open, onOpenChange, collegeId, resource, onSaved }: ResourceFormDialogProps) {
  const [isPending, startTransition] = useTransition();
  const [resourceType, setResourceType] = useState<CollegeResource['resource_type']>(
    resource?.resource_type ?? 'notes'
  );
  const isEditing = Boolean(resource);

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = resource ? await updateResource(resource.id, formData) : await createResource(formData);
      if (result.success) {
        toast.success(isEditing ? 'Resource updated.' : 'Resource added.');
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
          <DialogTitle>{isEditing ? 'Edit resource' : 'Add a resource'}</DialogTitle>
        </DialogHeader>
        <form action={handleSubmit} className="space-y-4">
          <input type="hidden" name="collegeId" value={collegeId} />

          <div className="space-y-1.5">
            <Label htmlFor="resource-title">Title</Label>
            <Input id="resource-title" name="title" required defaultValue={resource?.title ?? ''} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resource-type">Type</Label>
            {/* Controlled + hidden input, rather than relying on the Select's
                own form-association, so the value is guaranteed to land in
                the native FormData the server action receives. */}
            <input type="hidden" name="resourceType" value={resourceType} />
            <Select value={resourceType} onValueChange={(v) => setResourceType(v as CollegeResource['resource_type'])}>
              <SelectTrigger id="resource-type">
                <SelectValue placeholder="Choose a type" />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_TYPE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="resource-stream">Section</Label>
              <Input
                id="resource-stream"
                name="stream"
                defaultValue={resource?.stream ?? ''}
                placeholder="Engineering / Medical"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resource-degree">Degree</Label>
              <Input
                id="resource-degree"
                name="degreeName"
                defaultValue={resource?.degree_name ?? ''}
                placeholder="MBBS / BSCS"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="resource-course">Course</Label>
              <Input
                id="resource-course"
                name="courseName"
                defaultValue={resource?.course_name ?? ''}
                placeholder="Pharmacology / Physics"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resource-semester">Semester</Label>
              <Input
                id="resource-semester"
                name="semester"
                defaultValue={resource?.semester ?? ''}
                placeholder="Semester 2"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="resource-chapter">Chapter</Label>
            <Input
              id="resource-chapter"
              name="chapterTitle"
              defaultValue={resource?.chapter_title ?? ''}
              placeholder="Unit 4 - Organic Reactions"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="resource-file">Light PDF / Drive link</Label>
              <Input
                id="resource-file"
                name="lightFileUrl"
                type="url"
                required
                defaultValue={resource?.light_file_url || resource?.file_url || ''}
                placeholder="https://drive.google.com/..."
              />
              <p className="text-muted-foreground text-xs">Students will see this version in light mode.</p>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="resource-dark-file">Dark PDF / Drive link</Label>
              <Input
                id="resource-dark-file"
                name="darkFileUrl"
                type="url"
                defaultValue={resource?.dark_file_url || ''}
                placeholder="https://drive.google.com/..."
              />
              <p className="text-muted-foreground text-xs">Optional. Dark mode mein ye file prefer hogi.</p>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="resource-context-file">Companion AI context (.txt) link</Label>
              <Input
                id="resource-context-file"
                name="contextTextUrl"
                type="url"
                required
                defaultValue={resource?.context_text_url || ''}
                placeholder="https://drive.google.com/..."
              />
              <p className="text-muted-foreground text-xs">
                Google Drive par PDF ka complete readable .txt upload karke share link do. AI summary aur file-test isi
                private backend fetch se banenge.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" loading={isPending}>
              {isEditing ? 'Save changes' : 'Add resource'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
