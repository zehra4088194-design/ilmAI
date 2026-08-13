'use client';

import { useActionState, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils/cn';
import type { InstitutionType, PaymentMethod } from '@/lib/institution-payments/types';
import { submitFeePaymentClaim, type FeeClaimState } from '@/lib/institution-payments/fee-actions';
import { ManualPaymentMethodPicker } from './ManualPaymentMethodPicker';

type Props = {
  institutionType: InstitutionType;
  invoiceId: string;
  voucherNumber: string;
  outstanding: number;
  currency: string;
  defaultContactEmail?: string;
};

// Master prompt Part 6.3 — same manual-payment method picker as
// InstitutionPaymentCheckout (Part 6.2), targeting one fee invoice instead of
// a plan purchase. The amount defaults to the full outstanding balance but the
// payer can submit a partial claim (e.g. an installment).
export function FeePaymentCheckout({ institutionType, invoiceId, voucherNumber, outstanding, currency, defaultContactEmail = '' }: Props) {
  const [method, setMethod] = useState<PaymentMethod>('jazzcash');
  const [amount, setAmount] = useState(outstanding);
  const boundAction = submitFeePaymentClaim.bind(null, institutionType);
  const [state, formAction, pending] = useActionState<FeeClaimState, FormData>(boundAction, {
    success: false,
    message: '',
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pay voucher {voucherNumber}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="rounded-xl border bg-muted/30 p-4 text-center">
          <p className="text-muted-foreground text-xs">Outstanding balance</p>
          <p className="text-2xl font-bold">
            {currency} {outstanding.toLocaleString()}
          </p>
        </div>

        <ManualPaymentMethodPicker
          method={method}
          onMethodChange={setMethod}
          whatsappMessage={`Hi, I want to confirm my fee payment for voucher ${voucherNumber}.`}
        />

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="invoice_id" value={invoiceId} />
          <input type="hidden" name="method" value={method} />
          <label className="block text-xs font-medium">
            Amount paid ({currency})
            <input
              name="amount"
              type="number"
              min={0.01}
              max={outstanding}
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(Number(event.target.value))}
              required
              className="border-input bg-background mt-1 h-10 w-full rounded-lg border px-3 text-sm"
            />
          </label>
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
