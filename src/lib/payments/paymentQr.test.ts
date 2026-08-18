import { describe, expect, it } from 'vitest';
import {
  buildPayloadWithExpiry,
  crc16CCITT,
  generatePaymentPayload,
  generatePaymentQR,
  getTodayExpiry,
  validateAmount,
  verifyCRC,
} from './paymentQr';

// Regression baseline: the exact QR the app owner personally tested and
// confirmed scans in the JazzCash/Easypaisa in-app scanner.
const KNOWN_WORKING_PAYLOAD =
  '0002020102120202000424PK53JCMA300392300108819405041109071219082026083210042F66';
const KNOWN_WORKING_AMOUNT = 1109;
const KNOWN_WORKING_EXPIRY = '190820260832'; // 19 Aug 2026, 08:32 PKT
const MERCHANT_ID = 'PK53JCMA3003923001088194';

describe('crc16CCITT', () => {
  it('reproduces the CRC from the known-working payload exactly', () => {
    const body = KNOWN_WORKING_PAYLOAD.slice(0, -4);
    expect(crc16CCITT(body)).toBe('2F66');
  });
});

describe('getTodayExpiry', () => {
  it('formats as DDMMYYYY2359 in Asia/Karachi regardless of the machine timezone', () => {
    // 2026-08-19T20:00:00Z is already 2026-08-20 01:00 in Karachi (UTC+5) —
    // exercises the timezone conversion, not just string formatting.
    const expiry = getTodayExpiry(new Date('2026-08-19T20:00:00Z'));
    expect(expiry).toBe('200820262359');
    expect(expiry).toHaveLength(12);
  });
});

describe('validateAmount', () => {
  it('accepts positive integers', () => {
    expect(validateAmount(1109)).toBe(1109);
    expect(validateAmount('1250')).toBe(1250);
  });

  it('rejects zero, negative, non-finite, and non-integer amounts', () => {
    expect(() => validateAmount(0)).toThrow();
    expect(() => validateAmount(-5)).toThrow();
    expect(() => validateAmount(NaN)).toThrow();
    expect(() => validateAmount(99.5)).toThrow();
  });
});

describe('buildPayloadWithExpiry — byte-for-byte regression against the known-working QR', () => {
  it('reproduces the exact known-working payload given its original amount and expiry', () => {
    const payload = buildPayloadWithExpiry(KNOWN_WORKING_AMOUNT, KNOWN_WORKING_EXPIRY);
    expect(payload).toBe(KNOWN_WORKING_PAYLOAD);
  });

  it('keeps the static merchant identifier and tag structure unchanged for a different amount', () => {
    const payload = buildPayloadWithExpiry(1250, KNOWN_WORKING_EXPIRY);

    expect(payload).toContain('04' + String(MERCHANT_ID.length).padStart(2, '0') + MERCHANT_ID);
    expect(payload).toContain('05041250'); // 05 + length(04) + amount
    expect(payload.slice(0, 6)).toBe('000202');
    expect(payload.slice(6, 12)).toBe('010212');
    expect(payload.slice(12, 18)).toBe('020200');
  });

  it('recalculates CRC per amount instead of reusing the known-working CRC', () => {
    const payload1109 = buildPayloadWithExpiry(1109, KNOWN_WORKING_EXPIRY);
    const payload1250 = buildPayloadWithExpiry(1250, KNOWN_WORKING_EXPIRY);

    expect(payload1109.slice(-4)).toBe('2F66');
    expect(payload1250.slice(-4)).not.toBe('2F66');
    expect(verifyCRC(payload1109)).toBe(true);
    expect(verifyCRC(payload1250)).toBe(true);
  });
});

describe('generatePaymentPayload — the production daily-QR builder', () => {
  it('embeds an Asia/Karachi 23:59 expiry, 12 characters long', () => {
    const payload = generatePaymentPayload(999, new Date('2026-08-19T10:00:00Z'));
    // 07 + length(12) + DDMMYYYY2359
    expect(payload).toContain('0712190820262359');
  });

  it('produces a payload whose CRC verifies and whose structure matches the known-working one', () => {
    const payload = generatePaymentPayload(1109, new Date('2026-08-19T10:00:00Z'));
    expect(verifyCRC(payload)).toBe(true);
    expect(payload).toContain('04' + String(MERCHANT_ID.length).padStart(2, '0') + MERCHANT_ID);
    expect(payload).toContain('05041109'); // 05 + length(04) + amount
  });

  it('throws on invalid amounts instead of silently encoding them', () => {
    expect(() => generatePaymentPayload(0)).toThrow();
    expect(() => generatePaymentPayload(-10)).toThrow();
    expect(() => generatePaymentPayload(10.5)).toThrow();
  });
});

describe('verifyCRC', () => {
  it('accepts the known-working payload as-is', () => {
    expect(verifyCRC(KNOWN_WORKING_PAYLOAD)).toBe(true);
  });

  it('rejects a payload whose CRC was tampered with', () => {
    const tampered = KNOWN_WORKING_PAYLOAD.slice(0, -4) + '0000';
    expect(verifyCRC(tampered)).toBe(false);
  });

  it('rejects a payload whose amount changed but CRC did not', () => {
    const tampered = KNOWN_WORKING_PAYLOAD.replace('1109', '9999');
    expect(verifyCRC(tampered)).toBe(false);
  });
});

describe('generatePaymentQR', () => {
  it('never hard-codes 1109 — the payload amount always tracks the argument', async () => {
    const referenceDate = new Date('2026-08-19T10:00:00Z');
    const qrA = await generatePaymentQR(1109, referenceDate);
    const qrB = await generatePaymentQR(1250, referenceDate);

    expect(qrA.payload).toBe(generatePaymentPayload(1109, referenceDate));
    expect(qrB.payload).not.toBe(qrA.payload);
    expect(qrB.amount).toBe(1250);
    expect(qrA.qrDataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(verifyCRC(qrA.payload)).toBe(true);
    expect(verifyCRC(qrB.payload)).toBe(true);
  });
});
