'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'react-qr-code';
import { CreditCard, HandHeart, Lightbulb, Loader2, Mail, Paperclip, Repeat, Send, Smartphone, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PaymentProofForm } from '@/components/features/payments/PaymentProofForm';
import { MANUAL_PAYMENT_OPTIONS } from '@/lib/constants';

const SUPPORT_EMAIL = 'support@ilmai.study';
const PRESET_USD = [2, 5, 10, 20];
type Cycle = 'one_time' | 'monthly' | 'annual';
const CYCLE_OPTIONS: { value: Cycle; label: string; icon: typeof Sparkles }[] = [
  { value: 'one_time', label: 'One-time', icon: Sparkles },
  { value: 'monthly', label: 'Monthly', icon: Repeat },
  { value: 'annual', label: 'Yearly', icon: Repeat },
];
type PayMethod = 'card' | 'jazzcash';
const JAZZCASH_NUMBER = MANUAL_PAYMENT_OPTIONS[0]?.number || '';

/**
 * "Support ilm AI" dialog — the direct email contact (no sign-in needed), a donation flow, and a
 * "have a suggestion?" box that can carry a screenshot. Embedded via `trigger` (the button/card
 * that opens it) so callers control where and how it appears — the footer and the dashboard
 * sidebar each render their own trigger — rather than this component placing itself as a fixed
 * floating button.
 *
 * Card donations reuse the same non-catalog-price Paddle pattern as institution billing
 * (createSupportCheckout, PADDLE_SUPPORT_PRODUCT_ID) — one Product ID, with the actual amount
 * set fresh per checkout via /api/payments/create-support-session (no pre-created Price needed
 * per amount). A PKR entry is converted to USD client-side using the platform's live USD/PKR
 * rate, fetched from /api/support/rate the first time the dialog opens.
 *
 * JazzCash is a one-time-only alternative to card — same scannable, amount-embedded QR
 * (/api/payments/institution-qr) and screenshot-based manual verification (PaymentProofForm ->
 * /api/payments/confirm-proof) as every other manual-payment screen in the app, since Paddle
 * itself has no JazzCash rail. Recurring (monthly/yearly) is card-only — there's no automated
 * JazzCash auto-charge — so picking a recurring cycle snaps the method back to card.
 *
 * The One-time/Monthly/Yearly toggle controls whether the card checkout carries a
 * `billing_cycle` — omitted for one-time (a single charge), set for monthly/annual (a real
 * recurring subscription that auto-charges the saved card each period, same Paddle mechanism as
 * every paid plan).
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
  const [method, setMethod] = useState<PayMethod>('card');
  const [checkingOut, setCheckingOut] = useState(false);
  const [rate, setRate] = useState(280);
  const [jazzcashQr, setJazzcashQr] = useState<string | null>(null);
  const [jazzcashQrLoading, setJazzcashQrLoading] = useState(false);

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
  const amountPkr = Math.max(1, Math.round(amountUsd * rate));

  useEffect(() => {
    if (method !== 'jazzcash' || !open) return;
    let cancelled = false;
    setJazzcashQrLoading(true);
    fetch(`/api/payments/institution-qr?amount=${amountPkr}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((json) => {
        if (!cancelled) setJazzcashQr(json.qrDataUrl || null);
      })
      .catch(() => {
        if (!cancelled) setJazzcashQr(null);
      })
      .finally(() => {
        if (!cancelled) setJazzcashQrLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [method, open, amountPkr]);

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
                  onClick={() => {
                    setCycle(value);
                    // JazzCash can't auto-charge a recurring subscription — recurring is card-only.
                    if (value !== 'one_time') setMethod('card');
                  }}
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

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setMethod('card')}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors ${
                  method === 'card' ? 'border-violet-500 bg-violet-500/10 text-violet-600' : 'border-input hover:bg-muted'
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                Card
              </button>
              <button
                type="button"
                onClick={() => cycle === 'one_time' && setMethod('jazzcash')}
                disabled={cycle !== 'one_time'}
                title={cycle !== 'one_time' ? 'JazzCash only supports one-time contributions' : undefined}
                className={`flex items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
                  method === 'jazzcash' ? 'border-violet-500 bg-violet-500/10 text-violet-600' : 'border-input hover:bg-muted'
                }`}
              >
                <Smartphone className="h-3.5 w-3.5" />
                JazzCash
              </button>
            </div>

            {method === 'card' ? (
              <Button className="w-full" variant="gradient" onClick={startCheckout} disabled={checkingOut}>
                {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandHeart className="h-4 w-4" />}
                Continue to secure checkout ({displayAmount(amountUsd)}
                {cycle === 'monthly' ? '/mo' : cycle === 'annual' ? '/yr' : ''})
              </Button>
            ) : (
              <div className="space-y-3">
                <div className="flex flex-col items-center gap-3 rounded-xl border p-4 text-center sm:flex-row sm:text-left">
                  <div className="flex h-[132px] w-[132px] shrink-0 items-center justify-center rounded-lg bg-white p-2">
                    {jazzcashQr ? (
                      // eslint-disable-next-line @next/next/no-img-element -- data: URL, Next/Image doesn't optimize these
                      <img src={jazzcashQr} alt="JazzCash payment QR" width={116} height={116} />
                    ) : JAZZCASH_NUMBER ? (
                      <QRCode value={JAZZCASH_NUMBER} size={116} level="M" bgColor="#ffffff" fgColor="#000000" />
                    ) : (
                      <span className="text-muted-foreground text-xs">
                        {jazzcashQrLoading ? 'Loading QR...' : 'QR unavailable'}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold">JazzCash</p>
                    <p className="text-muted-foreground break-all text-sm">{JAZZCASH_NUMBER}</p>
                    <p className="text-muted-foreground mt-1 text-xs">
                      Scan to auto-fill Rs. {amountPkr.toLocaleString()}, or send it manually.
                    </p>
                  </div>
                </div>
                <PaymentProofForm context={`Donation — $${amountUsd} (one-time)`} />
              </div>
            )}
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
