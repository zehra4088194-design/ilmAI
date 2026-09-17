import { redirect } from 'next/navigation';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { InstitutionApplicationsInbox } from '@/components/features/student-applications/InstitutionApplicationsInbox';
import { requireSchoolContext } from '@/lib/school-erp/access';

export const metadata = { title: 'Student Applications | School Admin | ilm AI' };

export default async function SchoolAdminApplicationsPage() {
  const { context } = await requireSchoolContext('people.manage', 'people');
  if (!context) redirect('/school-admin');
  return (
    <div className="space-y-6">
      <SchoolPageHeader title="Student Applications" description="Applications submitted by your enrolled students. The selected recipient and linked guardian are notified automatically." />
      <InstitutionApplicationsInbox />
    </div>
  );
}
