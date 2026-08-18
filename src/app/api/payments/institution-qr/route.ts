import { NextRequest, NextResponse } from 'next/server';
import { generatePaymentQR, validateAmount } from '@/lib/payments/paymentQr';

// Institution plan checkout (InstitutionPaymentCheckout) needs the real scannable JazzCash/
// Easypaisa QR (amount + today's expiry embedded, same merchant account as the consumer
// checkout — 03001088194, confirmed intentional, not a mistake) rather than a plain-text QR of
// the phone number. The amount changes client-side (monthly/annual toggle), so this small route
// regenerates it on demand instead of baking one QR into a server component prop.
//
// NEVER reuse this for FeePaymentCheckout (school/college fee invoices) — that money goes to the
// institution's own account, not ilm AI's, and this route always encodes ilm AI's merchant id.
export async function GET(request: NextRequest) {
  const amountParam = request.nextUrl.searchParams.get('amount');
  try {
    const amount = validateAmount(amountParam || '');
    const { qrDataUrl } = await generatePaymentQR(amount);
    return NextResponse.json({ qrDataUrl });
  } catch {
    return NextResponse.json({ error: 'A valid whole-rupee amount is required.' }, { status: 400 });
  }
}
