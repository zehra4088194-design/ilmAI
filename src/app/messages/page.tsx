import { redirect } from 'next/navigation';
import { requireSchoolContext } from '@/lib/school-erp/access';
import { CommunicationHub } from '@/components/features/communication/CommunicationHub';

export default async function MessagesPage() {
  const { context } = await requireSchoolContext('communication.read', 'communication');
  if (!context) redirect('/dashboard');
  return (
    <main className="mx-auto w-full max-w-[1500px] space-y-4 py-2">
      <CommunicationHub organizationId={context.organization.id} currentUserId={context.userId} currentRole={context.membership.member_role} />
    </main>
  );
}
