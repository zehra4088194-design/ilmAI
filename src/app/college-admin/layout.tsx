import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Video, FileText, Inbox, Users, Settings, LayoutDashboard } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { getCollegeAdminContext } from '@/lib/college/access';
import { requireCollegeContext } from '@/lib/college-erp/access';
import { CollegeAdminSidebar } from '@/components/features/college-erp/CollegeAdminSidebar';

// Legacy nav for colleges provisioned under the OLD `colleges`/`college_admins` schema (pre-dates
// the college-erp rebuild — see docs/COLLEGE_ERP_IMPLEMENTATION.md §1). Kept working unchanged so
// nothing already relying on it regresses; new institutions get the new-schema shell below instead.
const LEGACY_NAV_ITEMS = [
  { href: '/college-admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/college-admin/lectures', label: 'Lectures', icon: Video },
  { href: '/college-admin/resources', label: 'Resources', icon: FileText },
  { href: '/college-admin/requests', label: 'Requests', icon: Inbox },
  { href: '/college-admin/students', label: 'Students', icon: Users },
  { href: '/college-admin/settings', label: 'Settings', icon: Settings },
];

export default async function CollegeAdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Try the new college_memberships-based context first — it's the one every new feature (people
  // search, attendance scan, report cards, date-sheet wizard, directory messaging) is built against.
  const { context: newContext } = await requireCollegeContext('dashboard.read');
  if (newContext) {
    return (
      <div className="bg-background min-h-screen">
        <CollegeAdminSidebar
          organizationName={newContext.organization.name}
          organizationLogoUrl={newContext.organization.logo_url}
          role={newContext.membership.member_role}
          permissions={newContext.permissions}
          enabledModules={newContext.enabledModules}
        />
        <main className="min-w-0 p-4 pt-20 sm:p-6 sm:pt-20 lg:ml-64 lg:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    );
  }

  // Fall back to the legacy college_admins-based context — unchanged behavior for anyone not yet
  // provisioned under the new schema.
  const legacyContext = await getCollegeAdminContext(supabase, user.id);
  if (!legacyContext) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border bg-card/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl items-center gap-2 overflow-x-auto p-4">
          <span className="me-4 shrink-0 font-semibold">{legacyContext.college.name}</span>
          <nav className="flex items-center gap-1">
            {LEGACY_NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
      <main className="mx-auto max-w-5xl p-4 md:p-8">{children}</main>
    </div>
  );
}
