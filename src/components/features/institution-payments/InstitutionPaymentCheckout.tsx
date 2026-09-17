'use client';

import { useActionState, useState } from 'react';
import { ArrowLeft, CreditCard } from 'lucide-react';
import { toast } from 'sonner';
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
  monthly: CyclePrice;
  annual: CyclePrice;
  annualDiscountPercent?: number;
  volumeDiscountApplied?: boolean;
  defaultContactEmail?: string;
  currentStudentCount?: number;
  volumeDiscountMinStudents?: number;
  volumeDiscountPercent?: number;
  perStudentPkr?: number;
  usdToPkr?: number;
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
  currentStudentCount = 0,
  volumeDiscountMinStudents = 0,
  volumeDiscountPercent = 0,
  perStudentPkr = 0,
  usdToPkr = 280,
}: Props) {
  const [step, setStep] = useState<'plan' | 'payment'>('plan');
  const [cycle, setCycle] = useState<BillingCycle>('monthly');
  const [method, setMethod] = useState<PaymentMethod>('jazzcash');
  const [payingNow, setPayingNow] = useState(false);
  const [plannedStudents, setPlannedStudents] = useState(currentStudentCount);
  const boundAction = submitInstitutionPaymentVerification.bind(null, institutionType);
  const [state, formAction, pending] = useActionState<SubmitPaymentState, FormData>(boundAction, { success: false, message: '' });

  const amount = cycle === 'annual' ? annual : monthly;
  const hasBillableStudents = currentStudentCount > 0 && amount.usd > 0;

  const payNowWithCard = async () => {
    setPayingNow(true);
    try {
      const response = await fetch('/api/payments/create-institution-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ billingCycle: cycle }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.url) throw new Error(data.error || 'Could not start checkout.');
      window.location.assign(data.url);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not start checkout.');
      setPayingNow(false);
    }
  };

  const feePkr = Math.round(TRANSACTION_FEE_USD * usdToPkr);
  const amountPkrWithFee = amount.pkr + feePkr;
  const previewEligible = volumeDiscountMinStudents > 0 && plannedStudents >= volumeDiscountMinStudents;
  const previewBasePkr = perStudentPkr * plannedStudents;
  const previewAfterVolume = previewEligible ? previewBasePkr * (1 - volumeDiscountPercent / 100) : previewBasePkr;
  const previewPkr = Math.round(cycle === 'annual' ? previewAfterVolume * 12 * (1 - annualDiscountPercent / 100) : previewAfterVolume);
  const previewUsd = Math.round((previewPkr / usdToPkr) * 100) / 100;

  return (
    <Card>
      <CardHeader><CardTitle className="text-base">Renew / upgrade plan</CardTitle></CardHeader>
      <CardContent className="space-y-5">
        {step === 'plan' ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {(['monthly', 'annual'] as BillingCycle[]).map((option) => (
                <button key={option} type="button" onClick={() => setCycle(option)} className={cn('rounded-full border px-3 py-1.5 text-xs font-semibold transition', cycle === option ? 'border-violet-400 bg-violet-500/10 text-violet-500' : 'border-input text-muted-foreground')}>
                  {option === 'monthly' ? 'Monthly' : `Annual${annualDiscountPercent ? ` (-${annualDiscountPercent}%)` : ''}`}
                </button>
              ))}
            </div>

            <div className="rounded-xl border bg-muted/30 p-4 text-center">
              <p className="text-2xl font-bold">${amount.usd.toFixed(2)} <span className="text-muted-foreground text-sm font-normal">/ {cycle}</span></p>
              <p className="text-muted-foreground mt-1 text-sm">= Rs {Math.round(amount.pkr).toLocaleString()}</p>
              <p className="text-muted-foreground mt-1 text-xs">{perStudentPkr.toLocaleString()} × {currentStudentCount} active student{currentStudentCount === 1 ? '' : 's'}</p>
              {volumeDiscountApplied && <p className="mt-1 text-xs font-semibold text-emerald-600">Volume discount applied</p>}
            </div>

            {volumeDiscountMinStudents > 0 && (
              <div className="rounded-xl border border-dashed p-3">
                <p className="mb-2 text-xs font-semibold">Plan for growth</p>
                <div className="flex flex-wrap items-center gap-2"><span className="text-muted-foreground text-xs">Students:</span><input type="number" min={0} value={plannedStudents} onChange={(e) => setPlannedStudents(Math.max(0, Number(e.target.value) || 0))} className="border-input bg-background h-8 w-24 rounded-lg border px-2 text-sm" /><span className="text-muted-foreground text-xs">(currently {currentStudentCount}{plannedStudents !== currentStudentCount ? ' — what-if preview only' : ''})</span></div>
                {previewEligible ? <p className="mt-2 text-xs font-semibold text-emerald-600">At {plannedStudents} students you&apos;d qualify for the {volumeDiscountPercent}% volume discount — ${previewUsd.toFixed(2)}/{cycle}, = Rs {previewPkr.toLocaleString()}/{cycle}.</p> : <p className="text-muted-foreground mt-2 text-xs">Reach {volumeDiscountMinStudents} students to unlock a {volumeDiscountPercent}% discount automatically (would become ${previewUsd.toFixed(2)}/{cycle}, = Rs {previewPkr.toLocaleString()}/{cycle}).</p>}
                <p className="text-muted-foreground mt-1 text-[11px]">This is only a preview — actual billing always uses your real active student count, checked at payment time.</p>
              </div>
            )}

            {hasBillableStudents ? <Button type="button" variant="gradient" className="w-full" onClick={() => setStep('payment')}>Continue to payment</Button> : <p className="text-muted-foreground text-center text-xs">Enroll active students first — plan cost is billed per student, so there&apos;s nothing to charge yet.</p>}
          </>
        ) : (
          <>
            <button type="button" onClick={() => setStep('plan')} className="text-muted-foreground flex items-center gap-1 text-xs font-medium hover:text-foreground"><ArrowLeft className="h-3.5 w-3.5" />Back to plan</button>

            <div className="rounded-xl border bg-muted/30 p-4 text-center">
              <p className="text-lg font-bold">${amount.usd.toFixed(2)} <span className="text-muted-foreground text-sm font-normal">/ {cycle}</span></p>
              <p className="text-muted-foreground mt-1 text-sm">= Rs {Math.round(amount.pkr).toLocaleString()}</p>
              <p className="text-muted-foreground mt-1 text-xs">+${TRANSACTION_FEE_USD.toFixed(2)} transaction fee (= Rs {feePkr.toLocaleString()}) · Total ${((amount.usd + TRANSACTION_FEE_USD)).toFixed(2)} / Rs {amountPkrWithFee.toLocaleString()}</p>
            </div>

            <Button type="button" variant="gradient" className="w-full" loading={payingNow} onClick={payNowWithCard}><CreditCard className="h-4 w-4" />Pay ${amount.usd.toFixed(2)} now by card — activates instantly</Button>
            <p className="text-muted-foreground -mt-2 text-center text-xs">Or send payment manually below and an admin will verify and activate it.</p>

            <ManualPaymentMethodPicker method={method} onMethodChange={setMethod} proofContext="Hi, I want to confirm my institution plan payment." scannableAmountPkr={amountPkrWithFee} />

            <form action={formAction} className="space-y-3">
              <input type="hidden" name="organization_id" value={organizationId} />
              <input type="hidden" name="plan_tier_id" value={planTierId || ''} />
              <input type="hidden" name="billing_cycle" value={cycle} />
              <input type="hidden" name="method" value={method} />
              <input type="hidden" name="amount_usd" value={amount.usd} />
              <input type="hidden" name="amount_pkr" value={amountPkrWithFee} />
              <input name="contact_email" type="email" required defaultValue={defaultContactEmail} placeholder="Your email" className="border-input bg-background h-10 w-full rounded-lg border px-3 text-sm" />
              <textarea name="notes" placeholder="Optional note (transaction ID, etc.)" className="border-input bg-background min-h-16 w-full rounded-lg border px-3 py-2 text-sm" />
              <Button type="submit" variant="gradient" className="w-full" disabled={pending}>{pending ? 'Submitting...' : "I've sent the payment"}</Button>
              {state.message && <p className={cn('text-sm', state.success ? 'text-emerald-600' : 'text-red-500')}>{state.message}</p>}
            </form>
          </>
        )}
      </CardContent>
    </Card>
  );
}
