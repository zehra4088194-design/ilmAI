import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { getStudentKidsZoneEligibility } from '@/lib/school-erp/kids-zone';
import { KidsZoneShell } from '@/components/features/school-erp/kids-zone/KidsZoneShell';

export const metadata = { title: 'Kids Zone | ilm AI' };

export default async function SchoolKidsZonePage() {
  const { supabase, user, context } = await requireSchoolContext();
  if (!user) redirect('/login?redirect=%2Fschool%2Fkids-zone');
  if (!context) redirect('/school');

  const { eligible } = await getStudentKidsZoneEligibility(supabase, context);
  if (!eligible) {
    return (
      <div className="mx-auto max-w-md space-y-4 p-8 text-center">
        <p className="text-4xl">🌟</p>
        <h1 className="text-lg font-bold">Kids Zone isn&apos;t available here</h1>
        <p className="text-muted-foreground text-sm">
          Kids Zone is a special games section for younger students (grade 5 and below). It shows up
          automatically once your school records your grade level.
        </p>
        <Link href="/school" className="text-primary inline-flex items-center gap-2 text-sm font-medium">
          <ArrowLeft className="h-4 w-4" />
          Back to my portal
        </Link>
      </div>
    );
  }

  const { data: profile } = await (supabase as any).from('profiles').select('full_name').eq('id', user.id).maybeSingle();
  return <KidsZoneShell studentName={profile?.full_name?.split(' ')[0] || 'friend'} />;
}
