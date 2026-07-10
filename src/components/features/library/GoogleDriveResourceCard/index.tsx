'use client';
import { useState } from 'react';
import { FileText, ExternalLink, FileType2, Sparkles, Loader2, Maximize2, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AiAnswerRenderer } from '@/components/features/ai/AiAnswerRenderer';
import { getEmbeddableFilePreviewUrl } from '@/lib/utils/filePreview';
import { toast } from 'sonner';

export interface DriveResourceData {
  id: string;
  title: string;
  description?: string | null;
  driveUrl: string;
  driveFileId?: string | null;
  thumbnailUrl?: string | null;
  fileType?: string | null;
  subjectName?: string | null;
  subjectColor?: string | null;
}

/**
 * Shows a book/notes file that actually lives in Google Drive — we never host
 * the file ourselves. Shows an inline preview (via Drive's embeddable preview
 * URL when we have a file id) plus a clearly-labeled "Open in Google Drive" button.
 * Also offers an on-demand AI summary so a student can see what the book covers
 * before opening it, rendered as a styled document (not a plain text wall).
 */
export function GoogleDriveResourceCard({ resource }: { resource: DriveResourceData }) {
  const previewUrl = getEmbeddableFilePreviewUrl(resource.driveUrl, resource.driveFileId);

  const [summary, setSummary] = useState<string | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [readerMode, setReaderMode] = useState<'panel' | 'fullscreen' | null>(null);

  const generateSummary = async () => {
    if (summary) { setSummary(null); return; } // toggle closed if already shown
    setLoadingSummary(true);
    try {
      const res = await fetch('/api/ai/book-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: resource.title,
          description: resource.description,
          subjectName: resource.subjectName,
          fileType: resource.fileType,
        }),
      });
      const json = await res.json();
      if (json.status === 'error') { toast.error(json.error); return; }
      setSummary(json.data.summary);
    } catch {
      toast.error('Summary generate nahi hui, dobara koshish karo');
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <Card className="overflow-hidden hover:border-violet-500/30 transition-colors">
      {previewUrl ? (
        <div className="aspect-[4/3] bg-muted/30 border-b border-border">
          <iframe src={previewUrl} className="h-full w-full" allow="autoplay" title={resource.title} loading="lazy" />
        </div>
      ) : (
        <div className="aspect-[4/3] bg-muted/30 border-b border-border flex items-center justify-center">
          <FileText className="w-10 h-10 text-muted-foreground/40" />
        </div>
      )}
      <CardContent className="p-4">
        <div className="flex items-center gap-2 mb-2">
          {resource.subjectName && (
            <Badge variant="outline" style={{ borderColor: `${resource.subjectColor}50`, color: resource.subjectColor || undefined }}>{resource.subjectName}</Badge>
          )}
          {resource.fileType && (
            <Badge variant="outline" className="flex items-center gap-1"><FileType2 className="w-3 h-3" />{resource.fileType.toUpperCase()}</Badge>
          )}
        </div>
        <h3 className="font-semibold text-sm mb-1 line-clamp-1">{resource.title}</h3>
        {resource.description && <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{resource.description}</p>}

        <div className="grid grid-cols-2 gap-2">
          <Button variant="gradient" size="sm" className="min-w-0" disabled={!previewUrl} onClick={() => setReaderMode('panel')}>
            <Maximize2 className="w-3.5 h-3.5" />Read
          </Button>
          <Button asChild variant="outline" size="sm" className="min-w-0">
            <a href={resource.driveUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="w-3.5 h-3.5" />Open
            </a>
          </Button>
          <Button variant="outline" size="sm" className="col-span-2" onClick={generateSummary} disabled={loadingSummary}>
            {loadingSummary ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            {summary ? 'Summary Chupao' : 'AI Summary'}
          </Button>
        </div>

        {summary && (
          <div className="mt-3">
            <AiAnswerRenderer content={summary} label="AI Summary" />
          </div>
        )}
      </CardContent>

      {readerMode && previewUrl && (
        <div className={readerMode === 'fullscreen' ? 'fixed inset-0 z-[90] flex flex-col bg-background' : 'fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-3 backdrop-blur-sm'}>
          <div className={readerMode === 'fullscreen' ? 'flex min-h-0 flex-1 flex-col' : 'flex h-[86vh] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-border bg-background shadow-2xl'}>
            <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-3 sm:px-5">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold sm:text-base">{resource.title}</p>
                <p className="text-xs text-muted-foreground">{readerMode === 'fullscreen' ? 'Full-screen reader' : 'In-app reader'}</p>
              </div>
              <div className="flex shrink-0 gap-2">
                {readerMode === 'panel' ? (
                  <Button variant="gradient" size="sm" onClick={() => setReaderMode('fullscreen')}>
                    <Maximize2 className="h-3.5 w-3.5" />Full screen
                  </Button>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setReaderMode('panel')}>Small view</Button>
                )}
                <Button asChild variant="outline" size="sm" className="hidden sm:inline-flex">
                  <a href={resource.driveUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="h-3.5 w-3.5" />Open
                  </a>
                </Button>
                <Button variant="ghost" size="icon-sm" onClick={() => setReaderMode(null)} aria-label="Close reader">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <iframe src={previewUrl} title={resource.title} className="min-h-0 flex-1 bg-white" allow="autoplay; fullscreen" allowFullScreen />
          </div>
        </div>
      )}
    </Card>
  );
}
