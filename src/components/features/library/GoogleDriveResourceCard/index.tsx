'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DownloadCloud, FileType2, Loader2, Maximize2 } from 'lucide-react';
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
import { ResourcePreviewFrame } from '@/components/features/resources/ResourcePreviewFrame';

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
      <ResourcePreviewFrame
        kind="library"
        resourceId={resource.id}
        mode={mode}
        title={resource.title}
        className="border-border aspect-[4/3] border-b"
      />
      <CardContent className="space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-2">
          {resource.subjectName && (
            <Badge variant="outline" style={{ borderColor: `${resource.subjectColor || '#7c3aed'}60` }}>
              {resource.subjectName}
            </Badge>
          )}
          {resource.chapterName && <Badge variant="secondary">{resource.chapterName}</Badge>}
          {resource.fileType && (
            <Badge variant="outline">
              <FileType2 className="mr-1 h-3 w-3" />
              {resource.fileType.toUpperCase()}
            </Badge>
          )}
        </div>
        <div>
          <h3 className="line-clamp-1 text-sm font-semibold">{resource.title}</h3>
          {resource.description && (
            <p className="text-muted-foreground mt-1 line-clamp-2 text-xs">{resource.description}</p>
          )}
        </div>
        <Button variant="gradient" size="sm" className="w-full" onClick={() => setReaderOpen(true)}>
          <Maximize2 className="h-3.5 w-3.5" />
          Read full screen
        </Button>
        <ResourceAiTools kind="library" resourceId={resource.id} />
        {canDownload ? (
          <Button variant="outline" size="sm" className="w-full" onClick={saveForOffline} disabled={downloading}>
            {downloading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <DownloadCloud className="h-3.5 w-3.5" />}
            Save in app for offline
          </Button>
        ) : (
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href="/subscription">
              <DownloadCloud className="h-3.5 w-3.5" />
              Offline save <Badge className="ml-1 text-[10px]">Pro</Badge>
            </Link>
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
