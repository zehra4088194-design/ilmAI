'use client';

import { useMemo, useState } from 'react';
import { PersonSearchInput } from '@/components/features/school-erp/PersonSearchInput';
import { useNameSearch } from '@/lib/hooks/useNameSearch';
import { MultiInvoicePayer, type BulkPaymentAction, type PayableInvoice } from './MultiInvoicePayer';

type StudentOption = { id: string; label: string };

// School Markaz-style "Collect Fee": pick a student, see every pending fee head (tuition, exam,
// transport, ...) for them in one place, tick the ones being paid today, and print one voucher —
// instead of the old flow of issuing/finding one invoice at a time.
export function QuickFeeCollection({
  students,
  invoices,
  currency,
  orgName,
  action,
}: {
  students: StudentOption[];
  invoices: PayableInvoice[];
  currency: string;
  orgName: string;
  action: BulkPaymentAction;
}) {
  const { query, setQuery, filtered } = useNameSearch(students, (s) => s.label);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);

  const pendingByStudent = useMemo(() => {
    const map = new Map<string, number>();
    for (const inv of invoices) {
      const balance = Math.max(0, Number(inv.total_amount) - Number(inv.paid_amount));
      map.set(inv.studentId, (map.get(inv.studentId) || 0) + balance);
    }
    return map;
  }, [invoices]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedInvoices = selectedStudentId ? invoices.filter((inv) => inv.studentId === selectedStudentId) : [];

  if (selectedStudentId && selectedStudent) {
    return (
      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setSelectedStudentId(null)}
          className="text-primary text-xs font-medium hover:underline"
        >
          &larr; Choose a different student
        </button>
        <MultiInvoicePayer
          title={selectedStudent.label}
          invoices={selectedInvoices}
          currency={currency}
          orgName={orgName}
          action={action}
          emptyLabel="This student has no pending fee heads."
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <PersonSearchInput
        value={query}
        onChange={setQuery}
        placeholder="Search student by name or admission number..."
        resultCount={query ? filtered.length : undefined}
      />
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.slice(0, 60).map((student) => {
          const pending = pendingByStudent.get(student.id) || 0;
          return (
            <button
              key={student.id}
              type="button"
              onClick={() => setSelectedStudentId(student.id)}
              className="border-border bg-card hover:border-primary/50 rounded-lg border p-3 text-left text-sm transition"
            >
              <p className="font-medium">{student.label}</p>
              <p className={pending > 0 ? 'text-destructive text-xs' : 'text-muted-foreground text-xs'}>
                {pending > 0 ? `${currency} ${pending.toLocaleString()} pending` : 'No pending fees'}
              </p>
            </button>
          );
        })}
        {!filtered.length && <p className="text-muted-foreground text-sm">No students match that search.</p>}
      </div>
    </div>
  );
}
