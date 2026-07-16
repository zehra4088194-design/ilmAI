'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, DownloadCloud, FileText, FileType2, Loader2, Maximize2, ShieldCheck } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { isDarkThemeId } from '@/lib/constants/themes';
import { saveOfflineResource } from '@/lib/offline/resources';
import { ProtectedResourceReader, fetchProtectedResourceBlob } from '@/components/features/resources/ProtectedResourceReader';
import { ResourceAiTools } from '@/components/features/resources/ResourceAiTools';

export interface DriveResourceData {
  id: string;
  title: string;
  description?: string | null;
  fileType?: string | null;
  subjectName?: string | null;
  subjectColor?: string | null;
  chapterName?: string | null;
}

export function GoogleDriveResourceCard({ resource }: { resource: DriveResourceData }) {
  const { theme } = useTheme();
  const mode = isDarkThemeId(theme) ? 'dark' : 'light';
  const { user } = useAuth();
  const settings = usePlatformSettings();
  const tier = user?.subscriptionTier || 'FREE';
  const canDownload = settings.subscriptionPlans[tier].access.downloadPDF;
  const [readerOpen, setReaderOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const saveForOffline = async () => {
    setDownloading(true);
    try {
      const blob = await fetchProtectedResourceBlob({ kind: 'library', id: resource.id, mode, purpose: 'offline' });
      await saveOfflineResource({
        resourceId: resource.id,
        kind: 'library',
        mode,
        title: resource.title,
        mimeType: blob.type || 'application/pdf',
        blob,
        savedAt: new Date().toISOString(),
      });
      await fetch('/api/offline/download-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resource_type: 'textbook', resource_id: resource.id, device_hint: navigator.userAgent }),
      }).catch(() => undefined);
      toast.success('App Downloads mein offline save ho gaya.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Offline save nahi ho saka.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <Card className="group overflow-hidden border-border/70 bg-card/85 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-xl">
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden border-b border-border bg-[radial-gradient(circle_at_25%_20%,hsl(var(--primary)/0.26),transparent_45%),linear-gradient(145deg,hsl(var(--muted)),hsl(var(--background)))]">
        <div className="absolute inset-5 rounded-[2rem] border border-white/10 bg-background/35 shadow-2xl backdrop-blur" />
        <div className="relative flex flex-col items-center gap-3 px-6 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg shadow-primary/25">
            {resource.fileType === 'pdf' ? <FileText className="h-8 w-8" /> : <BookOpen className="h-8 w-8" />}
          </span>
          <p className="line-clamp-2 text-sm font-bold">{resource.title}</p>
          <Badge variant="outline" className="bg-background/70"><ShieldCheck className="mr-1 h-3 w-3 text-emerald-500" />Protected reader</Badge>
        </div>
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {resource.subjectName && (
            <Badge variant="outline" style={{ borderColor: `${resource.subjectColor || '#7c3aed'}60` }}>
              {resource.subjectName}
            </Badge>
          )}
          {resource.chapterName && <Badge variant="secondary">{resource.chapterName}</Badge>}
          {resource.fileType && <Badge variant="outline"><FileType2 className="mr-1 h-3 w-3" />{resource.fileType.toUpperCase()}</Badge>}
        </div>
        <div>
          <h3 className="line-clamp-1 text-sm font-semibold">{resource.title}</h3>
          {resource.description && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{resource.description}</p>}
        </div>
        <Button variant="gradient" size="sm" className="w-full" onClick={() => setReaderOpen(true)}>
          <Maximize2 className="h-3.5 w-3.5" />Read in app
        </Button>
        <ResourceAiTools kind="library" resourceId={resource.id} />
        {canDownload ? (
          <Button variant="outline" size="sm" className="w-full" onClick={saveForOffline} disabled={downloading}>
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DownloadCloud className="h-3.5 w-3.5" />}
            Save in app for offline
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/subscription"><DownloadCloud className="h-3.5 w-3.5" />Offline save <Badge className="ml-1 text-[10px]">Pro</Badge></Link>
          </Button>
        )}
      </CardContent>
      <ProtectedResourceReader
        open={readerOpen}
        onClose={() => setReaderOpen(false)}
        kind="library"
        resourceId={resource.id}
        mode={mode}
        title={resource.title}
      />
    </Card>
  );
}
