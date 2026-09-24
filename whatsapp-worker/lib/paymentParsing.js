/**
 * Pulls a JazzCash transaction ID and/or plan/claim code out of a free-text WhatsApp message.
 * Label-anchored first ("TID 123...", "CODE STU-PRO-M") since that's what the checkout pages ask
 * payers to write, with a loose fallback for the common case where someone just pastes the raw
 * value. Kept deliberately separate from the Next.js app's src/lib/payments/jazzcash.ts (which
 * does the actual verification) — this file only extracts candidate tokens; the app is the one
 * that decides whether they're valid.
 */

const TID_LABELLED_RE = /\bT\.?I\.?D\.?[:\-]?\s*([A-Za-z0-9]{6,20})\b/i;
const TID_BARE_RE = /\b(\d{9,20})\b/; // fallback: a long bare digit run, JazzCash TIDs are numeric.

const CODE_LABELLED_RE = /\bCODE[:\-]?\s*([A-Za-z0-9-]{6,10})\b/i;
// Bare fallback: either shape a valid code can take (STU-PRO-M / 8 hex chars) appearing anywhere.
const CODE_BARE_INDIVIDUAL_RE = /\b(STU|PAR|TCH|UNI)-(PRO|ELITE)-[MY]\b/i;
const CODE_BARE_INSTITUTION_RE = /\b([0-9A-F]{8})\b/i;

function extractTid(text) {
  const labelled = TID_LABELLED_RE.exec(text);
  if (labelled) return labelled[1];
  const bare = TID_BARE_RE.exec(text);
  return bare ? bare[1] : null;
}

function extractCode(text) {
  const labelled = CODE_LABELLED_RE.exec(text);
  if (labelled) return labelled[1];
  const individual = CODE_BARE_INDIVIDUAL_RE.exec(text);
  if (individual) return individual[0];
  const institution = CODE_BARE_INSTITUTION_RE.exec(text);
  return institution ? institution[1] : null;
}

module.exports = { extractTid, extractCode };
