import { redirect } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { SchoolActionForm } from '@/components/features/school-erp/SchoolActionForm';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { createPayrollRun, updatePayrollItem, upsertStaffCompensation } from '@/lib/school-erp/actions';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolPayroll } from '@/lib/school-erp/queries';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

function profileName(value: any) {
  const profile = Array.isArray(value) ? value[0] : value;
  return profile?.full_name || profile?.email || 'Staff member';
}

export default async function SchoolPayrollPage() {
  const { supabase, context } = await requireSchoolContext('payroll.read', 'payroll');
  if (!context) redirect('/school-admin');
  const data = await getSchoolPayroll(supabase, context);
  const canManage = hasSchoolPermission(context, 'payroll.manage');
  const unpaid = data.items.reduce((sum: number, item: any) => item.payment_status === 'paid' ? sum : sum + Number(item.net_amount || 0), 0);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="Payroll"
        description="Teacher and staff salary setup, monthly payroll runs, adjustments, and payment status."
        action={<div className="border-border bg-card rounded-lg border px-4 py-2 text-right"><p className="text-muted-foreground text-[11px]">Unpaid payroll</p><p className="font-bold">{context.organization.currency} {unpaid.toLocaleString()}</p></div>}
      />

      {canManage && (
        <div className="grid gap-5 xl:grid-cols-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Staff salary</CardTitle></CardHeader>
            <CardContent>
              <SchoolActionForm action={upsertStaffCompensation} submitLabel="Save salary">
                <select name="membership_id" className={selectClass} required>
                  <option value="">Staff member</option>
                  {data.memberships.map((item: any) => <option key={item.id} value={item.id}>{profileName(item.profiles)} - {item.member_role}</option>)}
                </select>
                <div className="grid grid-cols-2 gap-3">
                  <Input name="base_salary" type="number" min={0} placeholder="Base salary" required />
                  <Input name="currency" defaultValue={context.organization.currency} placeholder="PKR" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <select name="pay_frequency" className={selectClass} defaultValue="monthly">
                    <option value="monthly">Monthly</option>
                    <option value="weekly">Weekly</option>
                    <option value="daily">Daily</option>
                    <option value="contract">Contract</option>
                  </select>
                  <Input name="effective_from" type="date" />
                </div>
                <Input name="bank_account_title" placeholder="Bank account title" />
                <Input name="bank_account_number" placeholder="Bank account number" />
                <Input name="wallet_number" placeholder="Wallet number" />
                <Input name="notes" placeholder="Notes" />
              </SchoolActionForm>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Monthly payroll</CardTitle></CardHeader>
            <CardContent>
              <SchoolActionForm action={createPayrollRun} submitLabel="Create payroll">
                <Input name="payroll_month" type="date" required />
                <Input name="notes" placeholder="Notes" />
              </SchoolActionForm>
            </CardContent>
          </Card>
        </div>
      )}

      <Card>
        <CardHeader><CardTitle className="text-base">Salary setup</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="text-muted-foreground border-b text-left text-xs"><tr><th className="py-2">Member</th><th>Role</th><th>Salary</th><th>Frequency</th><th>Effective</th><th>Status</th></tr></thead>
            <tbody>
              {data.compensation.map((item: any) => {
                const membership = Array.isArray(item.school_memberships) ? item.school_memberships[0] : item.school_memberships;
                return <tr key={item.id} className="border-b last:border-0"><td className="py-2 font-medium">{profileName(membership?.profiles)}</td><td className="capitalize">{membership?.member_role}</td><td>{item.currency} {Number(item.base_salary).toLocaleString()}</td><td>{item.pay_frequency}</td><td>{item.effective_from}</td><td><Badge variant={item.is_active ? 'secondary' : 'outline'}>{item.is_active ? 'active' : 'inactive'}</Badge></td></tr>;
              })}
              {!data.compensation.length && <tr><td colSpan={6} className="text-muted-foreground py-6 text-center">No salary setup yet.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Payroll items</CardTitle></CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="text-muted-foreground border-b text-left text-xs"><tr><th className="py-2">Month</th><th>Member</th><th>Base</th><th>Bonus</th><th>Deduction</th><th>Net</th><th>Status</th><th>Update</th></tr></thead>
            <tbody>
              {data.items.map((item: any) => {
                const membership = Array.isArray(item.school_memberships) ? item.school_memberships[0] : item.school_memberships;
                const run = Array.isArray(item.school_payroll_runs) ? item.school_payroll_runs[0] : item.school_payroll_runs;
                return (
                  <tr key={item.id} className="border-b align-top last:border-0">
                    <td className="py-2">{run?.payroll_month}</td>
                    <td className="font-medium">{profileName(membership?.profiles)}</td>
                    <td>{Number(item.base_salary).toLocaleString()}</td>
                    <td>{Number(item.bonus_amount).toLocaleString()}</td>
                    <td>{Number(item.deduction_amount).toLocaleString()}</td>
                    <td className="font-semibold">{Number(item.net_amount).toLocaleString()}</td>
                    <td><Badge variant={item.payment_status === 'paid' ? 'secondary' : 'outline'}>{item.payment_status}</Badge></td>
                    <td>
                      {canManage && (
                        <SchoolActionForm action={updatePayrollItem} submitLabel="Save" className="grid min-w-[280px] gap-2">
                          <input type="hidden" name="id" value={item.id} />
                          <div className="grid grid-cols-2 gap-2">
                            <Input name="bonus_amount" type="number" min={0} defaultValue={item.bonus_amount || 0} placeholder="Bonus" />
                            <Input name="deduction_amount" type="number" min={0} defaultValue={item.deduction_amount || 0} placeholder="Deduction" />
                          </div>
                          <select name="payment_status" className={selectClass} defaultValue={item.payment_status}>
                            {['unpaid', 'paid', 'held', 'cancelled'].map((status) => <option key={status} value={status}>{status}</option>)}
                          </select>
                          <Input name="payment_reference" defaultValue={item.payment_reference || ''} placeholder="Payment reference" />
                        </SchoolActionForm>
                      )}
                    </td>
                  </tr>
                );
              })}
              {!data.items.length && <tr><td colSpan={8} className="text-muted-foreground py-6 text-center">Create a payroll run to generate salary items.</td></tr>}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
