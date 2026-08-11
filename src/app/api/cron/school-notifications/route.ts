import { NextRequest, NextResponse } from 'next/server';
import { isEmailConfigured, sendEmail } from '@/lib/email/send';
import { sendPushNotification } from '@/lib/push/server';
import { createAdminClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Delivery = {
  id: string;
  recipient_id: string | null;
  recipient_address: string | null;
  channel: 'in_app' | 'email' | 'sms' | 'whatsapp' | 'push';
  attempts: number;
  // Automated reminders carry their own copy instead of pointing at an
  // announcement row that only exists to hold text.
  title: string | null;
  body: string | null;
  category: string | null;
  school_announcements: { title: string; body: string; priority: string } | null;
  profiles: { email: string | null; phone: string | null } | null;
};

function related<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? value[0] || null : value;
}

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[character]!
  );
}

async function sendWebhook(channel: 'sms' | 'whatsapp', delivery: Delivery, title: string, body: string) {
  const prefix = channel === 'sms' ? 'SCHOOL_SMS' : 'SCHOOL_WHATSAPP';
  const url = process.env[`${prefix}_WEBHOOK_URL`];
  const token = process.env[`${prefix}_WEBHOOK_TOKEN`];
  const address = delivery.recipient_address || related(delivery.profiles)?.phone;
  if (!url || !address) {
    return { skipped: true as const, reason: `${channel} provider or recipient address is not configured` };
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ to: address, title, message: body, channel }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`${channel} provider returned ${response.status}`);
  const result = await response.json().catch(() => ({}));
  return { providerReference: String(result.id || result.messageId || '') || null };
}

