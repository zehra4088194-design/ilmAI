import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AdmissionsList } from '@/components/features/college-erp/AdmissionsList';
import { updateCollegeAdmissionStatus } from '@/lib/college-erp/actions';
import { hasCollegePermission, requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeAcademicSetup, getCollegeAdmissions } from '@/lib/college-erp/queries';

export default async function CollegeAdmissionsPage() {
  const { supabase, context } = await requireCollegeContext('admissions.read', 'admissions');
  if (!context) redirect('/college-admin');
  const [applications, setup] = await Promise.all([getCollegeAdmissions(supabase, context), getCollegeAcademicSetup(supabase, context)]);
  const canManage = hasCollegePermission(context, 'admissions.manage');

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Admissions</h1>
        <p className="text-muted-foreground mt-1 text-sm">New student admissions, review, and enrollment tracking.</p>
      </div>
      <Card className="border-violet-500/20 bg-violet-500/5">
        <CardHeader><CardTitle className="text-base">Enrolled student applications</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">Sick leave aur doosri applications enrolled students apne student portal se bhejte hain. Recipient aur linked guardian ko notification automatically milti hai.</p>
          <Link href="/college-admin/applications" className="border-input bg-background hover:bg-accent inline-flex h-9 shrink-0 items-center justify-center rounded-lg border px-3 text-sm font-medium">Open student applications</Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Admission funnel</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {['inquiry', 'visit_scheduled', 'entry_test_scheduled', 'submitted', 'under_review', 'approved', 'enrolled'].map((stage) => {
            const count = applications.filter((item: any) => item.status === stage).length;
            return <div key={stage} className="border-border min-w-[110px] rounded-lg border px-3 py-2 text-center"><p className="text-lg font-bold">{count}</p><p className="text-muted-foreground text-[11px] capitalize">{stage.replace('_', ' ')}</p></div>;
          })}
        </CardContent>
      </Card>
      <AdmissionsList applications={applications} canManage={canManage} updateCollegeAdmissionStatus={updateCollegeAdmissionStatus} sections={setup.sections} years={setup.years} />
    </div>
  );
}
