import { createServiceClient } from '@/lib/supabase/service';
import { createNotificationsIfEnabled } from '@/lib/notifications/preferences';
import { isWhatsAppConfigured } from '@/lib/whatsapp/brevo';

/**
 * Shared with src/app/api/cron/school-notifications/route.ts — extracted here (Phase 2a) so the
 * immediate real-time absence alert below and the nightly digest queue use the exact same
 * recipient-resolution and channel logic instead of two copies drifting apart.
 */

export type QueuedReminder = {
  organization_id: string;
  recipient_id: string;
  channel: 'in_app' | 'whatsapp' | 'push' | 'email';
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
  // WhatsApp only when Brevo (API key + approved sender number) is actually configured, otherwise
  // every row would queue just to be skipped. Push already degrades gracefully on its own
  // (sendPushNotification returns {skipped: true} with no Firebase config / no device subscription)
  // so it's always queued.
  if (isWhatsAppConfigured()) channels.push('whatsapp');
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

/**
 * Weekly parent digest — attendance % and fee pending for the last 7 days, one row per active
 * student. Queued through the same school_notification_deliveries pipeline as every other
 * reminder (in_app / push always, whatsapp/email when configured), so the cron's existing
 * deliver() handles the actual send. Called only on Mondays by the cron route so it behaves like a
 * weekly job even though the underlying cron itself runs twice a day.
 */
export async function queueWeeklyReports(db: any, today: string) {
  const weekAgo = new Date(Date.parse(today) - 6 * 86_400_000).toISOString().slice(0, 10);
  const weekLabel = `${weekAgo}_${today}`;

  const { data: students } = await db
    .from('school_guardians')
    .select('organization_id, student_id')
    .eq('receives_alerts', true);
  if (!students?.length) return [];

  const byOrganization = new Map<string, Set<string>>();
  for (const row of students) {
    const set = byOrganization.get(row.organization_id) || new Set<string>();
    set.add(String(row.student_id));
    byOrganization.set(row.organization_id, set);
  }

  const queued: QueuedReminder[] = [];
  for (const [organizationId, studentIdSet] of byOrganization) {
    const studentIds = Array.from(studentIdSet);
    const recipients = await alertRecipients(db, organizationId, studentIds);
    const { data: studentProfiles } = await db.from('profiles').select('id, full_name').in('id', studentIds);
    const nameById = new Map<string, string>((studentProfiles || []).map((row: any) => [String(row.id), row.full_name]));

    const { data: attendance } = await db
      .from('school_attendance_records')
      .select('student_id, status')
      .eq('organization_id', organizationId)
      .in('student_id', studentIds)
      .gte('attendance_date', weekAgo)
      .lte('attendance_date', today);
    const { data: invoices } = await db
      .from('school_fee_invoices')
      .select('student_id, total_amount, paid_amount, status')
      .eq('organization_id', organizationId)
      .in('student_id', studentIds)
      .in('status', ['issued', 'partial', 'overdue']);

    const attendanceByStudent = new Map<string, { present: number; total: number }>();
    for (const record of attendance || []) {
      const bucket = attendanceByStudent.get(String(record.student_id)) || { present: 0, total: 0 };
      bucket.total++;
      if (record.status === 'present' || record.status === 'late') bucket.present++;
      attendanceByStudent.set(String(record.student_id), bucket);
    }
    const pendingByStudent = new Map<string, number>();
    for (const invoice of invoices || []) {
      const outstanding = Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
      pendingByStudent.set(
        String(invoice.student_id),
        (pendingByStudent.get(String(invoice.student_id)) || 0) + outstanding
      );
    }

    for (const studentId of studentIds) {
      const name = nameById.get(studentId) || 'Your child';
      const attendanceBucket = attendanceByStudent.get(studentId);
      const attendancePct = attendanceBucket?.total
        ? Math.round((attendanceBucket.present / attendanceBucket.total) * 100)
        : null;
      const pending = pendingByStudent.get(studentId) || 0;
      const attendanceLine =
        attendancePct === null ? 'No attendance recorded this week.' : `Attendance this week: ${attendancePct}%.`;
      const feeLine = pending > 0 ? `Fee pending: Rs ${pending.toLocaleString()}.` : 'No fee pending.';
      const title = `Weekly report for ${name}`;
      const body = `${attendanceLine} ${feeLine}`;

      for (const recipientId of recipients.get(studentId) || []) {
        for (const channel of reminderChannels()) {
          queued.push({
            organization_id: organizationId,
            recipient_id: recipientId,
            channel,
            category: 'weekly_report',
            dedupe_key: `weekly:${weekLabel}:${studentId}:${recipientId}`,
            title,
            body,
          });
        }
        // Weekly report also goes by email — email isn't in reminderChannels() (that gate is
        // whatsapp-specific) so it's queued explicitly here; deliver() skips it gracefully if
        // Brevo isn't configured.
        queued.push({
          organization_id: organizationId,
          recipient_id: recipientId,
          channel: 'email',
          category: 'weekly_report',
          dedupe_key: `weekly:${weekLabel}:${studentId}:${recipientId}`,
          title,
          body,
        });
      }
    }
  }
  return queued;
}

/**
 * Leave request decisions (approved/rejected) — notifies the requester plus, if the requester is a
 * student, their guardians. Polls reviewed_at is not null && notified_at is null so a decision is
 * announced exactly once no matter how many times the cron runs.
 */
export async function queueLeaveNotifications(db: any) {
  const { data: requests } = await db
    .from('school_leave_requests')
    .select('id, organization_id, requester_id, requester_type, starts_on, ends_on, status, reviewed_at')
    .in('status', ['approved', 'rejected'])
    .not('reviewed_at', 'is', null)
    .is('notified_at', null)
    .limit(200);
  if (!requests?.length) return [];

  const queued: QueuedReminder[] = [];
  const notifiedIds: string[] = [];
  for (const request of requests) {
    const recipients = new Set<string>([String(request.requester_id)]);
    if (request.requester_type === 'student') {
      const guardianMap = await alertRecipients(db, request.organization_id, [String(request.requester_id)]);
      for (const guardianId of guardianMap.get(String(request.requester_id)) || []) recipients.add(guardianId);
    }
    const verdict = request.status === 'approved' ? 'approved' : 'declined';
    const title = `Leave request ${verdict}`;
    const body = `Your leave request for ${request.starts_on} to ${request.ends_on} was ${verdict}.`;

    for (const recipientId of recipients) {
      for (const channel of reminderChannels()) {
        queued.push({
          organization_id: request.organization_id,
          recipient_id: recipientId,
          channel,
          category: 'leave_update',
          dedupe_key: `leave:${request.id}:${recipientId}`,
          title,
          body,
        });
      }
      queued.push({
        organization_id: request.organization_id,
        recipient_id: recipientId,
        channel: 'email',
        category: 'leave_update',
        dedupe_key: `leave:${request.id}:${recipientId}`,
        title,
        body,
      });
    }
    notifiedIds.push(request.id);
  }

  if (notifiedIds.length) {
    await db.from('school_leave_requests').update({ notified_at: new Date().toISOString() }).in('id', notifiedIds);
  }
  return queued;
}
