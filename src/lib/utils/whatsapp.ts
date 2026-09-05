/**
 * Free wa.me deep link — opens WhatsApp (app or web) with a pre-composed message that a staff
 * member/parent still taps Send on themselves. Used for one-off manual "Chat on WhatsApp" buttons
 * in the UI. For automated server-sent WhatsApp (weekly reports, fee reminders, absence alerts,
 * leave decisions) see src/lib/whatsapp/brevo.ts instead, which sends through Brevo's WhatsApp
 * Business API with no tap required from the recipient's side.
 */
export function buildWhatsAppLink(phone: string | null | undefined, message: string): string | null {
  if (!phone) return null;
  // wa.me requires digits only, with country code, no leading +/0.
  let digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('0')) digits = `92${digits.slice(1)}`; // Pakistani local format (0300...) -> 92300...
  if (!digits) return null;
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
