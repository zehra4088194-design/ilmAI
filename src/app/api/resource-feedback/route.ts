import { createHash } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isEmailConfigured, sendEmail } from '@/lib/email/send';
import { checkDailyLimit } from '@/lib/rate-limit';

// Destination for "report a mistake / suggestion" submissions on resources (PDFs, notes, etc.)
// — server-only, deliberately NOT NEXT_PUBLIC_*. Sent straight through Brevo from the SERVER
// (not the browser), so this address never appears in any client-bundled JS/HTML. See
// src/components/features/resources/ResourceMistakeReportForm for the client side.
const MISTAKE_REPORT_EMAIL = process.env.MISTAKE_REPORT_EMAIL || 'ilmai.study1@gmail.com';

function escapeHtml(value: string) {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;',
      })[character] || character
  );
}

const feedbackSchema = z.object({
  kind: z.enum(['mistake', 'suggestion']).optional().default('mistake'),
  resourceTitle: z.string().trim().min(1).max(200),
  resourceId: z.string().trim().min(1).max(200),
  message: z.string().trim().min(1).max(4000),
  page: z.string().trim().max(500).optional().default(''),
});

function requestFingerprint(request: NextRequest) {
  const address =
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-real-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    'unknown';
  return createHash('sha256').update(address).digest('hex').slice(0, 24);
}

export async function POST(request: NextRequest) {
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request.' }, { status: 400 });
  }

  const parsed = feedbackSchema.safeParse(input);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Enter a message before sending.' }, { status: 400 });
  }

  const rateLimit = await checkDailyLimit(requestFingerprint(request), 'erp_mutation:resource-feedback', 20);
  if (!rateLimit.success) {
    return NextResponse.json({ error: 'Too many reports sent from this connection today.' }, { status: 429 });
  }

  const { kind, resourceTitle, resourceId, message, page } = parsed.data;
  const kindLabel = kind === 'suggestion' ? 'Suggestion' : 'Mistake report';

  if (!isEmailConfigured()) {
    console.error('Resource feedback delivery failed: BREVO_API_KEY/EMAIL_FROM not configured');
    return NextResponse.json({ error: 'Could not deliver the report. Please try again later.' }, { status: 503 });
  }

  const safeResourceTitle = escapeHtml(resourceTitle);
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, '<br />');
  const safePage = escapeHtml(page);

  try {
    await sendEmail({
      to: MISTAKE_REPORT_EMAIL,
      // Subject line alone tells the reader which PDF this is about, without opening the email.
      subject: `[ilm AI] ${kindLabel}: ${resourceTitle}`,
      text: `Type: ${kindLabel}\nResource (PDF): ${resourceTitle}\nResource ID: ${resourceId}\nPage URL: ${page}\n\n${message}`,
      html: `
        <div style="font-family:Arial,sans-serif;line-height:1.6;color:#111827">
          <h2>ilm AI ${kindLabel}</h2>
          <p><strong>Resource (PDF):</strong> ${safeResourceTitle}</p>
          <p><strong>Resource ID:</strong> ${escapeHtml(resourceId)}</p>
          ${safePage ? `<p><strong>Page URL:</strong> ${safePage}</p>` : ''}
          <hr style="border:0;border-top:1px solid #e5e7eb" />
          <p>${safeMessage}</p>
        </div>
      `,
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Resource feedback delivery failed:', error);
    return NextResponse.json({ error: 'Could not deliver the report. Please try again.' }, { status: 502 });
  }
}
