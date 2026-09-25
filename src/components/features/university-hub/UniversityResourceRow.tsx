'use client';

import { useState } from 'react';
import { Maximize2, FileText } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { ProtectedResourceReader } from '@/components/features/resources/ProtectedResourceReader';

export function UniversityResourceRow({
  id,
  title,
}: {
  id: string;
  title: string;
}) {
  const [readerOpen, setReaderOpen] = useState(false);

  return (
    <>
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-4">
          <span className="flex min-w-0 items-center gap-2">
            <FileText className="h-4 w-4 shrink-0 text-primary" />
            <span className="truncate text-sm font-medium">{title}</span>
          </span>
          <button
            type="button"
            onClick={() => setReaderOpen(true)}
            className="text-primary inline-flex shrink-0 items-center gap-1 text-xs font-semibold hover:underline"
          >
            Open <Maximize2 className="h-3.5 w-3.5" />
          </button>
        </CardContent>
      </Card>

      <ProtectedResourceReader
        open={readerOpen}
        onClose={() => setReaderOpen(false)}
        kind="university-resource"
        resourceId={id}
        mode="light"
        title={title}
      />
    </>
  );
}
