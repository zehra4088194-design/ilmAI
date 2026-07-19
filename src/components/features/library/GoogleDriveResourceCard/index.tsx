'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { BookOpen, CheckCircle2, DownloadCloud, FileType2, Loader2, Maximize2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { isDarkThemeId } from '@/lib/constants/themes';
import { saveOfflineResourceResponse } from '@/lib/offline/resources';
import {
  ProtectedResourceReader,
  fetchProtectedResourceResponse,
} from '@/components/features/resources/ProtectedResourceReader';
import { ResourceAiTools } from '@/components/features/resources/ResourceAiTools';

export interface DriveResourceData {
  id: string;
  title: string;
  description?: string | null;
  fileType?: string | null;
  subjectName?: string | null;
  subjectColor?: string | null;
  chapterName?: string | null;
  bookTitle?: string | null;
  hasContextText?: boolean;
}

export function GoogleDriveResourceCard({ resource, autoOpen = false }: { resource: DriveResourceData; autoOpen?: boolean }) {
  const { theme } = useTheme();
  const mode = isDarkThemeId(theme) ? 'dark' : 'light';
  const { user } = useAuth();
  const settings = usePlatformSettings();
  const tier = user?.subscriptionTier || 'FREE';
  const canDownload = settings.subscriptionPlans[tier].access.downloadPDF;
  const [readerOpen, setReaderOpen] = useState(autoOpen);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    if (autoOpen) setReaderOpen(true);
  }, [autoOpen]);

  const saveForOffline = async () => {
    setDownloading(true);
    try {
      const response = await fetchProtectedResourceResponse({
        kind: 'library',
        id: resource.id,
        mode,
        purpose: 'offline',
      });
      await saveOfflineResourceResponse(
        {
          resourceId: resource.id,
          kind: 'library',
          mode,
          title: resource.title,
          savedAt: new Date().toISOString(),
        },
        response
      );
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
    <Card className="group border-border/70 bg-card/85 hover:border-primary/35 overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-xl">
      <div className="from-primary/10 via-background to-cyan-500/10 flex aspect-[4/3] items-center justify-center border-b bg-gradient-to-br">
        <div className="border-primary/20 bg-background/75 flex h-20 w-20 items-center justify-center rounded-3xl border shadow-lg">
          <BookOpen className="text-primary h-9 w-9" />
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
          {resource.hasContextText && (
            <Badge variant="success">
              <CheckCircle2 className="mr-1 h-3 w-3" /> AI text attached
            </Badge>
          )}
          {resource.fileType && (
            <Badge variant="outline">
              <FileType2 className="mr-1 h-3 w-3" />
              {resource.fileType.toUpperCase()}
            </Badge>
          )}
        </div>
        <div>
          {resource.bookTitle && <p className="text-primary mb-1 truncate text-xs font-semibold">{resource.bookTitle}</p>}
          <h3 className="line-clamp-1 text-sm font-semibold">{resource.title}</h3>
          {resource.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{resource.description}</p>
          )}
        </div>
        <Button variant="gradient" size="sm" className="w-full" onClick={() => setReaderOpen(true)}>
          <Maximize2 className="h-3.5 w-3.5" />
          Read full screen
        </Button>
        {user ? <ResourceAiTools kind="library" resourceId={resource.id} /> : (
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/login?redirect=${encodeURIComponent(typeof window === 'undefined' ? '/library' : window.location.pathname + window.location.search)}`}>
              Sign in for AI tools
            </Link>
          </Button>
        )}
        {user && canDownload ? (
          <Button variant="outline" size="sm" className="w-full" onClick={saveForOffline} disabled={downloading}>
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DownloadCloud className="h-3.5 w-3.5" />}
            Save in app for offline
          </Button>
        ) : user ? (
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/subscription">
              <DownloadCloud className="h-3.5 w-3.5" />
              Offline save <Badge className="ml-1 text-[10px]">Pro</Badge>
            </Link>
          </Button>
        ) : null}
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
