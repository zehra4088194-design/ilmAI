import { redirect } from 'next/navigation';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeFees } from '@/lib/college-erp/queries';
import { recordBulkCollegeFeePayment } from '@/lib/college-erp/actions';
import { FeesSubNav } from '@/components/features/institution-payments/FeesSubNav';
import { QuickFeeCollection } from '@/components/features/institution-payments/QuickFeeCollection';

function profileName(value: any) {
  const profile = Array.isArray(value) ? value[0] : value;
  return profile?.full_name || 'Student';
}

function structureName(value: any) {
  const structure = Array.isArray(value) ? value[0] : value;
  return structure?.name || null;
}

export default async function CollegeQuickFeeCollectionPage() {
  const { supabase, context } = await requireCollegeContext('fees.manage', 'fees');
  if (!context) redirect('/college-admin/fees');
  const data = await getCollegeFees(supabase, context);

  const students = data.students.map((item: any) => ({
    id: item.student_id,
    label: `${profileName(item.profiles)} — ${item.registration_number}`,
  }));
  const invoices = data.invoices
    .filter((item: any) => !['paid', 'cancelled', 'waived'].includes(item.status))
    .map((item: any) => ({
      id: item.id,
      voucher_number: item.voucher_number,
      due_date: item.due_date,
      billing_period: item.billing_period,
      total_amount: Number(item.total_amount),
      paid_amount: Number(item.paid_amount),
      studentId: item.student_id,
      studentName: profileName(item.profiles),
      feeStructureName: structureName(item.college_fee_structures),
    }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Quick fee collection</h1>
        <p className="text-muted-foreground mt-1 text-sm">Pick a student, see every pending fee head, and collect one or more in a single receipt.</p>
      </div>
      <FeesSubNav basePath="/college-admin/fees" active="collect" />
      <QuickFeeCollection
        students={students}
        invoices={invoices}
        currency={context.organization.currency}
        orgName={context.organization.name}
        action={recordBulkCollegeFeePayment}
      />
    </div>
  );
}
