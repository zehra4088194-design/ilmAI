import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { fetchDevicePunchLogs } from '@/lib/biometric/zkteco';

export const runtime = 'nodejs';
export const maxDuration = 60;

// Master prompt Part 8: runs on an external ~2-minute schedule (same
// CRON_SECRET convention as every other /api/cron/* route). Idempotent —
// re-running never creates duplicate rows (upsert on membership_id+date).
//
// DEPLOYMENT CONSTRAINT (flagged per the master prompt's explicit instruction,
// not silently assumed away): ZKTeco devices are LAN-local hardware. This
// route can only reach a device's IP if the box running this Next.js app is
// on the same network, or the device is port-forwarded/reachable from the
// public internet, or a small local bridge/agent relays it. A public cloud
// host with no such path to the school's LAN will fail every device with a
// connection-timeout `last_sync_error` — that failure is visible in the
// Biometric Devices admin tab, not silent.

const DEVICE_TABLES = [
  {
    institutionType: 'school' as const,
    devices: 'school_teacher_biometric_devices',
    mappings: 'school_teacher_biometric_mappings',
    memberships: 'school_memberships',
    attendance: 'school_staff_attendance',
  },
  {
    institutionType: 'college' as const,
    devices: 'college_teacher_biometric_devices',
    mappings: 'college_teacher_biometric_mappings',
    memberships: 'college_memberships',
    attendance: 'college_staff_attendance',
  },
];

function dateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

async function syncDevice(db: any, table: (typeof DEVICE_TABLES)[number], device: any) {
  const logs = await fetchDevicePunchLogs(device.device_ip, device.port);
  // First-ever sync: only import today's punches, not the device's entire
  // history — avoids backfilling months of old logs as "present today".
  const since = device.last_synced_at ? new Date(device.last_synced_at) : new Date(new Date().toDateString());
  const relevant = logs.filter((log) => log.recordTime >= since);
  if (!relevant.length) return { imported: 0 };

  const { data: mappings } = await db
    .from(table.mappings)
    .select('device_user_id, membership_id')
    .eq('device_id', device.id);
  const membershipByDeviceUserId = new Map<string, string>(
    (mappings || []).map((row: any) => [row.device_user_id, row.membership_id])
  );

  // Group punches by membership + calendar date, tracking earliest (check-in)
  // and latest (check-out) punch per day across this batch.
  const byKey = new Map<string, { membershipId: string; date: string; min: Date; max: Date }>();
  for (const log of relevant) {
    const membershipId = membershipByDeviceUserId.get(log.deviceUserId);
    if (!membershipId) continue; // Unmapped device User_ID — admin hasn't linked this punch card yet.
    const date = dateKey(log.recordTime);
    const key = `${membershipId}:${date}`;
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, { membershipId, date, min: log.recordTime, max: log.recordTime });
    } else {
      if (log.recordTime < existing.min) existing.min = log.recordTime;
      if (log.recordTime > existing.max) existing.max = log.recordTime;
    }
  }

  let imported = 0;
  for (const { membershipId, date, min, max } of byKey.values()) {
    const { data: existingRow } = await db
      .from(table.attendance)
      .select('check_in_at, check_out_at')
      .eq('membership_id', membershipId)
      .eq('attendance_date', date)
      .maybeSingle();
    const checkIn = existingRow?.check_in_at && new Date(existingRow.check_in_at) < min ? existingRow.check_in_at : min.toISOString();
    const checkOut = existingRow?.check_out_at && new Date(existingRow.check_out_at) > max ? existingRow.check_out_at : max.toISOString();

    const { data: membership } = await db.from(table.memberships).select('organization_id').eq('id', membershipId).maybeSingle();
    if (!membership) continue;

    const { error } = await db.from(table.attendance).upsert(
      {
        organization_id: membership.organization_id,
        membership_id: membershipId,
        attendance_date: date,
        status: 'present',
        check_in_at: checkIn,
        check_out_at: checkOut,
        remarks: 'Biometric device sync',
      },
      { onConflict: 'membership_id,attendance_date' }
    );
    if (!error) imported += 1;
  }
  return { imported };
}

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = (await createAdminClient()) as any;
  const results: Array<{ deviceId: string; institutionType: string; imported?: number; error?: string }> = [];

  for (const table of DEVICE_TABLES) {
    const { data: devices } = await db.from(table.devices).select('*');
    for (const device of devices || []) {
      try {
        const { imported } = await syncDevice(db, table, device);
        await db
          .from(table.devices)
          .update({ last_synced_at: new Date().toISOString(), last_sync_status: 'ok', last_sync_error: null })
          .eq('id', device.id);
        results.push({ deviceId: device.id, institutionType: table.institutionType, imported });
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown sync error';
        await db
          .from(table.devices)
          .update({ last_sync_status: 'error', last_sync_error: message.slice(0, 500) })
          .eq('id', device.id);
        results.push({ deviceId: device.id, institutionType: table.institutionType, error: message });
      }
    }
  }

  return NextResponse.json({ success: true, devicesSynced: results.length, results });
}
