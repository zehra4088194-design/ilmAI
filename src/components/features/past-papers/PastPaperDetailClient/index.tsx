'use client';

import { useState } from 'react';
import Link from 'next/link';
import { BookOpen, DownloadCloud, Expand, Loader2 } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { isDarkThemeId } from '@/lib/constants/themes';
import { saveOfflineResourceResponse } from '@/lib/offline/resources';
import { ResourceAiTools } from '@/components/features/resources/ResourceAiTools';
import {
  fetchProtectedResourceResponse,
  ProtectedResourceReader,
} from '@/components/features/resources/ProtectedResourceReader';

export function PastPaperDetailClient({
  paper,
}: {
  paper: { id: string; title: string; isVerified: boolean };
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
      const response = await fetchProtectedResourceResponse({
        kind: 'past-paper',
        id: paper.id,
        mode,
        purpose: 'offline',
      });
      await saveOfflineResourceResponse(
        { resourceId: paper.id, kind: 'past-paper', mode, title: paper.title, savedAt: new Date().toISOString() },
        response
      );
      toast.success('Past paper app Downloads mein save ho gaya.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Offline save nahi ho saka.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>{paper.isVerified && <Badge variant="success">Verified</Badge>}</div>
        <div className="flex flex-wrap gap-2">
          <Button variant="gradient" size="sm" onClick={() => setReaderOpen(true)}><Expand className="h-4 w-4" />Full screen</Button>
          {user && canDownload ? (
            <Button variant="outline" size="sm" onClick={() => void saveOffline()} disabled={downloading}>{downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <DownloadCloud className="h-4 w-4" />}Save offline</Button>
          ) : user ? (
            <Button asChild variant="outline" size="sm"><Link href="/subscription"><DownloadCloud className="h-4 w-4" />Offline save <Badge className="ml-1 text-[10px]">Pro</Badge></Link></Button>
          ) : null}
        </div>
      </div>
      <div className="from-primary/10 via-background to-cyan-500/10 flex min-h-64 items-center justify-center rounded-2xl border bg-gradient-to-br">
        <div className="text-center">
          <div className="border-primary/20 bg-background/75 mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border shadow-lg">
            <BookOpen className="text-primary h-7 w-7" />
          </div>
          <p className="mt-3 text-sm font-semibold">Past paper reader ready hai</p>
          <p className="text-muted-foreground mt-1 text-xs">PDF sirf Read/Full screen click ke baad load hogi.</p>
        </div>
      </div>
      {user ? <ResourceAiTools kind="past-paper" resourceId={paper.id} /> : (
        <Button asChild variant="outline" className="w-full">
          <Link href={`/login?redirect=${encodeURIComponent(typeof window === 'undefined' ? '/past-papers' : window.location.pathname + window.location.search)}`}>
            Sign in for AI summary and test tools
          </Link>
        </Button>
      )}
      <ProtectedResourceReader open={readerOpen} onClose={() => setReaderOpen(false)} kind="past-paper" resourceId={paper.id} mode={mode} title={paper.title} />
    </div>
  );
}
