import { redirect } from 'next/navigation';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { CommunicationHub } from '@/components/features/communication/CommunicationHub';
import { UniversalMessagesClient } from '@/components/features/communication/UniversalMessagesClient';
import { createClient } from '@/lib/supabase/server';

export default async function MessagesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?redirect=%2Fmessages');

  const school = await requireSchoolContext('communication.read', 'communication');
  if (school.context) {
    return (
      <main className="mx-auto w-full max-w-[1500px] space-y-4 py-2">
        <CommunicationHub organizationId={school.context.organization.id} currentUserId={school.context.userId} currentRole={school.context.membership.member_role} />
      </main>
    );
  }

  const college = await requireCollegeContext('communication.read', 'communication');
  if (college.context) {
    // College members get the same universal direct-message experience for now; the
    // conversation RPC enforces the participant boundary for the selected users.
    return (
      <main className="mx-auto w-full max-w-[1500px] space-y-4 py-2">
        <UniversalMessagesClient currentUserId={user.id} />
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-4 py-2">
      <UniversalMessagesClient currentUserId={user.id} />
    </main>
  );
}
