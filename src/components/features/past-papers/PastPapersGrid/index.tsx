'use client';

import { useMemo, useState } from 'react';
import { Download, ExternalLink, Eye, FileText, Maximize2, Search, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { BOARDS, GRADE_LEVELS } from '@/lib/constants';
import { getEmbeddableFilePreviewUrl } from '@/lib/utils/filePreview';

type Paper = {
  id: string;
  board: string;
  grade_level?: string | null;
  year: number;
  paper_type: string;
  file_url: string;
  total_questions: number;
  duration: number;
  is_verified: boolean;
  subjects?: { id: string; name: string; slug: string; color: string } | null;
  chapters?: { name: string } | null;
};

export function PastPapersGrid({ papers, board, gradeLevel }: { papers: Paper[]; board?: string; gradeLevel?: string }) {
  const [query, setQuery] = useState('');
  const [previewPaper, setPreviewPaper] = useState<Paper | null>(null);
  const [fullScreenReader, setFullScreenReader] = useState(false);
  const boardLabel = BOARDS.find((item) => item.value === board)?.label || 'Your board';
  const gradeLabel = GRADE_LEVELS.find((item) => item.value === gradeLevel)?.label || 'Your class';
  const previewUrl = previewPaper ? getEmbeddableFilePreviewUrl(previewPaper.file_url) : null;

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return papers;
    return papers.filter((paper) => {
      return (
        paper.subjects?.name?.toLowerCase().includes(q) ||
        paper.chapters?.name?.toLowerCase().includes(q) ||
        String(paper.year).includes(q) ||
        paper.paper_type.toLowerCase().includes(q)
      );
    });
  }, [papers, query]);

  const grouped = useMemo(() => {
    const map = new Map<string, Paper[]>();
    for (const paper of filtered) {
      const subject = paper.subjects?.name || 'General';
      map.set(subject, [...(map.get(subject) || []), paper]);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <span className="px-3 py-1.5 rounded-full text-sm border bg-primary text-primary-foreground border-primary">{boardLabel}</span>
          <span className="px-3 py-1.5 rounded-full text-sm border border-border bg-muted/30">{gradeLabel}</span>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search papers..." className="w-full bg-muted/30 border border-border rounded-lg pl-9 pr-3 py-2 text-sm" />
        </div>
      </div>

      {grouped.length > 0 ? (
        <div className="space-y-4">
          {previewPaper && (
            <Card className="overflow-hidden border-violet-500/30">
              <CardContent className="p-0">
                <div className="flex flex-col gap-3 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="truncate font-semibold">{previewPaper.subjects?.name || 'Past Paper'} - {previewPaper.year} {previewPaper.paper_type}</p>
                    <p className="text-xs text-muted-foreground">{previewPaper.chapters?.name || 'Full syllabus'}</p>
                  </div>
                  <div className="flex gap-2">
                    {previewUrl && (
                      <Button variant="gradient" size="sm" onClick={() => setFullScreenReader(true)}>
                        <Maximize2 className="h-3.5 w-3.5" />Full screen
                      </Button>
                    )}
                    <Button asChild variant="outline" size="sm">
                      <a href={previewPaper.file_url} target="_blank" rel="noreferrer">
                        <ExternalLink className="h-3.5 w-3.5" /> Open
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setPreviewPaper(null)}>Close</Button>
                  </div>
                </div>
                {previewUrl ? (
                  <iframe src={previewUrl} title={`${previewPaper.year} ${previewPaper.paper_type}`} className="h-[70vh] min-h-[360px] w-full bg-white sm:min-h-[520px]" loading="lazy" />
                ) : (
                  <div className="flex min-h-72 flex-col items-center justify-center gap-3 p-6 text-center">
                    <FileText className="h-10 w-10 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">Is file ka inline preview available nahi. Open button se file new tab mein khol lo.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {grouped.map(([subjectName, subjectPapers]) => (
              <Card key={subjectName} className="hover:border-violet-500/30 transition-colors">
                <CardContent className="p-5">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-3" style={{ backgroundColor: `${subjectPapers[0]?.subjects?.color || '#7c3aed'}20` }}>
                    <FileText className="w-5 h-5" style={{ color: subjectPapers[0]?.subjects?.color || '#7c3aed' }} />
                  </div>
                  <h3 className="font-semibold mb-3">{subjectName}</h3>
                  <div className="space-y-2">
                    {subjectPapers.map((paper) => (
                      <div key={paper.id} className="flex items-center justify-between gap-2 p-2 rounded-lg bg-muted/30 text-sm">
                        <div className="min-w-0">
                          <p className="font-medium">{paper.year} {paper.paper_type}</p>
                          <p className="truncate text-xs text-muted-foreground">{paper.chapters?.name || 'Full syllabus'} - {paper.duration} min</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {paper.is_verified && <Badge variant="success" className="hidden sm:inline-flex text-[10px]">Verified</Badge>}
                          <Button variant="ghost" size="icon-sm" onClick={() => setPreviewPaper(paper)} aria-label="Preview paper">
                            <Eye className="w-3.5 h-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon-sm" onClick={() => { setPreviewPaper(paper); setFullScreenReader(true); }} aria-label="Read paper full screen">
                            <Maximize2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button asChild variant="ghost" size="icon-sm">
                            <a href={paper.file_url} target="_blank" rel="noreferrer" aria-label="Open paper">
                              <Download className="w-3.5 h-3.5" />
                            </a>
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <EmptyState
          icon={FileText}
          title={query ? 'No matching papers found' : 'No past papers for your class yet'}
          description="Admin se class-tagged past papers add hote hi yahan show honge. Doosri class ke papers yahan nahi dikhaye jayenge."
          primaryHref="/ai-tutor"
          primaryLabel="Ask AI Tutor"
          secondaryHref="/practice"
          secondaryLabel="AI Testing"
        />
      )}

      {previewPaper && previewUrl && fullScreenReader && (
        <div className="fixed inset-0 z-[90] flex flex-col bg-background">
          <div className="flex min-h-14 items-center justify-between gap-3 border-b border-border px-3 sm:px-5">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold sm:text-base">{previewPaper.subjects?.name || 'Past Paper'} - {previewPaper.year} {previewPaper.paper_type}</p>
              <p className="text-xs text-muted-foreground">{previewPaper.chapters?.name || 'Full syllabus'}</p>
            </div>
            <div className="flex shrink-0 gap-2">
              <Button asChild variant="outline" size="sm">
                <a href={previewPaper.file_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />Open
                </a>
              </Button>
              <Button variant="ghost" size="icon-sm" onClick={() => setFullScreenReader(false)} aria-label="Close reader">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <iframe src={previewUrl} title={`${previewPaper.year} ${previewPaper.paper_type}`} className="min-h-0 flex-1 bg-white" allow="autoplay; fullscreen" allowFullScreen />
        </div>
      )}
    </div>
  );
}
