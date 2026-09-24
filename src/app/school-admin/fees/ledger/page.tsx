import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { requireSchoolContext, hasSchoolPermission } from '@/lib/school-erp/access';
import { getSchoolLedger } from '@/lib/school-erp/queries';
import { createSchoolExpense } from '@/lib/school-erp/actions';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { FeesSubNav } from '@/components/features/institution-payments/FeesSubNav';
import { LedgerSummary } from '@/components/features/institution-payments/LedgerSummary';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function SchoolLedgerPage() {
  const { supabase, context } = await requireSchoolContext('fees.read', 'fees');
  if (!context) redirect('/school-admin/fees');
  const ledger = await getSchoolLedger(supabase, context);
  const canManage = hasSchoolPermission(context, 'fees.manage');

  return (
    <div className="space-y-6">
      <SchoolPageHeader title="Ledger & accounting" description="Fees collected vs expenses, and a simple running-costs log." />
      <FeesSubNav basePath="/school-admin/fees" active="ledger" />
      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-base">Record an expense</CardTitle></CardHeader>
          <CardContent>
            <SchoolActionForm action={createSchoolExpense} submitLabel="Add expense" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <Input name="description" placeholder="Description" required className="sm:col-span-2 lg:col-span-1" />
              <select name="category" className={selectClass}>
                <option value="salary">Salary</option>
                <option value="utilities">Utilities</option>
                <option value="maintenance">Maintenance</option>
                <option value="supplies">Supplies</option>
                <option value="transport">Transport</option>
                <option value="events">Events</option>
                <option value="other">Other</option>
              </select>
              <Input name="amount" type="number" min={0} step="0.01" placeholder="Amount" required />
              <Input name="expense_date" type="date" />
              <select name="paid_via" className={selectClass}>
                <option value="cash">Cash</option>
                <option value="bank">Bank transfer</option>
                <option value="card">Card</option>
                <option value="online">Online</option>
              </select>
            </SchoolActionForm>
          </CardContent>
        </Card>
      )}
      <LedgerSummary
        summary={ledger.summary}
        expenses={ledger.expenses}
        totalCollected={ledger.totalCollected}
        totalExpenses={ledger.totalExpenses}
        netBalance={ledger.netBalance}
        currency={context.organization.currency}
      />
    </div>
  );
}
