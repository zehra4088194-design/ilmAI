import { createServiceClient } from '@/lib/supabase/service';
import { createNotificationsIfEnabled } from '@/lib/notifications/preferences';

/**
 * Shared with src/app/api/cron/school-notifications/route.ts — extracted here (Phase 2a) so the
 * immediate real-time absence alert below and the nightly digest queue use the exact same
 * recipient-resolution and channel logic instead of two copies drifting apart.
 */

export type QueuedReminder = {
  organization_id: string;
  recipient_id: string;
  channel: 'in_app' | 'whatsapp' | 'push';
  category: string;
  dedupe_key: string;
  title: string;
  body: string;
  // Phase 2b: lets the notification deep-link into a specific record (e.g. a fee invoice) instead
  // of always landing on the generic /school shell — see the deep-link migration + deliver().
  reference_type?: string;
  reference_id?: string;
};

export function reminderChannels(): Array<'in_app' | 'whatsapp' | 'push'> {
  const channels: Array<'in_app' | 'whatsapp' | 'push'> = ['in_app', 'push'];
  // WhatsApp only when a provider webhook is actually configured, otherwise every row would queue
  // just to be skipped. Push already degrades gracefully on its own (sendPushNotification returns
  // {skipped: true} with no Firebase config / no device subscription) so it's always queued.
  if (process.env.SCHOOL_WHATSAPP_WEBHOOK_URL) channels.push('whatsapp');
  return channels;
}

export function referenceLink(referenceType: string | null | undefined, referenceId: string | null | undefined) {
  if (referenceType === 'fee_invoice' && referenceId) return `/school/fees/${referenceId}`;
  return '/school';
}

/** Guardians who opted into alerts, plus the student, for each student id. */
export async function alertRecipients(db: any, organizationId: string, studentIds: string[]) {
  const map = new Map<string, Set<string>>();
  if (!studentIds.length) return map;
  const { data: guardians } = await db
    .from('school_guardians')
    .select('student_id, guardian_id')
    .eq('organization_id', organizationId)
    .eq('receives_alerts', true)
    .in('student_id', studentIds);

  for (const studentId of studentIds) map.set(studentId, new Set([studentId]));
  for (const link of guardians || []) {
    map.get(String(link.student_id))?.add(String(link.guardian_id));
  }
  return map;
}

/**
 * Phase 2a — fires the moment a student is marked absent (from saveAttendance() or the offline
 * sync replay), instead of waiting for the next /api/cron/school-notifications run. Delivers
 * in-app + push immediately through the existing generic notification pipeline
 * (lib/notifications/preferences.ts), then also writes a 'sent' school_notification_deliveries row
 * using the SAME dedupe_key the nightly digest's queueAbsenceReminders() would generate for this
 * student/date/recipient/in_app-channel combination — so that job's
 * `upsert(..., { ignoreDuplicates: true })` naturally skips re-sending it, while a WhatsApp row (a
 * different channel, different dedupe row) can still be queued by that job as a secondary channel.
 */
export async function sendImmediateAttendanceAlerts(
  organizationId: string,
  attendanceDate: string,
  absentStudentIds: string[]
) {
  if (!absentStudentIds.length) return { sent: 0 };
  const db = createServiceClient() as any;

  const recipients = await alertRecipients(db, organizationId, absentStudentIds);
  const { data: students } = await db.from('profiles').select('id, full_name').in('id', absentStudentIds);
  const nameById = new Map<string, string>((students || []).map((row: any) => [String(row.id), row.full_name]));

  let sent = 0;
  const deliveryRows: Array<QueuedReminder & { status: 'sent'; sent_at: string }> = [];
  const notifications: Array<{ user_id: string; type: 'REMINDER'; title: string; message: string; link: string }> = [];

  for (const studentId of absentStudentIds) {
    const name = nameById.get(studentId) || 'Your child';
    const title = 'Absent from school today';
    const body = `${name} was marked absent on ${attendanceDate}. Contact the school office if this is incorrect.`;
    for (const recipientId of recipients.get(studentId) || []) {
      notifications.push({ user_id: recipientId, type: 'REMINDER', title, message: body, link: '/school' });
      deliveryRows.push({
        organization_id: organizationId,
        recipient_id: recipientId,
        channel: 'in_app',
        category: 'attendance_alert',
        dedupe_key: `absent:${studentId}:${attendanceDate}:${recipientId}`,
        title,
        body,
        status: 'sent',
        sent_at: new Date().toISOString(),
      });
      sent++;
    }
  }
  if (!notifications.length) return { sent: 0 };

  // 'attendanceAlerts' preference key (added alongside this feature) — reuses the existing
  // per-profile notification_preferences JSON + push delivery, same as every other guardian alert.
  await createNotificationsIfEnabled(db, 'attendanceAlerts', notifications as any);
  await db
    .from('school_notification_deliveries')
    .upsert(deliveryRows, { onConflict: 'organization_id,channel,dedupe_key', ignoreDuplicates: true });

  return { sent };
}
