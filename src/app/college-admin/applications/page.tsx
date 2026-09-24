import { redirect } from 'next/navigation';
import { InstitutionApplicationsInbox } from '@/components/features/student-applications/InstitutionApplicationsInbox';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { requireCollegeContext } from '@/lib/college-erp/access';

export const metadata = { title: 'Student Applications | College Admin | ilm AI' };

export default async function CollegeAdminApplicationsPage() {
  const { context } = await requireCollegeContext('people.manage', 'people');
  if (!context) redirect('/college-admin');
  return (
    <div className="space-y-6">
      <SchoolPageHeader title="Student Applications" description="Applications submitted by enrolled students. The selected recipient and linked guardian are notified automatically." />
      <InstitutionApplicationsInbox />
    </div>
  );
}
