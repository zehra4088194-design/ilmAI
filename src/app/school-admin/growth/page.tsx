import { redirect } from 'next/navigation';
import { GrowthDashboard } from '@/components/features/school-erp/GrowthDashboard';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { getSchoolGrowthInsights } from '@/lib/school-erp/queries';

export default async function SchoolGrowthPage() {
  const { supabase, context } = await requireSchoolContext('reports.read', 'reports');
  if (!context) redirect('/school-admin');
  const data = await getSchoolGrowthInsights(supabase, context);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="School Growth"
        description="Admissions vs withdrawals, attendance, and fee recovery over the last 6 months — with concrete next steps."
      />
      <GrowthDashboard data={data} />
    </div>
  );
}
