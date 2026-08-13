import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { createFeeInvoice, createFeeStructure, recordFeePayment } from '@/lib/school-erp/actions';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolFees } from '@/lib/school-erp/queries';
import { listPendingFeePaymentClaims } from '@/lib/institution-payments/fee-actions';
import { FeeClaimReviewRow } from '@/components/features/institution-payments/FeeClaimReviewRow';
import { VoucherLedgerTable } from '@/components/features/school-erp/VoucherLedgerTable';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

function profileName(value: any) {
  const profile = Array.isArray(value) ? value[0] : value;
  return profile?.full_name || 'Student';
}

export default async function SchoolFeesPage() {
  const { supabase, context } = await requireSchoolContext('fees.read', 'fees');
  if (!context) redirect('/school-admin');
  const data = await getSchoolFees(supabase, context);
  const canManage = hasSchoolPermission(context, 'fees.manage');
  const pendingClaims = canManage ? await listPendingFeePaymentClaims('school', context.organization.id) : [];
  const outstanding = data.invoices.reduce(
    (sum: number, invoice: any) => sum + Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)),
    0,
  );

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="Fee management"
        description="Structures, monthly vouchers, fines, discounts, scholarships, receipts, and defaulter tracking."
        action={<div className="border-border bg-card rounded-lg border px-4 py-2 text-right"><p className="text-muted-foreground text-[11px]">Outstanding</p><p className="font-bold">{context.organization.currency} {outstanding.toLocaleString()}</p></div>}
      />
      {canManage && (
        <div className="grid gap-5 xl:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Fee structure</CardTitle></CardHeader>
            <CardContent>
              <SchoolActionForm action={createFeeStructure} submitLabel="Add structure">
                <Input name="name" placeholder="Monthly Tuition" required />
                <select name="academic_year_id" className={selectClass} required><option value="">Academic year</option>{data.years.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <select name="class_id" className={selectClass}><option value="">All classes</option>{data.classes.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <div className="grid grid-cols-2 gap-3">
                  <select name="fee_type" className={selectClass}><option value="tuition">Tuition</option><option value="admission">Admission</option><option value="exam">Exam</option><option value="transport">Transport</option><option value="activity">Activity</option><option value="other">Other</option></select>
                  <select name="frequency" className={selectClass}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option><option value="one_time">One time</option></select>
                </div>
                <div className="grid grid-cols-2 gap-3"><Input name="amount" type="number" min={0} placeholder="Amount" required /><Input name="due_day" type="number" min={1} max={28} defaultValue={10} /></div>
                <Input name="late_fee_amount" type="number" min={0} placeholder="Late fine" />
              </SchoolActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Issue voucher</CardTitle></CardHeader>
            <CardContent>
              <SchoolActionForm action={createFeeInvoice} submitLabel="Issue voucher">
                <select name="student_id" className={selectClass} required><option value="">Student</option>{data.students.map((item: any) => <option key={item.student_id} value={item.student_id}>{profileName(item.profiles)} - {item.admission_number}</option>)}</select>
                <select name="academic_year_id" className={selectClass} required><option value="">Academic year</option>{data.years.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <select name="fee_structure_id" className={selectClass}><option value="">Fee structure</option>{data.structures.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <div className="grid grid-cols-2 gap-3"><Input name="subtotal" type="number" min={0} placeholder="Subtotal" required /><Input name="due_date" type="date" required /></div>
                <div className="grid grid-cols-3 gap-2"><Input name="discount_amount" type="number" min={0} placeholder="Discount" /><Input name="scholarship_amount" type="number" min={0} placeholder="Scholarship" /><Input name="fine_amount" type="number" min={0} placeholder="Fine" /></div>
                <Input name="billing_period" placeholder="July 2026" />
              </SchoolActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Record payment</CardTitle></CardHeader>
            <CardContent>
              <SchoolActionForm action={recordFeePayment} submitLabel="Record payment">
                <select name="invoice_id" className={selectClass} required><option value="">Voucher</option>{data.invoices.filter((item: any) => !['paid', 'cancelled', 'waived'].includes(item.status)).map((item: any) => <option key={item.id} value={item.id}>{item.voucher_number} - {profileName(item.profiles)}</option>)}</select>
                <Input name="amount" type="number" min={1} placeholder="Amount received" required />
                <select name="payment_method" className={selectClass}><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="card">Card</option><option value="wallet">Wallet</option><option value="online">Online</option><option value="adjustment">Adjustment</option></select>
                <Input name="provider_reference" placeholder="Transaction reference" />
              </SchoolActionForm>
            </CardContent>
          </Card>
        </div>
      )}
      {canManage && pendingClaims.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">Pending payment claims ({pendingClaims.length})</CardTitle></CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="text-muted-foreground border-b text-left text-xs"><tr><th className="py-2 pr-3">Student</th><th className="pr-3">Method</th><th className="pr-3">Amount</th><th className="pr-3">Contact</th><th>Action</th></tr></thead>
              <tbody>
                {pendingClaims.map((claim: any) => (
                  <FeeClaimReviewRow
                    key={claim.id}
                    institutionType="school"
                    claim={claim}
                    studentName={profileName(claim.profiles)}
                    currency={context.organization.currency}
                  />
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Voucher ledger</CardTitle></CardHeader>
        <CardContent>
          <VoucherLedgerTable invoices={data.invoices} />
        </CardContent>
      </Card>
    </div>
  );
}
