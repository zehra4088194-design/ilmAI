'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { listBiometricDevices, listInstitutionTeachersForAdmin, type InstitutionType } from '@/lib/biometric/actions';
import { BiometricDevicesPanel } from './BiometricDevicesPanel';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

// Platform-admin entry point for master prompt Part 8: "I can add this
// biometric to any school." Pick an institution type, pick the exact
// school/college, then the same BiometricDevicesPanel used on that
// institution's own attendance page renders here — the server actions behind
// it already authorize a platform admin for ANY organization_id.
export function AdminBiometricDevicesClient({
  schools,
  colleges,
}: {
  schools: Array<{ id: string; name: string }>;
  colleges: Array<{ id: string; name: string }>;
}) {
  const [institutionType, setInstitutionType] = useState<InstitutionType>('school');
  const [organizationId, setOrganizationId] = useState('');
  const [devices, setDevices] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<Array<{ id: string; name: string }>>([]);
  const [loading, setLoading] = useState(false);

  const options = institutionType === 'school' ? schools : colleges;

  useEffect(() => {
    setOrganizationId('');
    setDevices([]);
    setTeachers([]);
  }, [institutionType]);

  useEffect(() => {
    if (!organizationId) {
      setDevices([]);
      setTeachers([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    Promise.all([
      listBiometricDevices(institutionType, organizationId),
      listInstitutionTeachersForAdmin(institutionType, organizationId),
    ])
      .then(([deviceRows, teacherRows]) => {
        if (cancelled) return;
        setDevices(deviceRows);
        setTeachers(teacherRows);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [institutionType, organizationId]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          value={institutionType}
          onChange={(event) => setInstitutionType(event.target.value as InstitutionType)}
          className={selectClass}
        >
          <option value="school">School</option>
          <option value="college">College</option>
        </select>
        <select value={organizationId} onChange={(event) => setOrganizationId(event.target.value)} className={selectClass}>
          <option value="">Choose {institutionType}...</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
            </option>
          ))}
        </select>
      </div>

      {loading && (
        <p className="text-muted-foreground flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading...
        </p>
      )}

      {!loading && organizationId && (
        <BiometricDevicesPanel institutionType={institutionType} organizationId={organizationId} devices={devices} teachers={teachers} />
      )}
      {!organizationId && !loading && (
        <p className="text-muted-foreground text-sm">Choose an institution above to manage its biometric devices.</p>
      )}
    </div>
  );
}
