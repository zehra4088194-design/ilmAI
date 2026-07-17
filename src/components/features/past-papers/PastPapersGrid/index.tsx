'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { DownloadCloud, Eye, FileText, Loader2, Search } from 'lucide-react';
import { useTheme } from 'next-themes';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/EmptyState';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { isDarkThemeId } from '@/lib/constants/themes';
import { useAuth } from '@/hooks/auth/useAuth';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { saveOfflineResourceResponse } from '@/lib/offline/resources';
import {
  ProtectedResourceReader,
  fetchProtectedResourceResponse,
} from '@/components/features/resources/ProtectedResourceReader';
import { ResourceAiTools } from '@/components/features/resources/ResourceAiTools';
import { ResourcePreviewFrame } from '@/components/features/resources/ResourcePreviewFrame';

type Paper = {
  id: string;
  board: string;
  grade_level?: string | null;
  year: number;
  paper_type: string;
  total_questions: number;
  duration: number;
  is_verified: boolean;
  subjects?: { id: string; name: string; slug: string; color: string } | null;
  chapters?: { name: string } | null;
};

export function PastPapersGrid({
  papers,
  board,
  gradeLevel,
}: {
  papers: Paper[];
  board?: string;
  gradeLevel?: string;
}) {
  const { user } = useAuth();
  const { theme } = useTheme();
  const mode = isDarkThemeId(theme) ? 'dark' : 'light';
  const settings = usePlatformSettings();
  const tier = user?.subscriptionTier || 'FREE';
  const canDownload = settings.subscriptionPlans[tier].access.downloadPDF;
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Paper | null>(null);
  const [readerOpen, setReaderOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const value = query.toLowerCase().trim();
    return papers.filter(
      (paper) =>
        !value ||
        [paper.subjects?.name, paper.chapters?.name, String(paper.year), paper.paper_type].some((item) =>
          item?.toLowerCase().includes(value)
        )
    );
  }, [papers, query]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Paper[]>();
    filtered.forEach((paper) => {
      const name = paper.subjects?.name || 'General';
      groups.set(name, [...(groups.get(name) || []), paper]);
    });
    return Array.from(groups.entries());
  }, [filtered]);

  const saveForOffline = async (paper: Paper) => {
    setDownloadingId(paper.id);
    try {
      const response = await fetchProtectedResourceResponse({
        kind: 'past-paper',
        id: paper.id,
        mode,
        purpose: 'offline',
      });
      await saveOfflineResourceResponse(
        {
          resourceId: paper.id,
          kind: 'past-paper',
          mode,
          title: `${paper.subjects?.name || 'Past Paper'} - ${paper.year} ${paper.paper_type}`,
          savedAt: new Date().toISOString(),
        },
        response
      );
      toast.success('Past paper app Downloads mein save ho gaya.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Offline save nahi ho saka.');
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Badge>{BOARDS.find((item) => item.value === board)?.label || 'Your board'}</Badge>
          <Badge variant="outline">
            {GRADE_LEVELS.find((item) => item.value === gradeLevel)?.label || 'Your class'}
          </Badge>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search papers..."
            className="border-border bg-muted/30 w-full rounded-lg border py-2 pr-3 pl-9 text-sm"
          />
        </div>
      </div>

      {selected && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="space-y-4 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {selected.subjects?.name || 'Past Paper'} - {selected.year} {selected.paper_type}
                </p>
                <p className="text-muted-foreground mt-1 text-xs">
                  {selected.chapters?.name || 'Full syllabus'} | {selected.duration} min
                </p>
              </div>
              {selected.is_verified && <Badge variant="success">Verified</Badge>}
            </div>
            <ResourcePreviewFrame
              kind="past-paper"
              resourceId={selected.id}
              mode={mode}
              title={`${selected.subjects?.name || 'Past Paper'} - ${selected.year} ${selected.paper_type}`}
              loading="eager"
              className="border-border h-[70vh] min-h-[360px] w-full rounded-xl border sm:min-h-[520px]"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              <Button variant="gradient" size="sm" onClick={() => setReaderOpen(true)}>
                <Eye className="h-3.5 w-3.5" />
                Read full screen
              </Button>
              {canDownload ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => saveForOffline(selected)}
                  disabled={downloadingId === selected.id}
                >
                  {downloadingId === selected.id ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <DownloadCloud className="h-3.5 w-3.5" />
                  )}
                  Save offline
                </Button>
              ) : (
                <Button asChild variant="outline" size="sm">
                  <Link href="/subscription">
                    <DownloadCloud className="h-3.5 w-3.5" />
                    Offline save <Badge className="ml-1 text-[10px]">Pro</Badge>
                  </Link>
                </Button>
              )}
            </div>
            <ResourceAiTools kind="past-paper" resourceId={selected.id} />
          </CardContent>
        </Card>
      )}

      {grouped.length ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {grouped.map(([subject, subjectPapers]) => (
            <Card key={subject} className="hover:border-primary/30 transition-colors">
              <CardContent className="p-5">
                <div className="bg-primary/10 text-primary mb-3 flex h-11 w-11 items-center justify-center rounded-xl">
                  <FileText className="h-5 w-5" />
                </div>
                <h3 className="mb-3 font-semibold">{subject}</h3>
                <div className="space-y-2">
                  {subjectPapers.map((paper) => (
                    <button
                      key={paper.id}
                      type="button"
                      onClick={() => setSelected(paper)}
                      className="border-border bg-muted/25 hover:border-primary/35 hover:bg-primary/5 flex w-full items-center justify-between gap-2 rounded-xl border p-3 text-left transition-colors"
                    >
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">
                          {paper.year} {paper.paper_type}
                        </span>
                        <span className="text-muted-foreground block truncate text-xs">
                          {paper.chapters?.name || 'Full syllabus'}
                        </span>
                      </span>
                      <Eye className="text-primary h-4 w-4 shrink-0" />
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={query ? 'No matching papers found' : 'No past papers for your class yet'}
          description="Admin se class-tagged past papers add hote hi yahan show honge."
          primaryHref="/ai-tutor"
          primaryLabel="Ask AI Tutor"
          secondaryHref="/practice"
          secondaryLabel="AI Testing"
        />
      )}

      {selected && (
        <ProtectedResourceReader
          key={`${selected.id}:${selected.year}:${selected.paper_type}`}
          open={readerOpen}
          onClose={() => setReaderOpen(false)}
          kind="past-paper"
          resourceId={selected.id}
          mode={mode}
          title={`${selected.subjects?.name || 'Past Paper'} - ${selected.year} ${selected.paper_type}`}
        />
      )}
    </div>
  );
}
