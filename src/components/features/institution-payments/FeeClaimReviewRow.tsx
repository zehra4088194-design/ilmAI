'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { reviewFeePaymentClaim, type FeeClaimState } from '@/lib/institution-payments/fee-actions';
import { PAYMENT_METHOD_LABELS, type InstitutionType } from '@/lib/institution-payments/types';

export function FeeClaimReviewRow({
  institutionType,
  claim,
  studentName,
  currency,
}: {
  institutionType: InstitutionType;
  claim: any;
  studentName: string;
  currency: string;
}) {
  const boundAction = reviewFeePaymentClaim.bind(null, institutionType);
  const [state, formAction, pending] = useActionState<FeeClaimState, FormData>(boundAction, {
    success: false,
    message: '',
  });

  return (
    <tr className="border-b last:border-0 align-top">
      <td className="py-2 pr-3 font-medium">{studentName}</td>
      <td className="py-2 pr-3">{PAYMENT_METHOD_LABELS[claim.method as keyof typeof PAYMENT_METHOD_LABELS]}</td>
      <td className="py-2 pr-3">
        {currency} {Number(claim.amount).toLocaleString()}
      </td>
      <td className="py-2 pr-3">
        <p>{claim.contact_email}</p>
        {claim.notes && <p className="text-muted-foreground text-xs">{claim.notes}</p>}
      </td>
      <td className="py-2">
        {state.message ? (
          <p className={state.success ? 'text-emerald-600 text-xs' : 'text-red-500 text-xs'}>{state.message}</p>
        ) : (
          <form action={formAction} className="flex gap-2">
            <input type="hidden" name="id" value={claim.id} />
            <Button type="submit" name="decision" value="verified" size="sm" variant="gradient" disabled={pending}>
              Verify
            </Button>
            <Button type="submit" name="decision" value="rejected" size="sm" variant="outline" disabled={pending}>
              Reject
            </Button>
          </form>
        )}
      </td>
    </tr>
  );
}
