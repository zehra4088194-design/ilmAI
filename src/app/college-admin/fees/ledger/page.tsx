import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { requireCollegeContext, hasCollegePermission } from '@/lib/college-erp/access';
import { getCollegeLedger } from '@/lib/college-erp/queries';
import { createCollegeExpense } from '@/lib/college-erp/actions';
import { CollegeActionForm } from '@/components/features/college-erp/CollegeActionForm';
import { FeesSubNav } from '@/components/features/institution-payments/FeesSubNav';
import { LedgerSummary } from '@/components/features/institution-payments/LedgerSummary';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

export default async function CollegeLedgerPage() {
  const { supabase, context } = await requireCollegeContext('fees.read', 'fees');
  if (!context) redirect('/college-admin/fees');
  const ledger = await getCollegeLedger(supabase, context);
  const canManage = hasCollegePermission(context, 'fees.manage');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Ledger & accounting</h1>
        <p className="text-muted-foreground mt-1 text-sm">Fees collected vs expenses, and a simple running-costs log.</p>
      </div>
      <FeesSubNav basePath="/college-admin/fees" active="ledger" />
      {canManage && (
        <Card>
          <CardHeader><CardTitle className="text-base">Record an expense</CardTitle></CardHeader>
          <CardContent>
            <CollegeActionForm action={createCollegeExpense} submitLabel="Add expense" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
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
            </CollegeActionForm>
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
