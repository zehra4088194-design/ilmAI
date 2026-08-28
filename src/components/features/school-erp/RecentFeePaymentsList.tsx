export type RecentFeePayment = {
  id: string;
  studentName: string;
  amount: number;
  paidAt: string;
  voucherNumber?: string | null;
};

export function RecentFeePaymentsList({ payments }: { payments: RecentFeePayment[] }) {
  if (!payments.length) {
    return <p className="text-muted-foreground text-sm">No fee payments recorded yet.</p>;
  }

  return (
    <div className="space-y-2">
      {payments.map((row) => (
        <div
          key={row.id}
          className="border-border flex items-center justify-between gap-3 border-b py-2 last:border-0"
        >
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{row.studentName}</span>
            <span className="text-muted-foreground block truncate text-xs">
              {row.voucherNumber ? `Voucher ${row.voucherNumber} · ` : ''}
              {new Date(row.paidAt).toLocaleDateString()}
            </span>
          </div>
          <span className="shrink-0 text-sm font-semibold text-emerald-600">
            PKR {Math.round(row.amount).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}
