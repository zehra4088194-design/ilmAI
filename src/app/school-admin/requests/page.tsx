import { redirect } from 'next/navigation';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { getPendingSchoolJoinRequests } from '@/lib/school-erp/queries';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { SchoolJoinRequestList } from '@/components/features/school-erp/requests/SchoolJoinRequestList';

export const metadata = { title: 'Join Requests | School Admin | ilm AI' };

export default async function SchoolAdminRequestsPage() {
  const { supabase, context } = await requireSchoolContext('people.manage', 'people');
  if (!context) redirect('/school-admin');

  const requests = await getPendingSchoolJoinRequests(supabase, context.organization.id);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="Join requests"
        description="Students and teachers who signed up asking to join your institution. Approving a request adds them as an active member; assign students to a class from People afterward."
      />
      <SchoolJoinRequestList initialRequests={requests} />
    </div>
  );
}
