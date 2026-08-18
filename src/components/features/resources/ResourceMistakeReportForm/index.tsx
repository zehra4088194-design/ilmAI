'use client';

import { useState } from 'react';
import { Flag } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { RESOURCE_MISTAKE_REPORT_EMAIL } from '@/lib/constants';

/**
 * "Inform about any mistake in this PDF" / suggestions — a tiny inline form shown below every PDF
 * resource. Submits via formsubmit.co's AJAX endpoint (no backend route of our own) straight to
 * RESOURCE_MISTAKE_REPORT_EMAIL, identified by the resource's own title/id so the email is
 * actionable without needing to ask the reporter which file they meant.
 */
export function ResourceMistakeReportForm({ resourceTitle, resourceId }: { resourceTitle: string; resourceId: string }) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!message.trim()) {
      toast.error('Likhein ke kya masla hai ya suggestion kya hai.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch(`https://formsubmit.co/ajax/${RESOURCE_MISTAKE_REPORT_EMAIL}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `ilm AI resource report: ${resourceTitle}`,
          resourceTitle,
          resourceId,
          message: message.trim(),
          page: typeof window === 'undefined' ? '' : window.location.href,
        }),
      });
      if (!response.ok) throw new Error();
      setSubmitted(true);
      setMessage('');
      toast.success('Bhej diya — shukriya!');
    } catch {
      toast.error('Bhej nahi saka, dobara koshish karein.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-xs font-medium underline-offset-2 hover:underline"
      >
        <Flag className="h-3 w-3" />
        Inform about any mistake in this PDF
      </button>
    );
  }

  return (
    <div className="border-border/70 bg-muted/20 space-y-2 rounded-lg border p-3">
      {submitted ? (
        <p className="text-muted-foreground text-xs">Shukriya — team dekh legi.</p>
      ) : (
        <>
          <p className="text-xs font-semibold">Report a mistake or suggestion</p>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="e.g. Question 4's answer key looks wrong, or a page is missing..."
            rows={3}
            className="border-input bg-background w-full resize-none rounded-lg border px-2.5 py-2 text-xs outline-none focus:border-violet-500/40"
          />
          <div className="flex gap-2">
            <Button type="button" size="sm" variant="gradient" loading={submitting} onClick={submit}>
              Send
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)} disabled={submitting}>
              Cancel
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
