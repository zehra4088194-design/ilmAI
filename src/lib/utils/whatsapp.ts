/**
 * Phase 7a — free wa.me deep links only, no WhatsApp Business API / Meta approval / paid service.
 * Opens WhatsApp (app or web) with a pre-composed message; the staff member/parent still taps
 * Send themselves. See buildWhatsAppLink usages for fee reminders, attendance alerts, and payment
 * confirmations.
 */
export function buildWhatsAppLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  // wa.me requires digits only, with country code, no leading +/0.
  let digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('0')) digits = `92${digits.slice(1)}`; // Pakistani local format (0300...) -> 92300...
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
