import { redirect } from 'next/navigation';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeDefaulters } from '@/lib/college-erp/queries';
import { FeesSubNav } from '@/components/features/institution-payments/FeesSubNav';
import { DefaultersList, type DefaulterRow } from '@/components/features/institution-payments/DefaultersList';

function profileName(value: any) {
  const profile = Array.isArray(value) ? value[0] : value;
  return profile?.full_name || 'Student';
}

export default async function CollegeDefaultersPage() {
  const { supabase, context } = await requireCollegeContext('fees.read', 'fees');
  if (!context) redirect('/college-admin/fees');
  const defaulters = await getCollegeDefaulters(supabase, context);

  const rows: DefaulterRow[] = defaulters.map((item: any) => ({
    id: item.id,
    studentName: profileName(item.profiles),
    voucherNumber: item.voucher_number,
    dueDate: item.due_date,
    balance: item.balance,
    daysOverdue: item.daysOverdue,
    guardianPhone: item.guardianPhone,
  }));
  const totalOverdue = rows.reduce((sum, row) => sum + row.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fee defaulters</h1>
          <p className="text-muted-foreground mt-1 text-sm">Students with overdue or partially paid vouchers, sortable by amount or days overdue.</p>
        </div>
        <div className="border-border bg-card rounded-lg border px-4 py-2 text-right">
          <p className="text-muted-foreground text-[11px]">Total overdue</p>
          <p className="text-destructive font-bold">{context.organization.currency} {totalOverdue.toLocaleString()}</p>
        </div>
      </div>
      <FeesSubNav basePath="/college-admin/fees" active="defaulters" />
      <DefaultersList rows={rows} currency={context.organization.currency} />
    </div>
  );
}
