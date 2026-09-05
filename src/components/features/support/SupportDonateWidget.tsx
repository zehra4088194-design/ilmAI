'use client';

import { useState } from 'react';
import { HandHeart, Loader2, MessageCircle, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

const PRESET_USD = [2, 5, 10, 20];

/**
 * Site-wide "Support us" entry point — a small floating button rendered once from the root
 * layout so it's on every page, signed in or not. Opens a dialog with the direct support
 * contact (call/WhatsApp, no sign-in needed) and a donation flow that opens Paddle's checkout
 * for a chosen amount.
 *
 * Donations use a single Paddle Price (NEXT_PUBLIC_PADDLE_PRICE_ID_SUPPORT) priced at $1, with
 * `quantity` set to the whole-dollar amount — so any USD amount works off one price ID with no
 * backend transaction needed, and a PKR entry is just converted to the nearest dollar client-side
 * using the platform's live USD/PKR rate (passed down from the server) before checkout opens.
 */
export function SupportDonateWidget({ usdToPkrRate }: { usdToPkrRate: number }) {
  const [open, setOpen] = useState(false);
  const [currency, setCurrency] = useState<'USD' | 'PKR'>('USD');
  const [amountUsd, setAmountUsd] = useState(5);
  const [customValue, setCustomValue] = useState('');
  const [checkingOut, setCheckingOut] = useState(false);

  const rate = usdToPkrRate > 0 ? usdToPkrRate : 280;
  const displayAmount = (usd: number) => (currency === 'PKR' ? `Rs. ${Math.round(usd * rate).toLocaleString()}` : `$${usd}`);

  function applyCustom(value: string) {
    setCustomValue(value);
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return;
    const usd = currency === 'PKR' ? Math.max(1, Math.ceil(parsed / rate)) : Math.max(1, Math.round(parsed));
    setAmountUsd(usd);
  }

  async function startCheckout() {
    const priceId = process.env.NEXT_PUBLIC_PADDLE_PRICE_ID_SUPPORT;
    const token = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN;
    if (!priceId || !token) {
      toast.error('Support checkout is not configured yet — please use the phone/WhatsApp contact for now.');
      return;
    }
    setCheckingOut(true);
    try {
      const { initializePaddle } = await import('@paddle/paddle-js');
      const paddle = await initializePaddle({
        token,
        ...(token.startsWith('test_') ? { environment: 'sandbox' as const } : {}),
        eventCallback: (event) => {
          if (event.name === 'checkout.completed') {
            setOpen(false);
            toast.success('Thank you for supporting ilm AI! 🎉');
          }
        },
      });
      paddle?.Checkout.open({
        items: [{ priceId, quantity: Math.max(1, amountUsd) }],
        settings: { displayMode: 'overlay', theme: 'light', locale: 'en' },
      });
    } catch {
      toast.error('Could not open secure checkout. Please try again.');
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Support us"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-gradient-to-br from-rose-500 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:scale-105 print:hidden"
      >
        <HandHeart className="h-4 w-4" />
        <span className="hidden sm:inline">Support us</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HandHeart className="h-5 w-5 text-rose-500" />
              Support ilm AI
            </DialogTitle>
            <DialogDescription>
              Need help, or want to keep ilm AI running for students? Reach us directly or send a small contribution.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-3">
            <a
              href="/api/support/contact?via=call"
              className="border-input bg-card hover:bg-muted flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-sm font-semibold"
            >
              <Phone className="h-4 w-4" />
              Call
            </a>
            <a
              href="/api/support/contact?via=whatsapp"
              target="_blank"
              rel="noopener noreferrer"
              className="border-input bg-card hover:bg-muted flex flex-col items-center gap-1.5 rounded-xl border p-3 text-center text-sm font-semibold"
            >
              <MessageCircle className="h-4 w-4" />
              WhatsApp
            </a>
          </div>

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

            <Button className="w-full" variant="gradient" onClick={startCheckout} disabled={checkingOut}>
              {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <HandHeart className="h-4 w-4" />}
              Continue to secure checkout ({displayAmount(amountUsd)})
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
