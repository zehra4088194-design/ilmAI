'use client';

import { useActionState } from 'react';
import { Button } from '@/components/ui/button';
import { reviewInstitutionPaymentVerification, type ReviewState } from '@/lib/institution-payments/actions';
import { PAYMENT_METHOD_LABELS, type InstitutionPaymentVerification } from '@/lib/institution-payments/types';

export function PaymentReviewRow({ claim, organizationName }: { claim: InstitutionPaymentVerification; organizationName: string }) {
  const [state, formAction, pending] = useActionState<ReviewState, FormData>(reviewInstitutionPaymentVerification, {
    success: false,
    message: '',
  });

  return (
    <tr className="border-b last:border-0 align-top">
      <td className="py-3 pr-3">
        <p className="font-semibold">{organizationName}</p>
        <p className="text-muted-foreground text-xs capitalize">{claim.institution_type}</p>
      </td>
      <td className="py-3 pr-3">{PAYMENT_METHOD_LABELS[claim.method]}</td>
      <td className="py-3 pr-3 capitalize">{claim.billing_cycle}</td>
      <td className="py-3 pr-3">
        ${claim.amount_usd.toFixed(2)} / PKR {claim.amount_pkr.toLocaleString()}
      </td>
      <td className="py-3 pr-3">
        <p>{claim.contact_email}</p>
        {claim.notes && <p className="text-muted-foreground text-xs">{claim.notes}</p>}
      </td>
      <td className="py-3">
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
