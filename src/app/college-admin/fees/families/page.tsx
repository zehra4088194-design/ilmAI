import { redirect } from 'next/navigation';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeFamilyAccounts } from '@/lib/college-erp/queries';
import { recordBulkCollegeFeePayment } from '@/lib/college-erp/actions';
import { FeesSubNav } from '@/components/features/institution-payments/FeesSubNav';
import { FamilyAccountsList, type Family } from '@/components/features/institution-payments/FamilyAccountsList';

export default async function CollegeFamilyAccountsPage() {
  const { supabase, context } = await requireCollegeContext('fees.manage', 'fees');
  if (!context) redirect('/college-admin/fees');
  const families = await getCollegeFamilyAccounts(supabase, context);

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
      <div>
        <h1 className="text-2xl font-bold">Family accounts</h1>
        <p className="text-muted-foreground mt-1 text-sm">Guardians with more than one linked child, their combined pending total, and one receipt to pay across children.</p>
      </div>
      <FeesSubNav basePath="/college-admin/fees" active="families" />
      <FamilyAccountsList
        families={rows}
        currency={context.organization.currency}
        orgName={context.organization.name}
        action={recordBulkCollegeFeePayment}
      />
    </div>
  );
}
