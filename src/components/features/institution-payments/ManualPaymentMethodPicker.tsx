'use client';

import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';
import { MessageCircle } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { PAYMENT_METHOD_LABELS, type PaymentMethod } from '@/lib/institution-payments/types';

const METHODS: PaymentMethod[] = ['jazzcash', 'easypaisa', 'bank_transfer', 'card'];

// Payment destination numbers/details are env-driven (master prompt Part 6.2
// explicit ask: "do not hardcode literal numbers in source"), exposed via
// NEXT_PUBLIC_* since a checkout screen is inherently public-facing information.
const JAZZCASH_NUMBER = process.env.NEXT_PUBLIC_SCHOOL_PAYMENT_JAZZCASH_NUMBER || '';
const EASYPAISA_NUMBER = process.env.NEXT_PUBLIC_SCHOOL_PAYMENT_EASYPAISA_NUMBER || '';
const BANK_DETAILS = process.env.NEXT_PUBLIC_SCHOOL_PAYMENT_BANK_DETAILS || '';
const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_SCHOOL_PAYMENT_WHATSAPP_NUMBER || '923480049900';

function methodDestination(method: PaymentMethod) {
  if (method === 'jazzcash') return JAZZCASH_NUMBER;
  if (method === 'easypaisa') return EASYPAISA_NUMBER;
  if (method === 'bank_transfer') return BANK_DETAILS;
  return '';
}

// Shared by InstitutionPaymentCheckout (Part 6.2, plan purchase) and
// FeePaymentCheckout (Part 6.3, per-invoice) — the method picker, QR, and
// WhatsApp confirmation block are identical between the two per the master
// prompt's explicit "reuse the same checkout component" instruction.
export function ManualPaymentMethodPicker({
  method,
  onMethodChange,
  whatsappMessage,
  // Only ever passed by InstitutionPaymentCheckout (institution paying ilm AI for its own plan)
  // — when set, jazzcash/easypaisa show the real scannable QR (amount + expiry embedded, same
  // merchant as the consumer checkout) instead of a plain-text QR of the phone number.
  // FeePaymentCheckout (school/college fee invoices — money goes to the INSTITUTION's own
  // account, not ilm AI's) never passes this, so it keeps the generic text QR unchanged.
  scannableAmountPkr,
}: {
  method: PaymentMethod;
  onMethodChange: (method: PaymentMethod) => void;
  whatsappMessage: string;
  scannableAmountPkr?: number;
}) {
  const destination = methodDestination(method);
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(whatsappMessage)}`;
  const showScannableQr = Boolean(scannableAmountPkr) && (method === 'jazzcash' || method === 'easypaisa');
  const [scannableQrDataUrl, setScannableQrDataUrl] = useState<string | null>(null);
  const [scannableQrLoading, setScannableQrLoading] = useState(false);

  useEffect(() => {
    if (!showScannableQr || !scannableAmountPkr) {
      setScannableQrDataUrl(null);
      return;
    }
    let cancelled = false;
    setScannableQrLoading(true);
    fetch(`/api/payments/institution-qr?amount=${Math.round(scannableAmountPkr)}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((json) => {
        if (!cancelled) setScannableQrDataUrl(json.qrDataUrl || null);
      })
      .catch(() => {
        if (!cancelled) setScannableQrDataUrl(null);
      })
      .finally(() => {
        if (!cancelled) setScannableQrLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [showScannableQr, scannableAmountPkr]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {METHODS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onMethodChange(option)}
            className={cn(
              'rounded-lg border px-3 py-2 text-xs font-semibold transition',
              method === option ? 'border-violet-400 bg-violet-500/10 text-violet-500' : 'border-input'
            )}
          >
            {PAYMENT_METHOD_LABELS[option]}
          </button>
        ))}
      </div>
      {method === 'card' && (
        <p className="text-muted-foreground text-xs">
          Auto-renewal via card is not yet automated — submitting still creates a manual verification claim like
          the other methods, until a recurring-card processor is connected.
        </p>
      )}

      {destination && (
        <div className="flex flex-col items-center gap-3 rounded-xl border p-4 text-center sm:flex-row sm:text-left">
          <div className="flex h-[132px] w-[132px] shrink-0 items-center justify-center rounded-lg bg-white p-2">
            {showScannableQr ? (
              scannableQrDataUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- data: URL, Next/Image doesn't optimize these
                <img src={scannableQrDataUrl} alt={`${PAYMENT_METHOD_LABELS[method]} payment QR`} width={116} height={116} />
              ) : (
                <span className="text-muted-foreground text-xs">
                  {scannableQrLoading ? 'Loading QR...' : 'QR unavailable'}
                </span>
              )
            ) : (
              <QRCode value={destination} size={116} level="M" bgColor="#ffffff" fgColor="#000000" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">{PAYMENT_METHOD_LABELS[method]}</p>
            <p className="text-muted-foreground break-all text-sm">{destination}</p>
            {showScannableQr && (
              <p className="text-muted-foreground mt-1 text-xs">Scan to auto-fill the exact amount due.</p>
            )}
          </div>
        </div>
      )}

      <a
        href={whatsappHref}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-600 transition hover:bg-emerald-500/15"
      >
        <MessageCircle className="h-4 w-4" /> Confirm on WhatsApp
      </a>

      <p className="text-muted-foreground text-xs">
        Send the screenshot of the transaction with your email to confirm. An admin verifies claims manually.
      </p>
    </div>
  );
}
