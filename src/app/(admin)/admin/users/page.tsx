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
          Kisi bhi user ko Pro/Elite monthly, yearly ya lifetime grant karo, ya wapas Free par revert karo.
        </p>
      </div>
      <UserManagementTable />
      <InstitutionInquiryTable />
      <InstitutionUsageTable />
    </div>
  );
}
