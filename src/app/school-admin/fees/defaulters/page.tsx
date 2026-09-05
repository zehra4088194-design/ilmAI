import { redirect } from 'next/navigation';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolDefaulters } from '@/lib/school-erp/queries';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { FeesSubNav } from '@/components/features/institution-payments/FeesSubNav';
import { DefaultersList, type DefaulterRow } from '@/components/features/institution-payments/DefaultersList';

function profileName(value: any) {
  const profile = Array.isArray(value) ? value[0] : value;
  return profile?.full_name || 'Student';
}

export default async function SchoolDefaultersPage() {
  const { supabase, context } = await requireSchoolContext('fees.read', 'fees');
  if (!context) redirect('/school-admin/fees');
  const defaulters = await getSchoolDefaulters(supabase, context);

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
      <SchoolPageHeader
        title="Fee defaulters"
        description="Students with overdue or partially paid vouchers, sortable by amount or days overdue."
        action={
          <div className="border-border bg-card rounded-lg border px-4 py-2 text-right">
            <p className="text-muted-foreground text-[11px]">Total overdue</p>
            <p className="text-destructive font-bold">{context.organization.currency} {totalOverdue.toLocaleString()}</p>
          </div>
        }
      />
      <FeesSubNav basePath="/school-admin/fees" active="defaulters" />
      <DefaultersList rows={rows} currency={context.organization.currency} />
    </div>
  );
}
