import { Metadata } from 'next';
import { UserManagementTable } from '@/components/features/admin/UserManagementTable';

export const metadata: Metadata = { title: 'Admin - Users' };

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm">
          Users are listed here by name, role, current plan, and sign-up date. Click any user to manage their plan.
        </p>
      </div>
      <UserManagementTable />
    </div>
  );
}
