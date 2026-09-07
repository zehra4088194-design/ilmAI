'use client';

import { useRef, useState } from 'react';
import { HandHeart, Lightbulb, Loader2, Mail, Paperclip, Repeat, Send, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const SUPPORT_EMAIL = 'support@ilmai.study';
const PRESET_USD = [2, 5, 10, 20];
type Cycle = 'one_time' | 'monthly' | 'annual';
const CYCLE_OPTIONS: { value: Cycle; label: string; icon: typeof Sparkles }[] = [
  { value: 'one_time', label: 'One-time', icon: Sparkles },
  { value: 'monthly', label: 'Monthly', icon: Repeat },
  { value: 'annual', label: 'Yearly', icon: Repeat },
];

/**
 * "Support ilm AI" dialog — the direct email contact (no sign-in needed), a donation flow that
 * opens Paddle's checkout for a chosen amount, and a "have a suggestion?" box that can carry a
 * screenshot. Embedded via `trigger` (the button/card that opens it) so callers control where and
 * how it appears — the footer and the dashboard sidebar each render their own trigger — rather
 * than this component placing itself as a fixed floating button.
 *
 * Donations reuse the same non-catalog-price Paddle pattern as institution billing
 * (createSupportCheckout, PADDLE_SUPPORT_PRODUCT_ID) — one Product ID, with the actual amount
 * set fresh per checkout via /api/payments/create-support-session (no pre-created Price needed
 * per amount). A PKR entry is converted to USD client-side using the platform's live USD/PKR
 * rate, fetched from /api/support/rate the first time the dialog opens.
 *
 * The One-time/Monthly/Yearly toggle controls whether the checkout carries a `billing_cycle` —
 * omitted for one-time (a single charge), set for monthly/annual (a real recurring subscription
 * that auto-charges the saved card each period, same Paddle mechanism as every paid plan).
 *
 * The suggestion box posts to /api/suggestions, which sends it server-side via Brevo
 * — the destination inbox is a server-only env var and never reaches the client bundle.
 */
export function SupportDonateWidget({ trigger }: { trigger: (open: () => void) => React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'PKR'>('USD');
  const [amountUsd, setAmountUsd] = useState(5);
  const [customValue, setCustomValue] = useState('');
  const [cycle, setCycle] = useState<Cycle>('one_time');
  const [checkingOut, setCheckingOut] = useState(false);
  const [rate, setRate] = useState(280);

  const [suggestion, setSuggestion] = useState('');
  const [suggestionImage, setSuggestionImage] = useState<File | null>(null);
  const [sendingSuggestion, setSendingSuggestion] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function openDialog() {
    setOpen(true);
    fetch('/api/support/rate')
      .then((response) => (response.ok ? response.json() : null))
      .then((json) => {
        if (json?.usdToPkr) setRate(json.usdToPkr);
      })
      .catch(() => {});
  }

  async function sendSuggestion() {
    if (!suggestion.trim()) {
      toast.error('Write your suggestion first.');
      return;
    }
    setSendingSuggestion(true);
    try {
      const form = new FormData();
      form.set('message', suggestion.trim());
      form.set('page', window.location.href);
      if (suggestionImage) form.set('image', suggestionImage);
      const response = await fetch('/api/suggestions', { method: 'POST', body: form });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'Could not send your suggestion.');
      setSuggestion('');
      setSuggestionImage(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      toast.success('Thanks — your suggestion was sent!');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not send your suggestion.');
    } finally {
      setSendingSuggestion(false);
    }
  }

  const displayAmount = (usd: number) => (currency === 'PKR' ? `Rs. ${Math.round(usd * rate).toLocaleString()}` : `$${usd}`);

  function applyCustom(value: string) {
    setCustomValue(value);
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const usd = currency === 'PKR' ? Math.max(0.5, parsed / rate) : Math.max(0.5, parsed);
    setAmountUsd(Math.round(usd * 100) / 100);
  }

  async function startCheckout() {
    setCheckingOut(true);
    try {
      const response = await fetch('/api/payments/create-support-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amountUsd, cycle, returnTo: window.location.pathname }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || 'Could not start checkout.');
      window.location.assign(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start checkout.');
      setCheckingOut(false);
    }
  }

  return (
    <>
      {trigger(openDialog)}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandHeart className="h-5 w-5 text-rose-500" />
              Support ilm AI
            </DialogTitle>
            <DialogDescription>
              Need help, or want to keep ilm AI running for students? Email us directly or send a small contribution.
            </DialogDescription>
          </DialogHeader>

          <a
            href={`mailto:${SUPPORT_EMAIL}`}
            className="border-input bg-card hover:bg-muted flex items-center justify-center gap-2 rounded-xl border p-3 text-center text-sm font-semibold"
          >
            <Mail className="h-4 w-4" />
            {SUPPORT_EMAIL}
          </a>

          <div className="space-y-3 border-t pt-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold">Send a contribution</p>
              <div className="bg-muted flex rounded-lg p-0.5 text-xs font-semibold">
                {(['USD', 'PKR'] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCurrency(c)}
                    className={`rounded-md px-2.5 py-1 transition-colors ${
                      currency === c ? 'bg-card shadow-sm' : 'text-muted-foreground'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {CYCLE_OPTIONS.map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setCycle(value)}
                  className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                    cycle === value
                      ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                      : 'border-input hover:bg-muted'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {label}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-4 gap-2">
              {PRESET_USD.map((usd) => (
                <button
                  key={usd}
                  type="button"
                  onClick={() => {
                    setAmountUsd(usd);
                    setCustomValue('');
                  }}
                  className={`rounded-lg border px-2 py-2 text-xs font-semibold transition-colors ${
                    amountUsd === usd && !customValue
                      ? 'border-rose-500 bg-rose-500/10 text-rose-600'
                      : 'border-input hover:bg-muted'
                  }`}
                >
                  {displayAmount(usd)}
                </button>
              ))}
            </div>

            <input
              type="number"
              min={1}
              value={customValue}
              onChange={(event) => applyCustom(event.target.value)}
              placeholder={`Custom amount in ${currency}`}
              className="border-input bg-card h-10 w-full rounded-lg border px-3 text-sm"
            />
            {currency === 'PKR' && (
              <p className="text-muted-foreground text-xs">
                ≈ ${amountUsd} USD at today&apos;s rate — Paddle always charges in USD.
              </p>
            )}
            {cycle !== 'one_time' && (
              <p className="text-muted-foreground text-xs">
                Charged {displayAmount(amountUsd)} every {cycle === 'monthly' ? 'month' : 'year'} until you cancel —
                manage or cancel anytime from your subscription.
              </p>
            )}

            <Button className="w-full" variant="gradient" onClick={startCheckout} disabled={checkingOut}>
              {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandHeart className="h-4 w-4" />}
              Continue to secure checkout ({displayAmount(amountUsd)}
              {cycle === 'monthly' ? '/mo' : cycle === 'annual' ? '/yr' : ''})
            </Button>
          </div>

          <div className="space-y-2 border-t pt-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Lightbulb className="h-4 w-4 text-amber-500" />
              Have a suggestion? (pricing, a bug, anything)
            </p>
            <textarea
              value={suggestion}
              onChange={(event) => setSuggestion(event.target.value)}
              placeholder="Tell us what's on your mind — attach a screenshot below if it helps."
              rows={3}
              maxLength={4000}
              className="border-input bg-card w-full resize-none rounded-lg border px-3 py-2 text-sm outline-none focus:border-violet-500/40"
            />
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(event) => setSuggestionImage(event.target.files?.[0] || null)}
                className="hidden"
                id="support-suggestion-image"
              />
              <label
                htmlFor="support-suggestion-image"
                className="border-input bg-card hover:bg-muted inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-semibold"
              >
                <Paperclip className="h-3.5 w-3.5" />
                {suggestionImage ? suggestionImage.name : 'Attach a screenshot'}
              </label>
              <Button
                size="sm"
                variant="outline"
                className="ml-auto"
                onClick={sendSuggestion}
                disabled={sendingSuggestion}
              >
                {sendingSuggestion ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
