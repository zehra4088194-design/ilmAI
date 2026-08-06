'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BarChart3,
  BookOpenCheck,
  Building2,
  CalendarCheck2,
  ClipboardList,
  GraduationCap,
  ListChecks,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  ReceiptText,
  Settings2,
  WalletCards,
  Users,
  X,
} from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils/cn';
import { switchSchoolOrganization } from '@/lib/school-erp/context-actions';
import type { SchoolPermission, SchoolRole } from '@/lib/school-erp/types';

const ITEMS: Array<{
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  permission: SchoolPermission;
}> = [
  { href: '/school-admin', label: 'Overview', icon: LayoutDashboard, permission: 'dashboard.read' },
  { href: '/school-admin/launchpad', label: 'Launchpad', icon: ListChecks, permission: 'dashboard.read' },
  { href: '/school-admin/people', label: 'People', icon: Users, permission: 'people.read' },
  { href: '/school-admin/admissions', label: 'Admissions', icon: ClipboardList, permission: 'admissions.read' },
  { href: '/school-admin/attendance', label: 'Attendance', icon: CalendarCheck2, permission: 'attendance.read' },
  { href: '/school-admin/exams', label: 'Exams & Results', icon: GraduationCap, permission: 'exams.read' },
  { href: '/school-admin/fees', label: 'Fees', icon: ReceiptText, permission: 'fees.read' },
  { href: '/school-admin/payroll', label: 'Payroll', icon: WalletCards, permission: 'payroll.read' },
  { href: '/school-admin/academics', label: 'Academics', icon: BookOpenCheck, permission: 'academics.read' },
  { href: '/school-admin/communication', label: 'Communication', icon: MessageSquareText, permission: 'communication.read' },
  { href: '/school-admin/reports', label: 'Reports', icon: BarChart3, permission: 'reports.read' },
  { href: '/school-admin/settings', label: 'Organization', icon: Settings2, permission: 'organization.manage' },
];

export function SchoolAdminSidebar({
  organizationName,
  organizationId,
  organizations,
  role,
  permissions,
}: {
  organizationName: string;
  organizationId: string;
  organizations: Array<{ id: string; name: string; role: SchoolRole; operations: boolean }>;
  role: SchoolRole;
  permissions: SchoolPermission[];
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const items = ITEMS.filter((item) => permissions.includes(item.permission));

  const content = (
    <div className="flex h-full flex-col">
      <div className="border-sidebar-border border-b p-5">
        <Link href="/school-admin" className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white">
            <Building2 className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="text-sidebar-foreground block truncate text-sm font-bold">{organizationName}</span>
            <span className="text-sidebar-foreground/50 block text-[11px] capitalize">{role.replace('_', ' ')}</span>
          </span>
        </Link>
        {organizations.filter((item) => item.operations).length > 1 && (
          <form action={switchSchoolOrganization} className="mt-3">
            <input type="hidden" name="return_to" value="/school-admin" />
            <label htmlFor="school-organization" className="sr-only">Active organization</label>
            <select
              id="school-organization"
              name="organization_id"
              defaultValue={organizationId}
              onChange={(event) => event.currentTarget.form?.requestSubmit()}
              className="border-sidebar-border bg-sidebar-accent text-sidebar-foreground h-9 w-full rounded-lg border px-2 text-xs"
            >
              {organizations.filter((item) => item.operations).map((item) => (
                <option key={item.id} value={item.id}>{item.name} ({item.role})</option>
              ))}
            </select>
          </form>
        )}
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const active = pathname === item.href || (item.href !== '/school-admin' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                  : 'text-sidebar-foreground/65 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-sidebar-border border-t p-3">
        <Link href="/school" className="text-sidebar-foreground/60 flex items-center gap-2 rounded-lg px-3 py-2 text-xs hover:bg-sidebar-accent">
          <BookOpenCheck className="h-4 w-4" />
          Open member portal
        </Link>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-lg lg:hidden"
        aria-label="Open school menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <aside className="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-40 hidden w-64 border-r lg:block">
        {content}
      </aside>
      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-50 bg-black/60 lg:hidden"
            onClick={() => setOpen(false)}
            aria-label="Close school menu"
          />
          <aside className="bg-sidebar border-sidebar-border fixed inset-y-0 left-0 z-[60] w-72 max-w-[88vw] border-r lg:hidden">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-sidebar-foreground/70 absolute top-3 right-3 rounded-lg p-2 hover:bg-sidebar-accent"
              aria-label="Close school menu"
            >
              <X className="h-5 w-5" />
            </button>
            {content}
          </aside>
        </>
      )}
    </>
  );
}
