import { redirect } from 'next/navigation';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolFamilyAccounts } from '@/lib/school-erp/queries';
import { recordBulkFeePayment } from '@/lib/school-erp/actions';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { FeesSubNav } from '@/components/features/institution-payments/FeesSubNav';
import { FamilyAccountsList, type Family } from '@/components/features/institution-payments/FamilyAccountsList';

export default async function SchoolFamilyAccountsPage() {
  const { supabase, context } = await requireSchoolContext('fees.manage', 'fees');
  if (!context) redirect('/school-admin/fees');
  const families = await getSchoolFamilyAccounts(supabase, context);

  const rows: Family[] = families.map((family: any) => ({
    guardianId: family.guardian.id,
    guardianName: family.guardian.full_name || 'Guardian',
    guardianPhone: family.guardian.phone || null,
    totalPending: family.totalPending,
    children: family.children.map((child: any) => ({
      id: child.student.id,
      fullName: child.student.full_name || 'Student',
      pending: child.pending,
      invoices: child.invoices
        .filter((inv: any) => Math.max(0, Number(inv.total_amount) - Number(inv.paid_amount)) > 0)
        .map((inv: any) => ({
          id: inv.id,
          voucher_number: inv.voucher_number,
          due_date: inv.due_date,
          billing_period: inv.billing_period,
          total_amount: Number(inv.total_amount),
          paid_amount: Number(inv.paid_amount),
          studentId: child.student.id,
          studentName: child.student.full_name || 'Student',
        })),
    })),
  }));

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="Family accounts"
        description="Guardians with more than one linked child, their combined pending total, and one receipt to pay across children."
      />
      <FeesSubNav basePath="/school-admin/fees" active="families" />
      <FamilyAccountsList
        families={rows}
        currency={context.organization.currency}
        orgName={context.organization.name}
        action={recordBulkFeePayment}
      />
    </div>
  );
}
