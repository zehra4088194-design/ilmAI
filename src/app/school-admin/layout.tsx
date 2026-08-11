import { redirect } from 'next/navigation';
import { SchoolAdminSidebar } from '@/components/features/school-erp/SchoolAdminSidebar';
import { getSchoolContexts, requireSchoolContext, schoolAdminHomeForRole } from '@/lib/school-erp/access';

export default async function SchoolAdminLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase, context } = await requireSchoolContext('dashboard.read');
  if (!user) redirect('/login?redirect=%2Fschool-admin');
  if (!context) redirect('/dashboard');
  if (context.membership.member_role === 'student' || context.membership.member_role === 'parent') {
    redirect(schoolAdminHomeForRole(context.membership.member_role));
  }
  const organizations = (await getSchoolContexts(supabase, user.id)).map((item) => ({
    id: item.organization.id,
    name: item.organization.name,
    role: item.membership.member_role,
    operations: !['student', 'parent'].includes(item.membership.member_role),
  }));

  return (
    <div className="bg-background min-h-screen">
      <SchoolAdminSidebar
        organizationName={context.organization.name}
        organizationId={context.organization.id}
        organizations={organizations}
        role={context.membership.member_role}
        permissions={context.permissions}
        enabledModules={context.enabledModules}
      />
      <main className="min-w-0 p-4 pt-20 sm:p-6 sm:pt-20 lg:ml-64 lg:p-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
