'use client';

import { useMemo } from 'react';
import { Badge } from '@/components/ui/badge';
import { useNameSearch } from '@/lib/hooks/useNameSearch';
import { PersonSearchInput } from './PersonSearchInput';

function profileName(value: any) {
  const profile = Array.isArray(value) ? value[0] : value;
  return profile?.full_name || 'Student';
}

// Search-enabled fee voucher ledger — name-search rollout (master prompt point
// 15's explicit "fee records" example). Shared as-is by both school and college
// fee pages — the invoice row shape (voucher_number/profiles/due_date/
// total_amount/paid_amount/status) is identical on both sides.
export function VoucherLedgerTable({ invoices }: { invoices: any[] }) {
  const getSearchableText = useMemo(() => (item: any) => `${profileName(item.profiles)} ${item.voucher_number}`, []);
  const { query, setQuery, filtered } = useNameSearch(invoices, getSearchableText);

  return (
    <div className="space-y-3">
      <PersonSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search student or voucher number..."
        resultCount={query ? filtered.length : undefined}
      />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] text-sm">
          <thead className="text-muted-foreground border-b text-left text-xs">
            <tr>
              <th className="py-2">Voucher</th>
              <th>Student</th>
              <th>Due</th>
              <th>Total</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item: any) => {
              const balance = Math.max(0, Number(item.total_amount) - Number(item.paid_amount));
              return (
                <tr key={item.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{item.voucher_number}</td>
                  <td>{profileName(item.profiles)}</td>
                  <td>{item.due_date}</td>
                  <td>{Number(item.total_amount).toLocaleString()}</td>
                  <td>{Number(item.paid_amount).toLocaleString()}</td>
                  <td>{balance.toLocaleString()}</td>
                  <td>
                    <Badge variant={item.status === 'paid' ? 'secondary' : item.status === 'overdue' ? 'destructive' : 'outline'}>
                      {item.status}
                    </Badge>
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={7} className="text-muted-foreground py-6 text-center">
                  {invoices.length ? 'No vouchers match that search.' : 'No vouchers issued yet.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
