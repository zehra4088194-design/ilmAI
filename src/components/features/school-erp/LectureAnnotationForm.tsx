'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, Save, X, Highlighter, Search, ChevronDown, BookOpen, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { searchChapters } from '@/lib/school-erp/queries';
import type { SupabaseClient } from '@supabase/supabase-js';
import { LectureAnnotationCanvas } from './LectureAnnotationCanvas';

const HIGHLIGHT_COLORS = [
  { name: 'Red', value: '#ef4444' },
  { name: 'Green', value: '#22c55e' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Orange', value: '#f97316' },
];

/**
 * Teacher Lecture Annotation Form with Chapter Search Autocomplete
 * Allows teachers to search and select chapters/topics, mark lecture activity,
 * optionally upload a photo with hand-drawn highlights, and link it to homework.
 */
export function LectureAnnotationForm({
  sections,
  offerings,
  organizationId,
  userId,
  gradeLevels,
  supabase,
  onCreated,
}: {
  sections: { id: string; label: string }[];
  offerings: { id: string; subject_name: string }[];
  organizationId: string;
  userId: string;
  gradeLevels: string[];
  supabase: SupabaseClient;
  onCreated?: () => void;
}) {
  const [activityType, setActivityType] = useState('lesson_reading');
  const [sectionId, setSectionId] = useState('');
  const [topic, setTopic] = useState('');
  const [selectedChapterId, setSelectedChapterId] = useState<string | null>(null);
  const [summary, setSummary] = useState('');
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [annotatedImageUrl, setAnnotatedImageUrl] = useState<string | null>(null);
  const [highlightedRegions, setHighlightedRegions] = useState<any[]>([]);
  const [showCanvas, setShowCanvas] = useState(false);
  const [highlightColor, setHighlightColor] = useState(HIGHLIGHT_COLORS[0].value);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Autocomplete state for chapter search
  const [searchQuery, setSearchQuery] = useState('');
  const [chapterSuggestions, setChapterSuggestions] = useState<{ id: string; name: string; subject_id: string; grade_levels?: string[] | null; order_index?: number }[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Debounced chapter search
  const debouncedSearch = useCallback(
    debounce(async (q: string) => {
      if (!q || q.length < 2) {
        setChapterSuggestions([]);
        return;
      }
      setSearchLoading(true);
      try {
        const results = await searchChapters(supabase, q, {
          gradeLevels,
          limit: 8,
        });
        setChapterSuggestions(results as any[]);
      } catch {
        // Silently fail — user can still type freeform topic
      } finally {
        setSearchLoading(false);
      }
    }, 300),
    [supabase, gradeLevels]
  );

  useEffect(() => {
    debouncedSearch(searchQuery);
  }, [searchQuery, debouncedSearch]);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelectChapter = (chapter: { id: string; name: string }) => {
    setTopic(chapter.name);
    setSelectedChapterId(chapter.id);
    setShowSuggestions(false);
    setSearchQuery('');
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      setAnnotatedImageUrl(null);
      setHighlightedRegions([]);
      setShowCanvas(true);
    }
  };

  const handleCanvasSave = (mergedImageUrl: string, regions: any[]) => {
    setAnnotatedImageUrl(mergedImageUrl);
    setHighlightedRegions(regions);
    setShowCanvas(false);
  };

  const handleCanvasCancel = () => {
    setShowCanvas(false);
    setPhotoFile(null);
    setPreviewUrl(null);
    setAnnotatedImageUrl(null);
    setHighlightedRegions([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionId || !topic) {
      toast.error('Section and topic are required.');
      return;
    }

    setLoading(true);
    try {
      let photoUrl = null;

      // Use annotated image if available, otherwise original photo
      const imageToUpload = annotatedImageUrl || previewUrl;
      if (imageToUpload && photoFile) {
        // Convert data URL to blob for upload
        const response = await fetch(imageToUpload);
        const blob = await response.blob();
        const formData = new FormData();
        formData.append('file', blob, 'annotated-photo.jpg');
        formData.append('prefix', 'lecture-annotations');

        const uploadRes = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Photo upload failed');
        }

        const uploadData = await uploadRes.json();
        photoUrl = uploadData.url;
      } else if (previewUrl && photoFile) {
        // Fallback: upload original photo
        const formData = new FormData();
        formData.append('file', photoFile);
        formData.append('prefix', 'lecture-annotations');

        const uploadRes = await fetch('/api/storage/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          throw new Error('Photo upload failed');
        }

        const uploadData = await uploadRes.json();
        photoUrl = uploadData.url;
      }

      // Create annotation
      const res = await fetch('/api/school/lecture-annotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId,
          sectionId,
          activityType,
          topic,
          summary,
          photoUrl,
          highlightColor,
          chapterId: selectedChapterId,
          highlightedRegions: highlightedRegions.length > 0 ? highlightedRegions : undefined,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create annotation');
      }

      toast.success('Lecture annotation saved!');
      onCreated?.();

      // Reset form
      setSectionId('');
      setTopic('');
      setSelectedChapterId(null);
      setSummary('');
      setPhotoFile(null);
      setPreviewUrl(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Camera className="h-4 w-4" />
          Lecture Annotation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Activity Type */}
          <div>
            <label className="mb-1 block text-sm font-medium">What happened in this lecture?</label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant={activityType === 'lesson_reading' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivityType('lesson_reading')}
              >
                Lesson Reading
              </Button>
              <Button
                type="button"
                variant={activityType === 'test' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setActivityType('test')}
              >
                Test / Quiz
              </Button>
            </div>
          </div>

          {/* Section */}
          <div>
            <label className="mb-1 block text-sm font-medium">Section</label>
            <select
              value={sectionId}
              onChange={(e) => setSectionId(e.target.value)}
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
              required
            >
              <option value="">Select section</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          {/* Topic / Chapter Search with Autocomplete */}
          <div ref={suggestionsRef} className="relative">
            <label className="mb-1 flex items-center gap-2 text-sm font-medium">
              <BookOpen className="h-4 w-4" />
              Topic / Chapter
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Type to search chapters... (e.g., &quot;Quadratic&quot;, &quot;1.2.3&quot;)"
                value={topic || searchQuery}
                onChange={(e) => {
                  setTopic(e.target.value);
                  setSearchQuery(e.target.value);
                  if (e.target.value) setShowSuggestions(true);
                }}
                onFocus={() => {
                  if (searchQuery && chapterSuggestions.length) setShowSuggestions(true);
                }}
                required
                className="pl-9 pr-9"
              />
              {searchLoading && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
                </div>
              )}
            </div>

            {/* Autocomplete Dropdown */}
            {showSuggestions && chapterSuggestions.length > 0 && (
              <div className="absolute z-50 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border bg-popover p-1 shadow-lg">
                {chapterSuggestions.map((chapter) => (
                  <button
                    key={chapter.id}
                    type="button"
                    onMouseDown={(e) => {
                      e.preventDefault(); // Prevent input blur
                      handleSelectChapter(chapter);
                    }}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent"
                  >
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                    <span className="font-medium">{chapter.name}</span>
                    {chapter.order_index && (
                      <Badge variant="secondary" className="ml-auto text-xs">
                        #{chapter.order_index}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}

            {!searchLoading && showSuggestions && searchQuery && chapterSuggestions.length === 0 && (
              <div className="absolute z-50 mt-1 w-full rounded-lg border bg-popover p-3 shadow-lg text-center text-sm text-muted-foreground">
                No chapters found for &quot;{searchQuery}&quot;
                <p className="mt-1 text-xs">You can still save with a custom topic name.</p>
              </div>
            )}
          </div>

          {/* Summary */}
          <div>
            <label className="mb-1 block text-sm font-medium">Summary / Work Done</label>
            <Textarea
              placeholder="What was covered in this lecture..."
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={3}
            />
          </div>

          {/* Photo Upload */}
          <div>
            <label className="mb-1 block text-sm font-medium">
              Photo (optional - whiteboard/paper with highlights)
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handlePhotoChange}
              className="hidden"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="gap-2"
            >
              <Camera className="h-4 w-4" />
              {photoFile ? 'Change Photo' : 'Take Photo / Upload'}
            </Button>

            {previewUrl && (
              <div className="mt-2 relative inline-block">
                <img src={annotatedImageUrl || previewUrl} alt="Preview" className="max-h-48 rounded-lg border" />
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowCanvas(true)}
                  className="absolute bottom-2 left-2 gap-2"
                >
                  <Pencil className="h-4 w-4" />
                  Annotate
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setPhotoFile(null);
                    setPreviewUrl(null);
                    setAnnotatedImageUrl(null);
                    setHighlightedRegions([]);
                  }}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            )}
          </div>

          {/* Highlight Color */}
          {photoFile && (
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium">
                <Highlighter className="h-4 w-4" />
                Highlight Color Used
              </label>
              <div className="flex gap-2">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color.value}
                    type="button"
                    onClick={() => setHighlightColor(color.value)}
                    className={`h-8 w-8 rounded-full border-2 transition ${
                      highlightColor === color.value ? 'border-primary scale-110' : 'border-transparent'
                    }`}
                    style={{ backgroundColor: color.value }}
                    title={color.name}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <Button type="submit" disabled={loading} className="w-full gap-2">
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Annotation'}
          </Button>
        </form>
      </CardContent>
      {showCanvas && previewUrl && (
        <LectureAnnotationCanvas
          imageUrl={previewUrl}
          onSave={handleCanvasSave}
          onCancel={handleCanvasCancel}
        />
      )}
    </Card>
  );
}
