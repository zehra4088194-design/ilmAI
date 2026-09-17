import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { sendAdminNotification } from '@/lib/adminMail';
import { checkDailyLimit } from '@/lib/rate-limit';

// The standalone WhatsApp worker must never message a private CEO number.
// Instead it forwards admin-handoff details/media to this server endpoint,
// which uses the app's existing direct SMTP admin-notification path.
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024;

function requestFingerprint(request: NextRequest) {
  const address =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  return createHash('sha256').update(address).digest('hex').slice(0, 24);
}

function timingSafeTokenMatches(received: string, expected: string) {
  if (!received || !expected) return false;
  const receivedBuffer = Buffer.from(received);
  const expectedBuffer = Buffer.from(expected);
  return (
    receivedBuffer.length === expectedBuffer.length &&
    require('node:crypto').timingSafeEqual(receivedBuffer, expectedBuffer)
  );
}

export async function POST(request: NextRequest) {
  const expectedSecret = process.env.WHATSAPP_WORKER_SECRET || '';
  const receivedSecret = request.headers.get('x-whatsapp-worker-secret') || '';

  if (!timingSafeTokenMatches(receivedSecret, expectedSecret)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const rateLimit = await checkDailyLimit(
    requestFingerprint(request),
    'erp_mutation:whatsapp-admin-handoff',
    30
  );
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many notifications.' }, { status: 429 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Invalid multipart request.' }, { status: 400 });
  }

  const senderNumber = String(form.get('senderNumber') || '').trim().slice(0, 80);
  const senderName = String(form.get('senderName') || '').trim().slice(0, 120);
  const topic = String(form.get('topic') || '').trim().slice(0, 240);
  const message = String(form.get('message') || '').trim().slice(0, 6000);
  const conversation = String(form.get('conversation') || '').trim().slice(0, 20000);
  const requestedAction = String(form.get('requestedAction') || 'Admin/CEO contact').trim().slice(0, 160);
  const attachment = form.get('attachment');

  if (!senderNumber || (!topic && !message && !conversation)) {
    return NextResponse.json({ error: 'Sender number and handoff context are required.' }, { status: 400 });
  }

  const attachments: { filename: string; content: Buffer; contentType?: string }[] = [];
  if (attachment instanceof File && attachment.size > 0) {
    if (attachment.size > MAX_ATTACHMENT_BYTES) {
      return NextResponse.json({ error: 'Attachment is too large (max 8MB).' }, { status: 400 });
    }
    attachments.push({
      filename: attachment.name || 'whatsapp-attachment',
      content: Buffer.from(await attachment.arrayBuffer()),
      contentType: attachment.type || 'application/octet-stream',
    });
  }

  const recipient =
    process.env.WHATSAPP_ADMIN_EMAIL ||
    process.env.CONTACT_EMAIL ||
    process.env.SUGGESTION_EMAIL ||
    'ilmai.study1@gmail.com';

  try {
    await sendAdminNotification({
      to: recipient,
      subject: `[ilm AI WhatsApp] ${topic || requestedAction}`,
      fields: {
        'Sender number': senderNumber,
        'Sender name': senderName,
        'Requested action': requestedAction,
        Topic: topic,
        Message: message,
        Conversation: conversation,
      },
      attachments,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('WhatsApp admin handoff email failed:', error);
    return NextResponse.json({ error: 'Could not deliver the admin notification.' }, { status: 502 });
  }
}
