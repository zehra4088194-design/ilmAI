import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { AdmissionsList } from '@/components/features/school-erp/AdmissionsList';
import { updateAdmissionStatus } from '@/lib/school-erp/actions';
import { hasSchoolPermission, requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolAcademicSetup, getSchoolAdmissions } from '@/lib/school-erp/queries';

export default async function SchoolAdmissionsPage() {
  const { supabase, context } = await requireSchoolContext('admissions.read', 'admissions');
  if (!context) redirect('/school-admin');
  const [applications, setup] = await Promise.all([
    getSchoolAdmissions(supabase, context),
    getSchoolAcademicSetup(supabase, context),
  ]);
  const canManage = hasSchoolPermission(context, 'admissions.manage');

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="Admissions"
        description="New student admissions, public applications, review, waiting list, approval, and enrollment tracking."
        action={<Link href={`/schools/${context.organization.slug}/admissions`} target="_blank" className="border-input bg-background hover:bg-accent inline-flex h-9 items-center rounded-lg border px-3 text-sm font-medium">Open public form</Link>}
      />
      <Card className="border-violet-500/20 bg-violet-500/5">
        <CardHeader><CardTitle className="text-base">Enrolled student applications</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-muted-foreground text-sm">Sick leave aur doosri applications enrolled students ab apne student portal se bhejte hain. Principal/class incharge aur linked guardian ko notification automatically milti hai.</p>
          <Link href="/school-admin/applications" className="border-input bg-background hover:bg-accent inline-flex h-9 shrink-0 items-center justify-center rounded-lg border px-3 text-sm font-medium">Open student applications</Link>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-base">Admission funnel</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {['inquiry', 'visit_scheduled', 'entry_test_scheduled', 'submitted', 'under_review', 'approved', 'enrolled'].map((stage) => {
            const count = applications.filter((item: any) => item.status === stage).length;
            return (
              <div key={stage} className="border-border min-w-[110px] rounded-lg border px-3 py-2 text-center">
                <p className="text-lg font-bold">{count}</p>
                <p className="text-muted-foreground text-[11px] capitalize">{stage.replace('_', ' ')}</p>
              </div>
            );
          })}
        </CardContent>
      </Card>
      <AdmissionsList
        applications={applications}
        canManage={canManage}
        updateAdmissionStatus={updateAdmissionStatus}
        sections={setup.sections}
        years={setup.years}
      />
    </div>
  );
}
