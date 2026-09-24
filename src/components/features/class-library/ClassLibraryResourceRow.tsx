'use client';

import { useState } from 'react';
import { ExternalLink, Maximize2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ProtectedResourceReader } from '@/components/features/resources/ProtectedResourceReader';
import type { ClassLibraryResourceType } from '@/lib/class-library/types';

// Class Library resources used to link straight to their stored URL (`<a target="_blank">`) — for
// an R2-hosted file that's a private object URL a browser tab can't fetch on its own (no signed
// access, no PDF-signature/Google-Drive-confirmation handling), so the tab opened and nothing ever
// rendered. Routing everything except video lectures through the same in-app reader every other
// resource kind (library, past papers, college resources) already uses fixes both at once: it
// always opens inside ilm AI, and the server-side fetch (see lib/resources/server.ts) already knows
// how to resolve an r2:// URI or a Drive share link correctly.
export function ClassLibraryResourceRow({
  id,
  title,
  url,
  resourceType,
}: {
  id: string;
  title: string;
  url: string | null;
  resourceType: ClassLibraryResourceType;
}) {
  const [readerOpen, setReaderOpen] = useState(false);
  if (!url) return null;

  return (
    <Card>
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <span className="truncate text-sm font-medium">{title}</span>
        {resourceType === 'video_lecture' ? (
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-semibold hover:underline"
          >
            Open <ExternalLink className="h-3.5 w-3.5" />
          </a>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setReaderOpen(true)}
              className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-semibold hover:underline"
            >
              Open <Maximize2 className="h-3.5 w-3.5" />
            </button>
            <ProtectedResourceReader
              open={readerOpen}
              onClose={() => setReaderOpen(false)}
              kind="class-library"
              resourceId={id}
              mode="light"
              title={title}
              sourceUrl={url}
            />
          </>
        )}
      </CardContent>
    </Card>
  );
}
