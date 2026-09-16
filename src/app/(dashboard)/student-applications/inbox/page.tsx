import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { InstitutionApplicationsInbox } from '@/components/features/student-applications/InstitutionApplicationsInbox';

export const metadata = { title: 'Application Inbox | ilm AI' };

export default async function StudentApplicationInboxPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/student-applications/inbox');

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Application Inbox</h1>
        <p className="text-muted-foreground mt-1 text-sm">Student applications addressed to you. Review them, add a response, and approve, reject, or request changes.</p>
      </div>
      <InstitutionApplicationsInbox />
    </div>
  );
}
