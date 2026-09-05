import { NextRequest, NextResponse } from 'next/server';

// Support phone/WhatsApp number lives ONLY in a server env var — never in a
// NEXT_PUBLIC_* var or a literal in client-bundled code — so it never appears
// in page HTML/JS that search engines crawl or that view-source can reveal.
// Buttons across the site link to this route instead of a raw tel:/wa.me href;
// the browser is redirected to the real number only at click-time.
const SUPPORT_PHONE = process.env.SUPPORT_CONTACT_PHONE || '+923480049900';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const via = searchParams.get('via');
  const text = searchParams.get('text') || '';

  if (via === 'whatsapp') {
    const number = SUPPORT_PHONE.replace(/[^\d]/g, '');
    const target = `https://wa.me/${number}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
    return NextResponse.redirect(target);
  }

  return NextResponse.redirect(`tel:${SUPPORT_PHONE}`);
}
