import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { CollegeActionForm } from '@/components/features/college-erp/CollegeActionForm';
import { createCollegeFeeInvoice, createCollegeFeeStructure, recordCollegeFeePayment } from '@/lib/college-erp/actions';
import { hasCollegePermission, requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeFees } from '@/lib/college-erp/queries';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

function profileName(value: any) {
  const profile = Array.isArray(value) ? value[0] : value;
  return profile?.full_name || 'Student';
}

export default async function CollegeFeesPage() {
  const { supabase, context } = await requireCollegeContext('fees.read', 'fees');
  if (!context) redirect('/college-admin');
  const data = await getCollegeFees(supabase, context);
  const canManage = hasCollegePermission(context, 'fees.manage');
  const outstanding = data.invoices.reduce((sum: number, invoice: any) => sum + Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0)), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Fee management</h1>
          <p className="text-muted-foreground mt-1 text-sm">Structures, vouchers, fines, discounts, scholarships, and receipts.</p>
        </div>
        <div className="border-border bg-card rounded-lg border px-4 py-2 text-right">
          <p className="text-muted-foreground text-[11px]">Outstanding</p>
          <p className="font-bold">{context.organization.currency} {outstanding.toLocaleString()}</p>
        </div>
      </div>
      {canManage && (
        <div className="grid gap-5 xl:grid-cols-3">
          <Card>
            <CardHeader><CardTitle className="text-base">Fee structure</CardTitle></CardHeader>
            <CardContent>
              <CollegeActionForm action={createCollegeFeeStructure} submitLabel="Add structure">
                <Input name="name" placeholder="Semester Tuition" required />
                <select name="academic_year_id" className={selectClass} required><option value="">Academic year</option>{data.years.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <select name="semester_id" className={selectClass}><option value="">All semesters</option>{data.semesters.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <div className="grid grid-cols-2 gap-3">
                  <select name="fee_type" className={selectClass}><option value="tuition">Tuition</option><option value="admission">Admission</option><option value="exam">Exam</option><option value="transport">Transport</option><option value="activity">Activity</option><option value="other">Other</option></select>
                  <select name="frequency" className={selectClass}><option value="monthly">Monthly</option><option value="quarterly">Quarterly</option><option value="annual">Annual</option><option value="one_time">One time</option></select>
                </div>
                <div className="grid grid-cols-2 gap-3"><Input name="amount" type="number" min={0} placeholder="Amount" required /><Input name="due_day" type="number" min={1} max={28} defaultValue={10} /></div>
                <Input name="late_fee_amount" type="number" min={0} placeholder="Late fine" />
              </CollegeActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Issue voucher</CardTitle></CardHeader>
            <CardContent>
              <CollegeActionForm action={createCollegeFeeInvoice} submitLabel="Issue voucher">
                <select name="student_id" className={selectClass} required><option value="">Student</option>{data.students.map((item: any) => <option key={item.student_id} value={item.student_id}>{profileName(item.profiles)} - {item.registration_number}</option>)}</select>
                <select name="academic_year_id" className={selectClass} required><option value="">Academic year</option>{data.years.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <select name="fee_structure_id" className={selectClass}><option value="">Fee structure</option>{data.structures.map((item: any) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
                <div className="grid grid-cols-2 gap-3"><Input name="subtotal" type="number" min={0} placeholder="Subtotal" required /><Input name="due_date" type="date" required /></div>
                <div className="grid grid-cols-3 gap-2"><Input name="discount_amount" type="number" min={0} placeholder="Discount" /><Input name="scholarship_amount" type="number" min={0} placeholder="Scholarship" /><Input name="fine_amount" type="number" min={0} placeholder="Fine" /></div>
                <Input name="billing_period" placeholder="Fall 2026" />
              </CollegeActionForm>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Record payment</CardTitle></CardHeader>
            <CardContent>
              <CollegeActionForm action={recordCollegeFeePayment} submitLabel="Record payment">
                <select name="invoice_id" className={selectClass} required><option value="">Voucher</option>{data.invoices.filter((item: any) => !['paid', 'cancelled', 'waived'].includes(item.status)).map((item: any) => <option key={item.id} value={item.id}>{item.voucher_number} - {profileName(item.profiles)}</option>)}</select>
                <Input name="amount" type="number" min={1} placeholder="Amount received" required />
                <select name="payment_method" className={selectClass}><option value="cash">Cash</option><option value="bank">Bank transfer</option><option value="card">Card</option><option value="wallet">Wallet</option><option value="online">Online</option><option value="adjustment">Adjustment</option></select>
                <Input name="provider_reference" placeholder="Transaction reference" />
              </CollegeActionForm>
            </CardContent>
          </Card>
        </div>
      )}
      <Card>
        <CardHeader><CardTitle className="text-base">Voucher ledger</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead className="text-muted-foreground border-b text-left text-xs"><tr><th className="py-2">Voucher</th><th>Student</th><th>Due</th><th>Total</th><th>Paid</th><th>Balance</th><th>Status</th></tr></thead>
            <tbody>
              {data.invoices.map((item: any) => {
                const balance = Math.max(0, Number(item.total_amount) - Number(item.paid_amount));
                return <tr key={item.id} className="border-b last:border-0"><td className="py-2 font-medium">{item.voucher_number}</td><td>{profileName(item.profiles)}</td><td>{item.due_date}</td><td>{Number(item.total_amount).toLocaleString()}</td><td>{Number(item.paid_amount).toLocaleString()}</td><td>{balance.toLocaleString()}</td><td><Badge variant={item.status === 'paid' ? 'secondary' : item.status === 'overdue' ? 'destructive' : 'outline'}>{item.status}</Badge></td></tr>;
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
