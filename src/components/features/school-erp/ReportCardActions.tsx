'use client';

import { useState } from 'react';
import { Download, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

/** Phase 6b — download/email actions for one published term-end report card PDF. */
export function ReportCardActions({ reportCardId, canEmail }: { reportCardId: string; canEmail: boolean }) {
  const [sending, setSending] = useState(false);

  const emailToGuardian = async () => {
    setSending(true);
    try {
      const res = await fetch(`/api/school-admin/report-cards/${reportCardId}/pdf`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'The report card could not be emailed.');
      toast.success(json.message || 'Report card emailed.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <Button asChild size="sm" variant="outline" className="h-7 text-xs">
        <a href={`/api/school-admin/report-cards/${reportCardId}/pdf`}>
          <Download className="h-3 w-3" />PDF
        </a>
      </Button>
      {canEmail && (
        <Button size="sm" variant="outline" className="h-7 text-xs" disabled={sending} onClick={emailToGuardian}>
          <Mail className="h-3 w-3" />Email
        </Button>
      )}
    </div>
  );
}
