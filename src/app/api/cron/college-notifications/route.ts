import { NextRequest, NextResponse } from 'next/server';
import { isEmailConfigured, sendEmail } from '@/lib/email/send';
import { sendPushNotification } from '@/lib/push/server';
import { sendBrevoWhatsApp, type WhatsAppTemplateKind } from '@/lib/whatsapp/brevo';
import { createAdminClient } from '@/lib/supabase/server';
import {
  referenceLink,
  queueFeeReminders,
  queueAbsenceReminders,
  queueWeeklyReports,
  queueLeaveNotifications,
} from '@/lib/college-erp/notification-queue';

// College-side mirror of src/app/api/cron/school-notifications/route.ts — see that file for the
// full design notes (dedupe keys, delivery statuses, retry/backoff). Kept as a separate route
// (rather than one route branching on org type) so it can be wired into free-cron.yml as its own
// job and fail independently of the school cron.

export const runtime = 'nodejs';
export const maxDuration = 60;

type Delivery = {
  id: string;
  recipient_id: string | null;
  recipient_address: string | null;
  channel: 'in_app' | 'email' | 'sms' | 'whatsapp' | 'push';
  attempts: number;
  title: string | null;
  body: string | null;
  category: string | null;
  reference_type: string | null;
  reference_id: string | null;
  college_announcements: { title: string; body: string; priority: string } | null;
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

async function sendSmsWebhook(delivery: Delivery, title: string, body: string) {
  const url = process.env.COLLEGE_SMS_WEBHOOK_URL;
  const token = process.env.COLLEGE_SMS_WEBHOOK_TOKEN;
  const address = delivery.recipient_address || related(delivery.profiles)?.phone;
  if (!url || !address) {
    return { skipped: true as const, reason: 'sms provider or recipient address is not configured' };
  }
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ to: address, title, message: body, channel: 'sms' }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`sms provider returned ${response.status}`);
  const result = await response.json().catch(() => ({}));
  return { providerReference: String(result.id || result.messageId || '') || null };
}

const WHATSAPP_TEMPLATE_BY_CATEGORY: Record<string, WhatsAppTemplateKind> = {
  fee_reminder: 'fee_reminder',
  attendance_alert: 'absence_alert',
  weekly_report: 'weekly_report',
  leave_update: 'leave_update',
  announcement: 'announcement',
};

async function sendWhatsApp(delivery: Delivery, title: string, body: string) {
  const address = delivery.recipient_address || related(delivery.profiles)?.phone;
  const kind = WHATSAPP_TEMPLATE_BY_CATEGORY[delivery.category || ''];
  if (!address || !kind) {
    return { skipped: true as const, reason: 'No WhatsApp template is configured for this notification type' };
  }
  const result = await sendBrevoWhatsApp({ to: address, kind, templateParams: [title, body] });
  if ('skipped' in result) return result;
  return { providerReference: result.messageId };
}

async function deliver(db: any, delivery: Delivery) {
  const announcement = related(delivery.college_announcements);
  const title = announcement?.title || delivery.title || '';
  const body = announcement?.body || delivery.body || '';
  if (!title || !body) throw new Error('This notification no longer has any content to send');

  const link = referenceLink(delivery.reference_type, delivery.reference_id);

  if (delivery.channel === 'in_app') {
    if (!delivery.recipient_id) return { skipped: true as const, reason: 'Recipient is missing' };
    const { data: inserted, error } = await db
      .from('notifications')
      .insert({ user_id: delivery.recipient_id, type: 'SYSTEM', title, message: body, link })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return { notificationId: inserted?.id as string | undefined };
  }
  if (delivery.channel === 'push') {
    if (!delivery.recipient_id) return { skipped: true as const, reason: 'Recipient is missing' };
    const result = await sendPushNotification({ userId: delivery.recipient_id, title, message: body, link });
    if ('skipped' in result) return { skipped: true as const, reason: 'Firebase or push subscription is unavailable' };
    if (!result.sent) throw new Error('Push provider did not accept the notification');
    return { providerReference: `${result.sent} device(s)` };
  }
  if (delivery.channel === 'email') {
    const address = delivery.recipient_address || related(delivery.profiles)?.email;
    if (!isEmailConfigured() || !address) {
      return { skipped: true as const, reason: 'Brevo or recipient email is not configured' };
    }
    const result = await sendEmail({
      to: address,
      subject: title,
      text: body,
      html: `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827"><h2>${escapeHtml(title)}</h2><p>${escapeHtml(body).replace(/\n/g, '<br>')}</p><p style="font-size:12px;color:#6b7280">College notification sent through ilm AI.</p></div>`,
    });
    return { providerReference: result.messageId };
  }
  if (delivery.channel === 'whatsapp') return sendWhatsApp(delivery, title, body);
  return sendSmsWebhook(delivery, title, body);
}

