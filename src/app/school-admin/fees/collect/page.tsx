import { redirect } from 'next/navigation';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolFees } from '@/lib/school-erp/queries';
import { recordBulkFeePayment } from '@/lib/school-erp/actions';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
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

export default async function SchoolQuickFeeCollectionPage() {
  const { supabase, context } = await requireSchoolContext('fees.manage', 'fees');
  if (!context) redirect('/school-admin/fees');
  const data = await getSchoolFees(supabase, context);

  const students = data.students.map((item: any) => ({
    id: item.student_id,
    label: `${profileName(item.profiles)} — ${item.admission_number}`,
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
      feeStructureName: structureName(item.school_fee_structures),
    }));

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="Quick fee collection"
        description="Pick a student, see every pending fee head, and collect one or more in a single receipt."
      />
      <FeesSubNav basePath="/school-admin/fees" active="collect" />
      <QuickFeeCollection
        students={students}
        invoices={invoices}
        currency={context.organization.currency}
        orgName={context.organization.name}
        action={recordBulkFeePayment}
      />
    </div>
  );
}
