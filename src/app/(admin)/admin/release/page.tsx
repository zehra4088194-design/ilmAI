import { Metadata } from 'next';
import { requireAdminUser } from '@/lib/admin/auth';
import { ReleaseReadiness } from '@/components/features/admin/ReleaseReadiness';

export const metadata: Metadata = { title: 'Admin - Release Readiness' };

export default async function AdminReleasePage() {
  const admin = await requireAdminUser();
  if (!admin) return <p className="p-6">Forbidden</p>;
  return <div className="mx-auto max-w-5xl space-y-5"><div><h1 className="text-2xl font-bold">Release Readiness</h1><p className="text-muted-foreground">Environment, database aur launch checks.</p></div><ReleaseReadiness /></div>;
}
