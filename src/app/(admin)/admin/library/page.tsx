import { Metadata } from 'next';
import { RestLibraryAdmin } from '@/components/features/admin/rest/RestLibraryAdmin';

export const metadata: Metadata = { title: 'Admin - Rest Library' };

export default function AdminRestLibraryPage() {
  return <RestLibraryAdmin />;
}
