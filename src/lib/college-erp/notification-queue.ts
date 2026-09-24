import { createServiceClient } from '@/lib/supabase/service';
import { createNotificationsIfEnabled } from '@/lib/notifications/preferences';
import { isWhatsAppConfigured } from '@/lib/whatsapp/brevo';

/**
 * College-side mirror of src/lib/school-erp/notification-queue.ts — same reminder pipeline
 * (fee / absence / weekly digest / leave decision), pointed at the college_* tables instead of
 * school_*. Kept as a literal duplicate rather than a shared generic module because that's the
 * existing pattern for this codebase's school<->college ERP split (see college-erp/actions.ts's
 * own "College-side mirror of..." comment) — a school-only change here never risks the college
 * cron, and vice versa.
 */

export type QueuedReminder = {
  organization_id: string;
  recipient_id: string;
  channel: 'in_app' | 'whatsapp' | 'push' | 'email';
  category: string;
  dedupe_key: string;
  title: string;
  body: string;
  reference_type?: string;
  reference_id?: string;
};

export function reminderChannels(): Array<'in_app' | 'whatsapp' | 'push'> {
  const channels: Array<'in_app' | 'whatsapp' | 'push'> = ['in_app', 'push'];
  if (isWhatsAppConfigured()) channels.push('whatsapp');
  return channels;
}

export function referenceLink(referenceType: string | null | undefined, referenceId: string | null | undefined) {
  if (referenceType === 'fee_invoice' && referenceId) return `/college/fees/${referenceId}`;
  return '/college';
}

/** Guardians who opted into alerts, plus the student, for each student id. */
export async function alertRecipients(db: any, organizationId: string, studentIds: string[]) {
  const map = new Map<string, Set<string>>();
  if (!studentIds.length) return map;
  const { data: guardians } = await db
    .from('college_guardians')
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
    const title = 'Absent from college today';
    const body = `${name} was marked absent on ${attendanceDate}. Contact the college office if this is incorrect.`;
    for (const recipientId of recipients.get(studentId) || []) {
      notifications.push({ user_id: recipientId, type: 'REMINDER', title, message: body, link: '/college' });
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

  await createNotificationsIfEnabled(db, 'attendanceAlerts', notifications as any);
  await db
    .from('college_notification_deliveries')
    .upsert(deliveryRows, { onConflict: 'organization_id,channel,dedupe_key', ignoreDuplicates: true });

  return { sent };
}

const REMINDER_DAYS_BEFORE_DUE = 3;

export async function queueFeeReminders(db: any, today: string) {
  const dueSoon = new Date(Date.now() + REMINDER_DAYS_BEFORE_DUE * 86_400_000).toISOString().slice(0, 10);
  const { data: invoices } = await db
    .from('college_fee_invoices')
    .select('id, organization_id, student_id, voucher_number, due_date, total_amount, paid_amount, status')
    .in('status', ['issued', 'partial', 'overdue'])
    .lte('due_date', dueSoon)
    .limit(500);
  if (!invoices?.length) return [];

  const byOrganization = new Map<string, any[]>();
  for (const invoice of invoices) {
    const list = byOrganization.get(invoice.organization_id) || [];
    list.push(invoice);
    byOrganization.set(invoice.organization_id, list);
  }

  const queued: QueuedReminder[] = [];
  for (const [organizationId, list] of byOrganization) {
    const recipients = await alertRecipients(
      db,
      organizationId,
      Array.from(new Set<string>(list.map((invoice: any) => String(invoice.student_id))))
    );
    for (const invoice of list) {
      const outstanding = Math.max(0, Number(invoice.total_amount || 0) - Number(invoice.paid_amount || 0));
      if (outstanding <= 0) continue;
      const overdue = invoice.due_date < today;
      const title = overdue ? 'College fee is overdue' : 'College fee due soon';
      const body = overdue
        ? `Voucher ${invoice.voucher_number} of ${outstanding.toLocaleString()} was due on ${invoice.due_date} and is still unpaid. Pay now: /college/fees/${invoice.id}`
        : `Voucher ${invoice.voucher_number} of ${outstanding.toLocaleString()} is due on ${invoice.due_date}. Pay now: /college/fees/${invoice.id}`;
      const stage = overdue ? `overdue:${today.slice(0, 7)}` : 'due';
      for (const recipientId of recipients.get(String(invoice.student_id)) || []) {
        for (const channel of reminderChannels()) {
          queued.push({
            organization_id: organizationId,
            recipient_id: recipientId,
            channel,
            category: 'fee_reminder',
            dedupe_key: `fee:${stage}:${invoice.id}:${recipientId}`,
            title,
            body,
            reference_type: 'fee_invoice',
            reference_id: invoice.id,
          });
        }
      }
    }
  }
  return queued;
}

export async function queueAbsenceReminders(db: any, today: string) {
  const { data: records } = await db
    .from('college_attendance_records')
    .select('organization_id, student_id, attendance_date')
    .eq('attendance_date', today)
    .eq('status', 'absent')
    .limit(500);
  if (!records?.length) return [];

  const byOrganization = new Map<string, any[]>();
  for (const record of records) {
    const list = byOrganization.get(record.organization_id) || [];
    list.push(record);
    byOrganization.set(record.organization_id, list);
  }

  const queued: QueuedReminder[] = [];
  for (const [organizationId, list] of byOrganization) {
    const studentIds = Array.from(new Set<string>(list.map((record: any) => String(record.student_id))));
    const recipients = await alertRecipients(db, organizationId, studentIds);
    const { data: students } = await db.from('profiles').select('id, full_name').in('id', studentIds);
    const nameById = new Map<string, string>((students || []).map((row: any) => [String(row.id), row.full_name]));

    for (const studentId of studentIds) {
      const name = nameById.get(studentId) || 'Your child';
      for (const recipientId of recipients.get(studentId) || []) {
        for (const channel of reminderChannels()) {
          queued.push({
            organization_id: organizationId,
            recipient_id: recipientId,
            channel,
            category: 'attendance_alert',
            dedupe_key: `absent:${studentId}:${today}:${recipientId}`,
            title: 'Absent from college today',
            body: `${name} was marked absent on ${today}. Contact the college office if this is incorrect.`,
          });
        }
      }
    }
  }
  return queued;
}

/** Weekly parent digest — see school-erp/notification-queue.ts's queueWeeklyReports for the design notes. */
export async function queueWeeklyReports(db: any, today: string) {
  const weekAgo = new Date(Date.parse(today) - 6 * 86_400_000).toISOString().slice(0, 10);
  const weekLabel = `${weekAgo}_${today}`;

  const { data: students } = await db
    .from('college_guardians')
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
      .from('college_attendance_records')
      .select('student_id, status')
      .eq('organization_id', organizationId)
      .in('student_id', studentIds)
      .gte('attendance_date', weekAgo)
      .lte('attendance_date', today);
    const { data: invoices } = await db
      .from('college_fee_invoices')
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

/** Leave request decision notifications — see school-erp/notification-queue.ts's queueLeaveNotifications. */
export async function queueLeaveNotifications(db: any) {
  const { data: requests } = await db
    .from('college_leave_requests')
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
    await db.from('college_leave_requests').update({ notified_at: new Date().toISOString() }).in('id', notifiedIds);
  }
  return queued;
}
