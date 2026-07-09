import { Metadata } from 'next';
import { ResourcesPage } from '@/components/features/admin/resources';

export const metadata: Metadata = { title: 'Admin - Resources' };

export default function AdminResourcesPage() {
  return <ResourcesPage />;
}
