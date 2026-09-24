import { redirect } from 'next/navigation';
import { AdminSidebar } from '@/components/layout/AdminSidebar';
import { requireAdminUser } from '@/lib/admin/auth';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminUser();
  if (!admin) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-background flex">
      <AdminSidebar />
      <main className="flex-1 lg:ml-64 p-4 pt-20 md:p-8 md:pt-20 lg:pt-8">{children}</main>
    </div>
  );
}
