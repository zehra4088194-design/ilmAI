import { redirect } from 'next/navigation';
import { GrowthDashboard } from '@/components/features/school-erp/GrowthDashboard';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { getCollegeGrowthInsights } from '@/lib/college-erp/queries';

export default async function CollegeGrowthPage() {
  const { supabase, context } = await requireCollegeContext('reports.read', 'reports');
  if (!context) redirect('/college-admin');
  const data = await getCollegeGrowthInsights(supabase, context);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">College Growth</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Admissions vs withdrawals, attendance, and fee recovery over the last 6 months — with concrete next steps.
        </p>
      </div>
      <GrowthDashboard data={data} studentNoun="student" />
    </div>
  );
}
