'use client';

import { useState } from 'react';
import { Flag, Lightbulb } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils/cn';

type FeedbackKind = 'mistake' | 'suggestion';

/**
 * "Report a mistake" / "Got an idea?" — a tiny inline form shown below every PDF resource.
 * Submits to our own /api/resource-feedback route, which forwards it server-side via
 * formsubmit.co — the destination email never touches the client bundle. Always carries the
 * resource's own title/id so the report is actionable without asking the reporter which file
 * they meant, and the chosen `kind` labels the email so a mistake report and a suggestion don't
 * read the same in the inbox.
 */
export function ResourceMistakeReportForm({ resourceTitle, resourceId }: { resourceTitle: string; resourceId: string }) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>('mistake');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const submit = async () => {
    if (!message.trim()) {
      toast.error(kind === 'suggestion' ? 'Apna idea likhein.' : 'Likhein ke kya masla hai.');
      return;
    }
    setSubmitting(true);
    try {
      const response = await fetch('/api/resource-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind,
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
        Koi ghalti dikhi, ya kaam behtar karne ka idea hai? Batayen! 💡
      </button>
    );
  }

  return (
    <div className="border-border/70 bg-muted/20 space-y-2 rounded-lg border p-3">
      {submitted ? (
        <p className="text-muted-foreground text-xs">Shukriya — team dekh legi. 🌟</p>
      ) : (
        <>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => setKind('mistake')}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                kind === 'mistake' ? 'border-rose-500/50 bg-rose-500/10 text-rose-600' : 'border-input text-muted-foreground'
              )}
            >
              <Flag className="h-3 w-3" />
              Mistake
            </button>
            <button
              type="button"
              onClick={() => setKind('suggestion')}
              className={cn(
                'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold transition-colors',
                kind === 'suggestion'
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-600'
                  : 'border-input text-muted-foreground'
              )}
            >
              <Lightbulb className="h-3 w-3" />
              Suggestion
            </button>
          </div>
          <p className="text-xs font-semibold">
            {kind === 'suggestion' ? 'Apna suggestion share karein 💡' : 'Is PDF mein kya masla hai?'}
          </p>
          <textarea
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder={
              kind === 'suggestion'
                ? "e.g. Isme yeh add ho jaye to acha rahega, ya diagram aur clear ho sakta hai..."
                : "e.g. Question 4's answer key looks wrong, or a page is missing..."
            }
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
