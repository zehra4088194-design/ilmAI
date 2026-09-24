'use client';

import { useMemo } from 'react';
import { MessageCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useNameSearch } from '@/lib/hooks/useNameSearch';
import { buildWhatsAppLink } from '@/lib/utils/whatsapp';
import { PersonSearchInput } from './PersonSearchInput';

// Phase 7a — free wa.me link only (no paid WhatsApp Business API). guardianPhone is populated by
// getSchoolFees (school side only — college invoices simply won't render this column).
function whatsAppReminderLink(item: any, balance: number) {
  if (!item.guardianPhone) return null;
  const message =
    item.status === 'paid'
      ? `Payment confirmed: voucher ${item.voucher_number}, ${Number(item.paid_amount).toLocaleString()} received. Thank you.`
      : `Reminder: voucher ${item.voucher_number}, balance ${balance.toLocaleString()} due ${item.due_date}. Please pay at your earliest convenience.`;
  return buildWhatsAppLink(item.guardianPhone, message);
}

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
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((item: any) => {
              const balance = Math.max(0, Number(item.total_amount) - Number(item.paid_amount));
              const waLink = whatsAppReminderLink(item, balance);
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
                  <td>
                    {waLink && (
                      <a
                        href={waLink}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 hover:underline"
                      >
                        <MessageCircle className="h-3.5 w-3.5" />WhatsApp
                      </a>
                    )}
                  </td>
                </tr>
              );
            })}
            {!filtered.length && (
              <tr>
                <td colSpan={8} className="text-muted-foreground py-6 text-center">
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
