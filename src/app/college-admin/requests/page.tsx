import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/server';
import { getCollegeAdminContext } from '@/lib/college/access';
import { getPendingJoinRequests } from '@/lib/college/queries';
import { JoinRequestList } from '@/components/college/requests/JoinRequestList';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { getPendingCollegeStudentAdditions } from '@/lib/college-erp/queries';
import { CollegePendingStudentAdditionsList } from '@/components/features/college-erp/CollegePendingStudentAdditionsList';

export const metadata = { title: 'Requests | College Admin | ilm AI' };

export default async function CollegeAdminRequestsPage() {
  const { supabase, context: newContext } = await requireCollegeContext('people.manage');
  if (newContext) {
    const pendingAdditions = await getPendingCollegeStudentAdditions(supabase, newContext.organization.id);
    return (
      <div className="space-y-6">
        <h1 className="text-xl font-bold">Requests</h1>
        <Card>
          <CardHeader>
            <CardTitle className="text-base">New students detected in attendance scans</CardTitle>
          </CardHeader>
          <CardContent>
            <CollegePendingStudentAdditionsList requests={pendingAdditions} />
          </CardContent>
        </Card>
        <p className="text-muted-foreground text-xs">
          Self-serve college join requests (a student searching for and requesting to join your college
          directly) aren&apos;t built yet for the new college schema — add members from People instead.
        </p>
      </div>
    );
  }

  // Legacy join-request flow (colleges provisioned under the old schema) — unchanged.
  const legacySupabase = await createClient();
  const {
    data: { user },
  } = await legacySupabase.auth.getUser();
  if (!user) return null;
  const legacyContext = await getCollegeAdminContext(legacySupabase, user.id);
  if (!legacyContext) return null;
  const requests = await getPendingJoinRequests(legacySupabase, legacyContext.college.id);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-bold">Join requests</h1>
      <JoinRequestList initialRequests={requests} />
    </div>
  );
}
