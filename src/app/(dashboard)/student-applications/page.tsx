import { redirect } from 'next/navigation';
import { StudentApplicationsClient } from '@/components/features/student-applications/StudentApplicationsClient';
import { createClient } from '@/lib/supabase/server';
import { getStudentApplicationContext, getOwnStudentApplications, getOwnTemplates } from '@/lib/student-applications/server';

export const metadata = { title: 'Applications | ilm AI' };

export default async function StudentApplicationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/student-applications');
  const [institutions, applications, templates] = await Promise.all([
    getStudentApplicationContext(user.id),
    getOwnStudentApplications(user.id),
    getOwnTemplates(user.id),
  ]);
  return <StudentApplicationsClient initial={{ institutions, applications, templates }} />;
}
