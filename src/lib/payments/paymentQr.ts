import QRCode from 'qrcode';

// Server-side generator for the dynamic JazzCash/Easypaisa-scannable payment QR
// used on the manual wallet checkout ([tier]/page.tsx -> ManualUpgradePage).
//
// The payload FORMAT below (tags 00/01/02/04/05/07/10 + CRC-16/CCITT-FALSE) and
// the static merchant identifier are taken verbatim from a QR the app owner
// personally tested and confirmed scans successfully in the JazzCash/Easypaisa
// in-app scanner (amount 1109, expiry 190820260832 -> payload
// "0002020102120202000424PK53JCMA300392300108819405041109071219082026083210042F66",
// CRC 2F66 — re-verified against crc16CCITT() below, matches exactly). Do not
// change the tag structure or MERCHANT_ID; only `amount` and `expiry` are meant
// to vary per call, and CRC is always recalculated from the resulting body.

const MERCHANT_ID = 'PK53JCMA3003923001088194';

/** CRC-16/CCITT-FALSE — the exact algorithm the known-working QR was signed with. */
export function crc16CCITT(text: string): string {
  let crc = 0xffff;

  for (let i = 0; i < text.length; i++) {
    crc ^= text.charCodeAt(i) << 8;

    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc.toString(16).toUpperCase().padStart(4, '0');
}

/** Today's Pakistan-time expiry, DDMMYYYY2359 — never trusts the server's local timezone. */
export function getTodayExpiry(referenceDate: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Karachi',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).formatToParts(referenceDate);

  const get = (type: string) => parts.find((p) => p.type === type)?.value || '';

  return `${get('day')}${get('month')}${get('year')}2359`;
}

/** The known-working QR's amount field was a whole-rupee integer; keep that invariant. */
export function validateAmount(amount: number | string): number {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error('Invalid payment amount');
  }
  if (!Number.isInteger(value)) {
    throw new Error('Payment amount must be an integer');
  }

  return value;
}

/**
 * Rebuilds the exact tag/length/value structure of the known-working payload
 * for an arbitrary already-formatted DDMMYYYYHHMM expiry string, then
 * recalculates CRC (10) — never reuses a previously-computed CRC. Exported
 * separately from generatePaymentPayload() purely so tests can reproduce the
 * known-working payload's original 08:32 expiry exactly; production code
 * should call generatePaymentPayload(), which always uses 23:59 per spec.
 */
export function buildPayloadWithExpiry(amount: number | string, expiry: string): string {
  const validAmount = validateAmount(amount);
  const normalizedAmount = String(validAmount);

  const payloadWithoutCRC =
    '000202' +
    '010212' +
    '020200' +
    '04' +
    String(MERCHANT_ID.length).padStart(2, '0') +
    MERCHANT_ID +
    '05' +
    String(normalizedAmount.length).padStart(2, '0') +
    normalizedAmount +
    '07' +
    String(expiry.length).padStart(2, '0') +
    expiry +
    '1004';

  return payloadWithoutCRC + crc16CCITT(payloadWithoutCRC);
}

/** Always expires today (Asia/Karachi) at 23:59 — the daily-QR behavior. */
export function generatePaymentPayload(amount: number | string, referenceDate?: Date): string {
  return buildPayloadWithExpiry(amount, getTodayExpiry(referenceDate));
}

/** Recomputes CRC over everything but the last 4 chars and compares. */
export function verifyCRC(payload: string): boolean {
  if (typeof payload !== 'string' || payload.length < 8) return false;

  const suppliedCRC = payload.slice(-4);
  const dataWithoutCRC = payload.slice(0, -4);

  return crc16CCITT(dataWithoutCRC) === suppliedCRC;
}

export async function generatePaymentQR(amount: number | string, referenceDate?: Date) {
  const payload = generatePaymentPayload(amount, referenceDate);

  const qrDataUrl = await QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M',
    margin: 5,
    width: 800,
    color: { dark: '#000000', light: '#ffffff' },
  });

  return { payload, qrDataUrl, amount: validateAmount(amount) };
}