async function deliver(db: any, delivery: Delivery) {
  const announcement = related(delivery.school_announcements);
  const title = announcement?.title || delivery.title || '';
  const body = announcement?.body || delivery.body || '';
  if (!title || !body) throw new Error('This notification no longer has any content to send');

  if (delivery.channel === 'in_app') {
    if (!delivery.recipient_id) return { skipped: true as const, reason: 'Recipient is missing' };
    const { error } = await db.from('notifications').insert({
      user_id: delivery.recipient_id,
      type: 'SYSTEM',
      title,
      message: body,
      link: '/school',
    });
    if (error) throw new Error(error.message);
    return {};
  }
  if (delivery.channel === 'push') {
    if (!delivery.recipient_id) return { skipped: true as const, reason: 'Recipient is missing' };
    const result = await sendPushNotification({
      userId: delivery.recipient_id,
      title,
      message: body,
      link: '/school',
    });
    if ('skipped' in result) {
      return { skipped: true as const, reason: 'Firebase or push subscription is unavailable' };
    }
    if (!result.sent) throw new Error('Push provider did not accept the notification');
    return { providerReference: `${result.sent} device(s)` };
  }
  if (delivery.channel === 'email') {
    const address = delivery.recipient_address || related(delivery.profiles)?.email;
    if (!isEmailConfigured() || !address) {
      return { skipped: true as const, reason: 'SMTP or recipient email is not configured' };
    }
    const result = await sendEmail({
      to: address,
      subject: title,
      text: body,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body).replace(/\n/g, '<br>')}</p><p style="font-size:12px;color:#6b7280">School notification sent through ilm AI.</p></div>`,
    });
    return { providerReference: result.messageId };
  }
  return sendWebhook(delivery.channel, delivery, title, body);
}

// PTM reminders: notify the teacher, parent, and any linked guardians ~24h
// before a scheduled meeting. reminder_sent_at guards against duplicates
// across cron runs; no AI credits are involved (plain notification rows).
async function sendPtmReminders(db: any) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60_000).toISOString();
  const { data: meetings } = await db
    .from('school_ptm_requests')
    .select('id, organization_id, teacher_id, student_id, parent_id, starts_at, join_link, location')
    .in('status', ['approved', 'scheduled'])
    .not('starts_at', 'is', null)
    .is('reminder_sent_at', null)
    .gte('starts_at', now.toISOString())
    .lte('starts_at', windowEnd)
    .limit(200);

  let sent = 0;
  for (const meeting of meetings || []) {
    const { data: student } = await db.from('profiles').select('full_name').eq('id', meeting.student_id).maybeSingle();
    const studentName = student?.full_name || 'the student';
    const when = new Date(meeting.starts_at).toLocaleString();
    const where = meeting.join_link || meeting.location || 'the scheduled meeting details';

    const { data: guardians } = await db
      .from('school_guardians')
      .select('guardian_id')
      .eq('organization_id', meeting.organization_id)
      .eq('student_id', meeting.student_id)
      .eq('receives_alerts', true);
    const recipients = new Set<string>(
      [meeting.teacher_id, meeting.parent_id, ...(guardians || []).map((g: any) => g.guardian_id)].filter(Boolean)
    );

    for (const recipientId of recipients) {
      await db.from('notifications').insert({
        user_id: recipientId,
        type: 'REMINDER',
        title: 'PTM meeting reminder',
        message: `Parent-teacher meeting for ${studentName} is at ${when}. Details: ${where}`,
        link: '/school',
      });
    }
    await db.from('school_ptm_requests').update({ reminder_sent_at: new Date().toISOString() }).eq('id', meeting.id);
    sent++;
  }
  return { remindersSent: sent };
}

// ---------------------------------------------------------------
// AUTOMATED GUARDIAN REMINDERS
// Fee due / overdue and same-day absence are the two messages schools
// actually chase parents about by hand. These reuse the delivery queue that
// already exists for announcements, so nothing new has to be configured —
// and every row carries a dedupe_key, so re-running the cron cannot send the
// same reminder twice.
// ---------------------------------------------------------------
const REMINDER_DAYS_BEFORE_DUE = 3;

type QueuedReminder = {
  organization_id: string;
  recipient_id: string;
  channel: 'in_app' | 'whatsapp';
  category: string;
  dedupe_key: string;
  title: string;
  body: string;
};

function reminderChannels(): Array<'in_app' | 'whatsapp'> {
  // WhatsApp only when a provider webhook is actually configured, otherwise
  // every row would queue just to be skipped.
  return process.env.SCHOOL_WHATSAPP_WEBHOOK_URL ? ['in_app', 'whatsapp'] : ['in_app'];
}

/** Guardians who opted into alerts, plus the student, for each student id. */
async function alertRecipients(db: any, organizationId: string, studentIds: string[]) {
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

async function queueFeeReminders(db: any, today: string) {
  const dueSoon = new Date(Date.now() + REMINDER_DAYS_BEFORE_DUE * 86_400_000).toISOString().slice(0, 10);
  const { data: invoices } = await db
    .from('school_fee_invoices')
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
      const title = overdue ? 'School fee is overdue' : 'School fee due soon';
      const body = overdue
        ? `Voucher ${invoice.voucher_number} of ${outstanding.toLocaleString()} was due on ${invoice.due_date} and is still unpaid.`
        : `Voucher ${invoice.voucher_number} of ${outstanding.toLocaleString()} is due on ${invoice.due_date}.`;
      // Overdue reminders repeat monthly; due-soon reminders send once.
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
          });
        }
      }
    }
  }
  return queued;
}

async function queueAbsenceReminders(db: any, today: string) {
  const { data: records } = await db
    .from('school_attendance_records')
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
            title: 'Absent from school today',
            body: `${name} was marked absent on ${today}. Contact the school office if this is incorrect.`,
          });
        }
      }
    }
  }
  return queued;
}

async function queueSchoolReminders(db: any) {
  const today = new Date().toISOString().slice(0, 10);
  const queued = [...(await queueFeeReminders(db, today)), ...(await queueAbsenceReminders(db, today))];
  if (!queued.length) return { remindersQueued: 0 };

  // ignoreDuplicates + the dedupe unique index makes this safely re-runnable.
  const { error } = await db
    .from('school_notification_deliveries')
    .upsert(queued, { onConflict: 'organization_id,channel,dedupe_key', ignoreDuplicates: true });
  if (error) return { remindersQueued: 0, reminderError: error.message };
  return { remindersQueued: queued.length };
}

export async function GET(request: NextRequest) {
  if (request.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = (await createAdminClient()) as any;
  await db
    .from('school_fee_invoices')
    .update({ status: 'overdue', updated_at: new Date().toISOString() })
    .in('status', ['issued', 'partial'])
    .lt('due_date', new Date().toISOString().slice(0, 10));
  const staleProcessing = new Date(Date.now() - 15 * 60_000).toISOString();
  await db
    .from('school_notification_deliveries')
    .update({ status: 'failed', last_error: 'Recovered after an interrupted delivery attempt' })
    .eq('status', 'processing')
    .lt('scheduled_for', staleProcessing);

  const ptmStats = await sendPtmReminders(db);
  const reminderStats = await queueSchoolReminders(db);

  const { data, error } = await db
    .from('school_notification_deliveries')
    .select(
      'id, recipient_id, recipient_address, channel, attempts, title, body, category, school_announcements(title, body, priority), profiles!school_notification_deliveries_recipient_id_fkey(email, phone)'
    )
    .in('status', ['queued', 'failed'])
    .lte('scheduled_for', new Date().toISOString())
    .lt('attempts', 3)
    .order('scheduled_for')
    .limit(100);
  if (error) return NextResponse.json({ status: 'error', error: error.message }, { status: 500 });

  const stats = { sent: 0, skipped: 0, failed: 0 };
  for (const row of (data || []) as Delivery[]) {
    const attempts = Number(row.attempts || 0) + 1;
    const { data: claimed } = await db
      .from('school_notification_deliveries')
      .update({ status: 'processing', attempts, last_error: null })
      .eq('id', row.id)
      .in('status', ['queued', 'failed'])
      .select('id')
      .maybeSingle();
    if (!claimed) continue;

    try {
      const result = await deliver(db, row);
      const skipped = 'skipped' in result && result.skipped;
      await db
        .from('school_notification_deliveries')
        .update({
          status: skipped ? 'skipped' : 'sent',
          provider_reference: 'providerReference' in result ? result.providerReference : null,
          last_error: skipped && 'reason' in result ? result.reason : null,
          sent_at: skipped ? null : new Date().toISOString(),
        })
        .eq('id', row.id);
      skipped ? stats.skipped++ : stats.sent++;
    } catch (deliveryError) {
      const message = deliveryError instanceof Error ? deliveryError.message.slice(0, 500) : 'Delivery failed';
      await db
        .from('school_notification_deliveries')
        .update({
          status: 'failed',
          last_error: message,
          scheduled_for: new Date(Date.now() + Math.min(60, attempts * 10) * 60_000).toISOString(),
        })
        .eq('id', row.id);
      stats.failed++;
    }
  }
  return NextResponse.json({
    status: 'ok',
    processed: (data || []).length,
    ...stats,
    ...ptmStats,
    ...reminderStats,
  });
}
