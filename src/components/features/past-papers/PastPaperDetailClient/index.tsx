'use client';

import { useState } from 'react';
import Link from 'next/link';
import { DownloadCloud, Expand, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { isDarkThemeId } from '@/lib/constants/themes';
import { saveOfflineResourceLink } from '@/lib/offline/resources';
import { ResourceAiTools } from '@/components/features/resources/ResourceAiTools';
import { ProtectedResourceReader } from '@/components/features/resources/ProtectedResourceReader';
import { ResourcePreviewFrame } from '@/components/features/resources/ResourcePreviewFrame';

export function PastPaperDetailClient({
  paper,
}: {
  paper: { id: string; title: string; isVerified: boolean; fileUrl: string };
}) {
  const { theme } = useTheme();
  const mode = isDarkThemeId(theme) ? 'dark' : 'light';
  const { user } = useAuth();
  const settings = usePlatformSettings();
  const tier = user?.subscriptionTier || 'FREE';
  const canDownload = settings.subscriptionPlans[tier].access.downloadPDF;
  const [readerOpen, setReaderOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const saveOffline = async () => {
    setDownloading(true);
    try {
      await saveOfflineResourceLink({
        resourceId: paper.id,
        kind: 'past-paper',
        mode,
        title: paper.title,
        sourceUrl: paper.fileUrl,
        savedAt: new Date().toISOString(),
      });
      toast.success('Past paper saved to in-app Downloads.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'The file could not be saved offline.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>{paper.isVerified && <Badge variant="success">Verified</Badge>}</div>
        <div className="flex flex-wrap gap-2">
          <Button variant="gradient" size="sm" onClick={() => setReaderOpen(true)}>
            <Expand className="h-4 w-4" />
            Full screen
          </Button>
          {user && canDownload ? (
            <Button variant="outline" size="sm" onClick={() => void saveOffline()} disabled={downloading}>
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}Save
              in app
            </Button>
          ) : user ? (
            <Button asChild variant="outline" size="sm">
              <Link href="/subscription">
                <DownloadCloud className="h-4 w-4" />
                Save in app <Badge className="ml-1 text-[10px]">Pro</Badge>
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
      <div className="border-border/70 h-[72dvh] min-h-[520px] overflow-hidden rounded-2xl border bg-white">
        <ResourcePreviewFrame
          kind="past-paper"
          resourceId={paper.id}
          mode={mode}
          title={paper.title}
          loading="eager"
          sourceUrl={paper.fileUrl}
        />
      </div>
      {user ? (
        <ResourceAiTools kind="past-paper" resourceId={paper.id} />
      ) : (
        <Button asChild variant="outline" className="w-full">
          <Link
            href={`/login?redirect=${encodeURIComponent(typeof window === 'undefined' ? '/past-papers' : window.location.pathname + window.location.search)}`}
          >
            Sign in for AI summary and test tools
          </Link>
        </Button>
      )}
      <ProtectedResourceReader
        open={readerOpen}
        onClose={() => setReaderOpen(false)}
        kind="past-paper"
        resourceId={paper.id}
        mode={mode}
        title={paper.title}
        sourceUrl={paper.fileUrl}
      />
    </div>
  );
}
