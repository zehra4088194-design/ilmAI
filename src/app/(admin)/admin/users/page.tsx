import { Metadata } from 'next';
import { UserManagementTable } from '@/components/features/admin/UserManagementTable';
import { InstitutionInquiryTable } from '@/components/features/admin/InstitutionInquiryTable';
import { InstitutionUsageTable } from '@/components/features/admin/InstitutionUsageTable';
export const metadata: Metadata = { title: 'Admin - Users' };

export default function AdminUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm">
          Grant any user Pro or Elite monthly, yearly, or lifetime access, or revert them to Free.
        </p>
      </div>
      <UserManagementTable />
      <InstitutionInquiryTable />
      <InstitutionUsageTable />
    </div>
  );
}
