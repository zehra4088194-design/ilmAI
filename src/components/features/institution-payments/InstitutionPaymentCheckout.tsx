'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import type { BillingCycle, InstitutionType, PaymentMethod } from '@/lib/institution-payments/types';
import { submitInstitutionPaymentVerification, type SubmitPaymentState } from '@/lib/institution-payments/actions';
import { ManualPaymentMethodPicker } from './ManualPaymentMethodPicker';
import { TRANSACTION_FEE_USD } from '@/lib/constants';

type CyclePrice = { usd: number; pkr: number };

type Props = {
  institutionType: InstitutionType;
  organizationId: string;
  planTierId: string | null;
  // Precomputed server-side via resolveInstitutionPricing() — the component
  // never re-derives discount math, so there is exactly one place (Part 6.1's
  // global admin pricing + volume/annual discount %) that computes an amount.
  monthly: CyclePrice;
  annual: CyclePrice;
  annualDiscountPercent?: number;
  volumeDiscountApplied?: boolean;
  defaultContactEmail?: string;
};

export function InstitutionPaymentCheckout({
  institutionType,
  organizationId,
  planTierId,
  monthly,
  annual,
  annualDiscountPercent = 0,
  volumeDiscountApplied = false,
  defaultContactEmail = '',
}: Props) {
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [method, setMethod] = useState<PaymentMethod>('jazzcash');
  const boundAction = submitInstitutionPaymentVerification.bind(null, institutionType);
  const [state, formAction, pending] = useActionState<SubmitPaymentState, FormData>(boundAction, {
    success: false,
    message: '',
  });

  const amount = cycle === 'annual' ? annual : monthly;
  // No settings object is available client-side here (monthly/annual arrive precomputed from the
  // server, per this component's own doc comment) — the PKR/USD ratio already implied by those
  // precomputed prices is the same exchangeRate.usdToPkr the admin configured, so deriving the fee
  // from it stays consistent without threading platform settings through as a new prop.
  const impliedPkrPerUsd = monthly.usd > 0 ? monthly.pkr / monthly.usd : 280;
  const feePkr = Math.round(TRANSACTION_FEE_USD * impliedPkrPerUsd);
  const amountPkrWithFee = amount.pkr + feePkr;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Renew / upgrade plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {(['monthly', 'annual'] as BillingCycle[]).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => setCycle(option)}
              className={cn(
                'rounded-full border px-3 py-1.5 text-xs font-semibold transition',
                cycle === option ? 'border-violet-400 bg-violet-500/10 text-violet-500' : 'border-input text-muted-foreground'
              )}
            >
              {option === 'monthly' ? 'Monthly' : `Annual${annualDiscountPercent ? ` (-${annualDiscountPercent}%)` : ''}`}
            </button>
          ))}
        </div>

        <div className="rounded-xl border bg-muted/30 p-4 text-center">
          <p className="text-2xl font-bold">
            ${amount.usd.toFixed(2)} <span className="text-muted-foreground text-sm font-normal">/ {cycle}</span>
          </p>
          <p className="text-muted-foreground text-xs">≈ PKR {amount.pkr.toLocaleString()}</p>
          <p className="text-muted-foreground mt-1 text-xs">
            +${TRANSACTION_FEE_USD.toFixed(2)} transaction fee (≈ PKR {feePkr.toLocaleString()}) — PKR{' '}
            {amountPkrWithFee.toLocaleString()} total for wallet payment
          </p>
          {volumeDiscountApplied && (
            <p className="mt-1 text-xs font-semibold text-emerald-600">Volume discount applied</p>
          )}
        </div>

        <ManualPaymentMethodPicker
          method={method}
          onMethodChange={setMethod}
          whatsappMessage="Hi, I want to confirm my institution plan payment."
          scannableAmountPkr={amountPkrWithFee}
        />

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="organization_id" value={organizationId} />
          <input type="hidden" name="plan_tier_id" value={planTierId || ''} />
          <input type="hidden" name="billing_cycle" value={cycle} />
          <input type="hidden" name="method" value={method} />
          <input type="hidden" name="amount_usd" value={amount.usd} />
          {/* Includes the transaction fee — matches what the QR/on-screen total actually asks for,
              so the admin's manual verification isn't short by the fee amount. */}
          <input type="hidden" name="amount_pkr" value={amountPkrWithFee} />
          <input
            name="contact_email"
            type="email"
            required
            defaultValue={defaultContactEmail}
            placeholder="Your email"
            className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm"
          />
          <textarea
            name="notes"
            placeholder="Optional note (transaction ID, etc.)"
            className="border-input bg-background min-h-16 w-full rounded-lg border px-3 py-2 text-sm"
          />
          <Button type="submit" variant="gradient" className="w-full" disabled={pending}>
            {pending ? 'Submitting...' : "I've sent the payment"}
          </Button>
          {state.message && (
            <p className={cn('text-sm', state.success ? 'text-emerald-600' : 'text-red-500')}>{state.message}</p>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
