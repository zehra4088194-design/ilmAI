import { Metadata } from 'next';
import { UserManagementTable } from '@/components/features/admin/UserManagementTable';
export const metadata: Metadata = { title: 'Admin - Users' };

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm">
          Kisi bhi user ko free me Pro/Elite (lifetime) grant karo ya wapas Free par revert karo.
        </p>
      </div>
      <UserManagementTable />
    </div>
  );
}
