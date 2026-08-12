import { redirect } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { getPendingSchoolJoinRequests, getPendingStudentAdditions } from '@/lib/school-erp/queries';
import { SchoolPageHeader } from '@/components/features/school-erp/SchoolPageHeader';
import { SchoolJoinRequestList } from '@/components/features/school-erp/requests/SchoolJoinRequestList';
import { PendingStudentAdditionsList } from '@/components/features/school-erp/requests/PendingStudentAdditionsList';

export const metadata = { title: 'Join Requests | School Admin | ilm AI' };

export default async function SchoolAdminRequestsPage() {
  const { supabase, context } = await requireSchoolContext('people.manage', 'people');
  if (!context) redirect('/school-admin');

  const [requests, pendingAdditions] = await Promise.all([
    getPendingSchoolJoinRequests(supabase, context.organization.id),
    getPendingStudentAdditions(supabase, context.organization.id),
  ]);

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="Join requests"
        description="Students and teachers who signed up asking to join your institution. Approving a request adds them as an active member; assign students to a class from People afterward."
      />
      <SchoolJoinRequestList initialRequests={requests} />
      <Card>
        <CardHeader>
          <CardTitle className="text-base">New students detected in attendance scans</CardTitle>
        </CardHeader>
        <CardContent>
          <PendingStudentAdditionsList requests={pendingAdditions} />
        </CardContent>
      </Card>
    </div>
  );
}
