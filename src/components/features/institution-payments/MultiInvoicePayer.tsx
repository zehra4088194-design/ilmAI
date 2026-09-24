'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';

// Shared by Quick Fee Collection (one student, every pending fee head) and Family Accounts
// (one guardian, every pending fee head across all linked children) — both are the same
// "pick some pending invoices, receive one payment, print one voucher" flow, just scoped
// differently by the caller. Each selected invoice still becomes its own school_fee_payments /
// college_fee_payments row (so the existing per-invoice paid_amount/status trigger is untouched);
// they're only grouped for the printable receipt.

export type PayableInvoice = {
  id: string;
  voucher_number: string;
  due_date: string;
  billing_period: string | null;
  total_amount: number;
  paid_amount: number;
  studentId: string;
  studentName: string;
  feeStructureName?: string | null;
};

export type BulkPaymentResult = { success: boolean; message: string; groupId?: string; receiptNumber?: string };
export type BulkPaymentAction = (input: {
  items: { invoiceId: string; amount: number }[];
  paymentMethod: string;
  providerReference?: string;
  notes?: string;
}) => Promise<BulkPaymentResult>;

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'bank', label: 'Bank transfer' },
  { value: 'card', label: 'Card' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'online', label: 'Online' },
];

export function MultiInvoicePayer({
  title,
  invoices,
  currency,
  orgName,
  action,
  emptyLabel,
}: {
  title: string;
  invoices: PayableInvoice[];
  currency: string;
  orgName: string;
  action: BulkPaymentAction;
  emptyLabel?: string;
}) {
  const pendingInvoices = invoices
    .map((inv) => ({ ...inv, balance: Math.max(0, Number(inv.total_amount) - Number(inv.paid_amount)) }))
    .filter((inv) => inv.balance > 0);

  const [selected, setSelected] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(pendingInvoices.map((i) => [i.id, true]))
  );
  const [amounts, setAmounts] = useState<Record<string, number>>(() =>
    Object.fromEntries(pendingInvoices.map((i) => [i.id, i.balance]))
  );
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [providerReference, setProviderReference] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState<{
    result: BulkPaymentResult;
    lines: { invoice: PayableInvoice; amount: number }[];
    total: number;
    paidAt: string;
    method: string;
  } | null>(null);

  if (!pendingInvoices.length && !receipt) {
    return <p className="text-muted-foreground text-sm">{emptyLabel || 'No pending fee heads to collect.'}</p>;
  }

  const totalSelected = pendingInvoices.reduce(
    (sum, inv) => sum + (selected[inv.id] ? Number(amounts[inv.id]) || 0 : 0),
    0
  );

  async function submit() {
    setError('');
    const items = pendingInvoices
      .filter((inv) => selected[inv.id] && Number(amounts[inv.id]) > 0)
      .map((inv) => ({ invoiceId: inv.id, amount: Number(amounts[inv.id]) }));
    if (!items.length) {
      setError('Select at least one fee head with an amount.');
      return;
    }
    setSubmitting(true);
    try {
      const result = await action({ items, paymentMethod, providerReference: providerReference || undefined });
      if (!result.success) {
        setError(result.message);
        return;
      }
      const lines = pendingInvoices
        .filter((inv) => selected[inv.id] && Number(amounts[inv.id]) > 0)
        .map((inv) => ({ invoice: inv, amount: Number(amounts[inv.id]) }));
      setReceipt({
        result,
        lines,
        total: items.reduce((sum, item) => sum + item.amount, 0),
        paidAt: new Date().toLocaleString(),
        method: paymentMethod,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment could not be recorded.');
    } finally {
      setSubmitting(false);
    }
  }

  if (receipt) {
    return (
      <div className="space-y-3">
        <div className="border-border bg-card mx-auto max-w-md rounded-lg border p-5 print:border-0 print:shadow-none">
          <div className="mb-3 text-center">
            <p className="font-bold">{orgName}</p>
            <p className="text-muted-foreground text-xs">Fee payment voucher</p>
          </div>
          <div className="text-muted-foreground mb-3 flex justify-between text-xs">
            <span>Receipt: {receipt.result.receiptNumber}</span>
            <span>{receipt.paidAt}</span>
          </div>
          <table className="w-full text-sm">
            <thead className="text-muted-foreground border-b text-left text-xs">
              <tr>
                <th className="py-1">Voucher</th>
                <th>Student</th>
                <th className="text-right">Amount</th>
              </tr>
            </thead>
            <tbody>
              {receipt.lines.map((line) => (
                <tr key={line.invoice.id} className="border-b last:border-0">
                  <td className="py-1">{line.invoice.voucher_number}</td>
                  <td>{line.invoice.studentName}</td>
                  <td className="text-right">{currency} {line.amount.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-3 flex justify-between border-t pt-2 text-sm font-bold">
            <span>Total received</span>
            <span>{currency} {receipt.total.toLocaleString()}</span>
          </div>
          <p className="text-muted-foreground mt-3 text-center text-[11px]">Paid via {receipt.method}. Thank you.</p>
        </div>
        <div className="flex justify-center gap-2 print:hidden">
          <Button type="button" onClick={() => window.print()}>Print voucher</Button>
          <Button type="button" variant="outline" onClick={() => setReceipt(null)}>New payment</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">{title}</p>
      <div className="space-y-2">
        {pendingInvoices.map((inv) => (
          <label key={inv.id} className="border-border bg-card flex flex-wrap items-center gap-3 rounded-lg border p-3 text-sm">
            <input
              type="checkbox"
              checked={!!selected[inv.id]}
              onChange={(event) => setSelected((current) => ({ ...current, [inv.id]: event.target.checked }))}
              className="h-4 w-4"
            />
            <div className="min-w-[140px] flex-1">
              <p className="font-medium">
                {inv.voucher_number}
                {inv.feeStructureName ? ` — ${inv.feeStructureName}` : ''}
              </p>
              <p className="text-muted-foreground text-xs">
                {inv.studentName} · due {inv.due_date}
                {inv.billing_period ? ` · ${inv.billing_period}` : ''}
              </p>
            </div>
            <p className="text-muted-foreground text-xs">Balance {currency} {inv.balance.toLocaleString()}</p>
            <input
              type="number"
              min={0}
              max={inv.balance}
              step="0.01"
              value={amounts[inv.id] ?? inv.balance}
              disabled={!selected[inv.id]}
              onChange={(event) => setAmounts((current) => ({ ...current, [inv.id]: Number(event.target.value) }))}
              className="border-input bg-background h-9 w-28 rounded-lg border px-2 text-sm disabled:opacity-50"
            />
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={paymentMethod}
          onChange={(event) => setPaymentMethod(event.target.value)}
          className="border-input bg-background h-10 rounded-lg border px-3 text-sm"
        >
          {PAYMENT_METHODS.map((method) => (
            <option key={method.value} value={method.value}>{method.label}</option>
          ))}
        </select>
        <input
          value={providerReference}
          onChange={(event) => setProviderReference(event.target.value)}
          placeholder="Transaction reference (optional)"
          className="border-input bg-background h-10 min-w-[180px] flex-1 rounded-lg border px-3 text-sm"
        />
      </div>
      <div className="flex items-center justify-between">
        <p className="text-sm">
          Total to collect: <span className="font-bold">{currency} {totalSelected.toLocaleString()}</span>
        </p>
        <Button type="button" onClick={submit} disabled={submitting || totalSelected <= 0}>
          {submitting ? 'Recording...' : 'Receive & generate voucher'}
        </Button>
      </div>
      {error && <p className="text-destructive text-xs">{error}</p>}
    </div>
  );
}
