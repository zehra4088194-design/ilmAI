'use client';

import { useActionState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  createBiometricDevice,
  createBiometricMapping,
  deleteBiometricDevice,
  deleteBiometricMapping,
  type BiometricActionState,
  type InstitutionType,
} from '@/lib/biometric/actions';

const selectClass = 'border-input bg-background h-10 w-full rounded-lg border px-3 text-sm';

function ActionFormButton({
  action,
  hiddenFields,
  submitLabel,
  variant = 'gradient',
}: {
  action: (state: BiometricActionState, formData: FormData) => Promise<BiometricActionState>;
  hiddenFields: Record<string, string>;
  submitLabel: string;
  variant?: 'gradient' | 'outline';
}) {
  const [state, formAction, pending] = useActionState<BiometricActionState, FormData>(action, {
    success: false,
    message: '',
  });
  return (
    <form action={formAction} className="flex items-center gap-2">
      {Object.entries(hiddenFields).map(([key, value]) => (
        <input key={key} type="hidden" name={key} value={value} />
      ))}
      <Button type="submit" size="sm" variant={variant} disabled={pending}>
        {pending ? '...' : submitLabel}
      </Button>
      {state.message && !state.success && <p className="text-xs text-red-500">{state.message}</p>}
    </form>
  );
}

function MappingForm({
  institutionType,
  organizationId,
  deviceId,
  teachers,
}: {
  institutionType: InstitutionType;
  organizationId: string;
  deviceId: string;
  teachers: Array<{ id: string; name: string }>;
}) {
  const boundAction = createBiometricMapping.bind(null, institutionType);
  const [state, formAction, pending] = useActionState<BiometricActionState, FormData>(boundAction, {
    success: false,
    message: '',
  });
  return (
    <form action={formAction} className="grid grid-cols-[1fr_1fr_auto] gap-2">
      <input type="hidden" name="organization_id" value={organizationId} />
      <input type="hidden" name="device_id" value={deviceId} />
      <Input name="device_user_id" placeholder="Punch card User ID" required />
      <select name="membership_id" className={selectClass} required>
        <option value="">Teacher</option>
        {teachers.map((teacher) => (
          <option key={teacher.id} value={teacher.id}>
            {teacher.name}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={pending}>
        Map
      </Button>
      {state.message && <p className="col-span-3 text-xs" style={{ color: state.success ? '#059669' : '#ef4444' }}>{state.message}</p>}
    </form>
  );
}

// Master prompt Part 8 admin UI: register a device (IP/port), map its numeric
// User_IDs to teachers, see last-sync status/health. The actual punch-log pull
// happens on the /api/cron/biometric-attendance-sync schedule, not from here —
// this panel is registration/mapping only.
//
// Reused from TWO places: a school/college's own /school-admin or
// /college-admin attendance page (self-service, scoped to that org only), and
// the platform admin's /admin/biometric-devices page (any org, org picked from
// a dropdown there) — the server actions this calls authorize either caller.
export function BiometricDevicesPanel({
  institutionType,
  organizationId,
  devices,
  teachers,
}: {
  institutionType: InstitutionType;
  organizationId: string;
  devices: any[];
  teachers: Array<{ id: string; name: string }>;
}) {
  const boundCreateDevice = createBiometricDevice.bind(null, institutionType);
  const [createState, createAction, creating] = useActionState<BiometricActionState, FormData>(boundCreateDevice, {
    success: false,
    message: '',
  });
  const mappingKey = institutionType === 'school' ? 'school_teacher_biometric_mappings' : 'college_teacher_biometric_mappings';

  return (
    <div className="space-y-4">
      <form action={createAction} className="grid gap-2 sm:grid-cols-4">
        <input type="hidden" name="organization_id" value={organizationId} />
        <Input name="name" placeholder="Device name (e.g. Staff Room)" required />
        <Input name="device_ip" placeholder="Device LAN IP (e.g. 192.168.1.201)" required />
        <Input name="port" type="number" defaultValue={4370} placeholder="Port" />
        <Button type="submit" disabled={creating}>
          {creating ? 'Adding...' : 'Register device'}
        </Button>
      </form>
      {createState.message && (
        <p className={createState.success ? 'text-xs text-emerald-600' : 'text-xs text-red-500'}>{createState.message}</p>
      )}
      <p className="text-muted-foreground text-xs">
        The device must be reachable on the same network as this server (LAN, port-forwarded, or via a local bridge
        agent) for the sync job to connect — see the cron route's deployment note if syncs keep erroring.
      </p>

      {devices.length === 0 && <p className="text-muted-foreground text-sm">No biometric devices registered yet.</p>}
      {devices.map((device) => (
        <div key={device.id} className="border-border space-y-3 rounded-lg border p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">
                {device.name} <span className="text-muted-foreground font-normal">({device.device_ip}:{device.port})</span>
              </p>
              <p className="text-muted-foreground text-xs">
                {device.last_synced_at ? `Last synced ${new Date(device.last_synced_at).toLocaleString()}` : 'Never synced'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={device.last_sync_status === 'ok' ? 'secondary' : device.last_sync_status === 'error' ? 'destructive' : 'outline'}>
                {device.last_sync_status}
              </Badge>
              <ActionFormButton
                action={deleteBiometricDevice.bind(null, institutionType)}
                hiddenFields={{ id: device.id, organization_id: organizationId }}
                submitLabel="Remove"
                variant="outline"
              />
            </div>
          </div>
          {device.last_sync_error && <p className="text-xs text-red-500">{device.last_sync_error}</p>}
          <div className="space-y-2">
            {(device[mappingKey] || []).map((mapping: any) => (
              <div key={mapping.id} className="bg-muted/30 flex items-center justify-between gap-2 rounded-md px-3 py-1.5 text-xs">
                <span>
                  Punch card <strong>{mapping.device_user_id}</strong> &rarr;{' '}
                  {teachers.find((teacher) => teacher.id === mapping.membership_id)?.name || 'Unknown teacher'}
                </span>
                <ActionFormButton
                  action={deleteBiometricMapping.bind(null, institutionType)}
                  hiddenFields={{ id: mapping.id, organization_id: organizationId }}
                  submitLabel="Unmap"
                  variant="outline"
                />
              </div>
            ))}
            <MappingForm institutionType={institutionType} organizationId={organizationId} deviceId={device.id} teachers={teachers} />
          </div>
        </div>
      ))}
    </div>
  );
}
