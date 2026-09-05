'use client';

import { useMemo, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { PersonSearchInput } from '@/components/features/school-erp/PersonSearchInput';
import { useNameSearch } from '@/lib/hooks/useNameSearch';
import { buildWhatsAppLink } from '@/lib/utils/whatsapp';

export type DefaulterRow = {
  id: string;
  studentName: string;
  voucherNumber: string;
  dueDate: string;
  balance: number;
  daysOverdue: number;
  guardianPhone: string | null;
};

// Sortable overdue list + a free wa.me "Send WhatsApp reminder" — same manual deep-link pattern
// VoucherLedgerTable already uses, not a new notification mechanism.
export function DefaultersList({ rows, currency }: { rows: DefaulterRow[]; currency: string }) {
  const [sortBy, setSortBy] = useState<'balance' | 'days'>('balance');
  const { query, setQuery, filtered } = useNameSearch(rows, (r) => `${r.studentName} ${r.voucherNumber}`);
  const sorted = useMemo(
    () => [...filtered].sort((a, b) => (sortBy === 'balance' ? b.balance - a.balance : b.daysOverdue - a.daysOverdue)),
    [filtered, sortBy]
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PersonSearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search defaulter by name or voucher..."
          resultCount={query ? filtered.length : undefined}
        />
        <div className="flex items-center gap-2 text-xs">
          <span className="text-muted-foreground">Sort by</span>
          <button
            type="button"
            onClick={() => setSortBy('balance')}
            className={sortBy === 'balance' ? 'text-primary font-semibold' : 'text-muted-foreground'}
          >
            Amount
          </button>
          <span>·</span>
          <button
            type="button"
            onClick={() => setSortBy('days')}
            className={sortBy === 'days' ? 'text-primary font-semibold' : 'text-muted-foreground'}
          >
            Days overdue
          </button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="text-muted-foreground border-b text-left text-xs">
            <tr>
              <th className="py-2">Student</th>
              <th>Voucher</th>
              <th>Due date</th>
              <th>Days overdue</th>
              <th>Balance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((row) => {
              const waLink = buildWhatsAppLink(
                row.guardianPhone,
                `Reminder: voucher ${row.voucherNumber}, balance ${row.balance.toLocaleString()} was due ${row.dueDate} (${row.daysOverdue} day${row.daysOverdue === 1 ? '' : 's'} overdue). Please pay at your earliest convenience.`
              );
              return (
                <tr key={row.id} className="border-b last:border-0">
                  <td className="py-2 font-medium">{row.studentName}</td>
                  <td>{row.voucherNumber}</td>
                  <td>{row.dueDate}</td>
                  <td><Badge variant="destructive">{row.daysOverdue}d</Badge></td>
                  <td className="font-semibold">{currency} {row.balance.toLocaleString()}</td>
                  <td>
                    {waLink ? (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />Send WhatsApp reminder
                      </a>
                    ) : (
                      <span className="text-muted-foreground text-xs">No guardian phone on file</span>
                    )}
                  </td>
                </tr>
              );
            })}
            {!sorted.length && (
              <tr>
                <td colSpan={6} className="text-muted-foreground py-6 text-center">
                  {rows.length ? 'No defaulters match that search.' : 'No defaulters — every fee is on track.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