async function sendPtmReminders(db: any) {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + 24 * 60 * 60_000).toISOString();
  const { data: meetings } = await db
    .from('college_ptm_requests')
    .select('id, organization_id, teacher_id, student_id, parent_id, starts_at, join_link, location')
    .in('status', ['approved', 'scheduled'])
    .not('starts_at', 'is', null)
    .is('reminder_sent_at', null)
    .gte('starts_at', now.toISOString())
    .lte('starts_at', windowEnd)
    .limit(200);
  // college_ptm_requests doesn't exist yet (school-only per docs/SCHOOL_COLLEGE_SEPARATION_TODO.md)
  // — this stays a no-op until that table is mirrored, same shape as the school cron so wiring it
  // up later is a one-line change.
  if (!meetings?.length) return { remindersSent: 0 };

  let sent = 0;
  for (const meeting of meetings) {
    const { data: student } = await db.from('profiles').select('full_name').eq('id', meeting.student_id).maybeSingle();
    const studentName = student?.full_name || 'the student';
    const when = new Date(meeting.starts_at).toLocaleString();
    const where = meeting.join_link || meeting.location || 'the scheduled meeting details';

    const { data: guardians } = await db
      .from('college_guardians')
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
        link: '/college',
      });
    }
    await db.from('college_ptm_requests').update({ reminder_sent_at: new Date().toISOString() }).eq('id', meeting.id);
    sent++;
  }
  return { remindersSent: sent };
}

async function queueCollegeReminders(db: any) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const queued = [
    ...(await queueFeeReminders(db, today)),
    ...(await queueAbsenceReminders(db, today)),
    ...(await queueLeaveNotifications(db)),
    ...(now.getDay() === 1 ? await queueWeeklyReports(db, today) : []),
  ];
  if (!queued.length) return { remindersQueued: 0 };

  const { error } = await db
    .from('college_notification_deliveries')
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
    .from('college_fee_invoices')
    .update({ status: 'overdue', updated_at: new Date().toISOString() })
    .in('status', ['issued', 'partial'])
    .lt('due_date', new Date().toISOString().slice(0, 10));
  const staleProcessing = new Date(Date.now() - 15 * 60_000).toISOString();
  await db
    .from('college_notification_deliveries')
    .update({ status: 'failed', last_error: 'Recovered after an interrupted delivery attempt' })
    .eq('status', 'processing')
    .lt('scheduled_for', staleProcessing);

  const ptmStats = await sendPtmReminders(db).catch(() => ({ remindersSent: 0 }));
  const reminderStats = await queueCollegeReminders(db);

  const { data, error } = await db
    .from('college_notification_deliveries')
    .select(
      'id, recipient_id, recipient_address, channel, attempts, title, body, category, reference_type, reference_id, college_announcements(title, body, priority), profiles!college_notification_deliveries_recipient_id_fkey(email, phone)'
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
      .from('college_notification_deliveries')
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
        .from('college_notification_deliveries')
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
        .from('college_notification_deliveries')
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
