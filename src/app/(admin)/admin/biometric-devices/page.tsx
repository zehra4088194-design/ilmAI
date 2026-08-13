import { redirect } from 'next/navigation';
import { requireAdminUser } from '@/lib/admin/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { listInstitutionsForAdmin } from '@/lib/biometric/actions';
import { AdminBiometricDevicesClient } from '@/components/features/biometric/AdminBiometricDevicesClient';

export const metadata = { title: 'Biometric Devices | Admin | ilm AI' };

export default async function AdminBiometricDevicesPage() {
  const admin = await requireAdminUser();
  if (!admin) redirect('/login');

  const [schools, colleges] = await Promise.all([
    listInstitutionsForAdmin('school'),
    listInstitutionsForAdmin('college'),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold">Biometric devices (ZKTeco)</h1>
        <p className="text-muted-foreground text-sm">
          Register a ZKTeco device and map its punch cards to teachers for any school or college on the platform —
          each institution's own owner/admin can also manage their devices from their attendance page.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Manage devices</CardTitle>
        </CardHeader>
        <CardContent>
          <AdminBiometricDevicesClient schools={schools} colleges={colleges} />
        </CardContent>
      </Card>
    </div>
  );
}
