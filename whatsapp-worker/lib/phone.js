/**
 * Pakistani-friendly phone normalizer — mirrors src/lib/utils/whatsapp.ts and
 * src/lib/whatsapp/brevo.ts on the Next.js side. Kept as a tiny standalone copy here (not an
 * import) because this worker is a separate deployable with its own node_modules/runtime, not
 * built by the Next.js toolchain — if you change the normalization rules, update all three.
 */

/** '03001234567' / '+923001234567' / '923001234567' -> '923001234567' (digits only, country code). */
function normalizeDigits(phone) {
  if (!phone) return '';
  let digits = String(phone).replace(/[^\d]/g, '');
  if (digits.startsWith('0')) digits = `92${digits.slice(1)}`;
  return digits;
}

/** Digits -> Baileys JID, e.g. '923001234567' -> '923001234567@s.whatsapp.net'. */
function toJid(phone) {
  const digits = normalizeDigits(phone);
  return digits ? `${digits}@s.whatsapp.net` : null;
}

/** '923001234567@s.whatsapp.net' -> '923001234567'. Also handles the rarer @lid form. */
function jidToDigits(jid) {
  if (!jid) return '';
  return String(jid).split('@')[0].split(':')[0].replace(/[^\d]/g, '');
}

/**
 * All the ways a Pakistani number might be stored in `profiles.phone` (we don't control how it
 * was entered), so an incoming-message lookup can match any of them with a plain `.in(...)`
 * query instead of a normalized column/index.
 */
function candidateStoredFormats(digits) {
  if (!digits) return [];
  const local = digits.startsWith('92') ? `0${digits.slice(2)}` : digits;
  const withCountryCode = digits.startsWith('92') ? digits : `92${digits.replace(/^0/, '')}`;
  return Array.from(new Set([digits, local, withCountryCode, `+${withCountryCode}`]));
}

module.exports = { normalizeDigits, toJid, jidToDigits, candidateStoredFormats };
