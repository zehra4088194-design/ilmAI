'use client';

import { useId, useRef, useState } from 'react';
import { CheckCircle2, Loader2, Paperclip, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

/**
 * Replaces the old "Confirm on WhatsApp" link on every manual JazzCash/bank payment
 * screen (institution plans, fee vouchers, parent plans, the wallet upgrade flow) — the payer
 * types the name and number the transaction was made from and attaches a screenshot, which posts
 * straight to /api/payments/confirm-proof (sent server-side via Brevo). No phone number or
 * email address is ever shown to the payer or present in client-bundled JS/HTML.
 */
export function PaymentProofForm({ context }: { context: string }) {
  const fileInputId = useId();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function submit() {
    if (!name.trim() || !phone.trim()) {
      toast.error('Enter the name and number the transaction was made from.');
      return;
    }
    if (!image) {
      toast.error('Attach a screenshot of the transaction.');
      return;
    }
    setSubmitting(true);
    try {
      const form = new FormData();
      form.set('name', name.trim());
      form.set('phone', phone.trim());
      form.set('context', context);
      form.set('image', image);
      const response = await fetch('/api/payments/confirm-proof', { method: 'POST', body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not send your proof.');
      setSubmitted(true);
      toast.success('Sent — an admin will verify shortly.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send your proof.');
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-emerald-500/40 bg-emerald-500/5 p-3 text-sm font-semibold text-emerald-600">
        <CheckCircle2 className="h-4 w-4 shrink-0" />
        Sent — an admin will verify and activate your plan shortly.
      </div>
    );
  }

  return (
    <div className="bg-background space-y-2 rounded-xl border p-4">
      <p className="text-sm font-semibold">Confirm your payment</p>
      <p className="text-muted-foreground text-xs">
        Enter the name and number the transaction was made from, and attach the screenshot.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        <input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Name on the transaction"
          maxLength={120}
          className="border-input bg-card h-10 w-full rounded-lg border px-3 text-sm"
        />
        <input
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
          placeholder="JazzCash number used"
          maxLength={30}
          className="border-input bg-card h-10 w-full rounded-lg border px-3 text-sm"
        />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={(event) => setImage(event.target.files?.[0] || null)}
          className="hidden"
          id={fileInputId}
        />
        <label
          htmlFor={fileInputId}
          className="border-input bg-card hover:bg-muted inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
        >
          <Paperclip className="h-3.5 w-3.5" />
          {image ? image.name : 'Attach screenshot'}
        </label>
        <Button size="sm" variant="gradient" className="ml-auto" onClick={submit} disabled={submitting}>
          {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
          Send for verification
        </Button>
      </div>
    </div>
  );
}
