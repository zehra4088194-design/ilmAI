'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MultiInvoicePayer, type BulkPaymentAction, type PayableInvoice } from './MultiInvoicePayer';

export type FamilyChild = { id: string; fullName: string; pending: number; invoices: PayableInvoice[] };
export type Family = {
  guardianId: string;
  guardianName: string;
  guardianPhone: string | null;
  children: FamilyChild[];
  totalPending: number;
};

// Multi-child billing under one guardian — combined pending total across every linked student,
// with one "Pay across children" button that settles fee heads for several children in one receipt.
export function FamilyAccountsList({
  families,
  currency,
  orgName,
  action,
}: {
  families: Family[];
  currency: string;
  orgName: string;
  action: BulkPaymentAction;
}) {
  const [openGuardianId, setOpenGuardianId] = useState<string | null>(null);

  if (!families.length) {
    return <p className="text-muted-foreground text-sm">No guardian has more than one linked child yet.</p>;
  }

  return (
    <div className="space-y-4">
      {families.map((family) => (
        <Card key={family.guardianId}>
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base">{family.guardianName}</CardTitle>
              <p className="text-muted-foreground text-xs">{family.children.length} children linked</p>
            </div>
            <div className="text-right">
              <p className="text-muted-foreground text-[11px]">Combined pending</p>
              <p className={family.totalPending > 0 ? 'text-destructive font-bold' : 'font-bold'}>
                {currency} {family.totalPending.toLocaleString()}
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid gap-2 sm:grid-cols-2">
              {family.children.map((child) => (
                <div key={child.id} className="border-border rounded-lg border p-2 text-sm">
                  <p className="font-medium">{child.fullName}</p>
                  <p className={child.pending > 0 ? 'text-destructive text-xs' : 'text-muted-foreground text-xs'}>
                    {child.pending > 0 ? `${currency} ${child.pending.toLocaleString()} pending` : 'Paid up'}
                  </p>
                </div>
              ))}
            </div>
            {family.totalPending > 0 &&
              (openGuardianId === family.guardianId ? (
                <MultiInvoicePayer
                  title={`Pay for ${family.guardianName}'s children`}
                  invoices={family.children.flatMap((child) => child.invoices)}
                  currency={currency}
                  orgName={orgName}
                  action={action}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => setOpenGuardianId(family.guardianId)}
                  className="text-primary text-xs font-medium hover:underline"
                >
                  Pay across children &rarr;
                </button>
              ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
