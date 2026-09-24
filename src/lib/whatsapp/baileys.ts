/**
 * Free-form WhatsApp send through the standalone Baileys worker (whatsapp-worker/, PM2-managed on
 * the Oracle VPS — see whatsapp-worker/README.md). This is the UNOFFICIAL channel: no Meta
 * template approval needed, but the linked number can be banned at any time with no notice.
 * Reserved for non-critical notices only (sign-up greeting, broadcasts) — see
 * src/lib/notifications.ts. For anything that matters (fee reminders, absence alerts, password
 * reset) use src/lib/whatsapp/brevo.ts instead, which is Meta-approved and reliable.
 *
 * Every call here degrades to { skipped: true } instead of throwing — the worker being offline,
 * unconfigured, or mid-reconnect must never break the caller's request.
 */

export function isBaileysWhatsAppConfigured() {
  return Boolean(process.env.WHATSAPP_WORKER_URL);
}

/** Pakistani-friendly normalizer — same rule as src/lib/utils/whatsapp.ts and brevo.ts. */
function normalizePhone(phone: string) {
  let digits = phone.replace(/[^\d]/g, '');
  if (digits.startsWith('0')) digits = `92${digits.slice(1)}`;
  return digits;
}

export async function sendBaileysWhatsApp(params: {
  to: string | null | undefined;
  message: string;
}): Promise<{ skipped: true; reason: string } | { messageId: string | null }> {
  const workerUrl = process.env.WHATSAPP_WORKER_URL;
  if (!workerUrl) return { skipped: true, reason: 'WHATSAPP_WORKER_URL is not configured' };

  const digits = params.to ? normalizePhone(params.to) : '';
  if (!digits) return { skipped: true, reason: 'Recipient has no usable phone number' };

  try {
    const response = await fetch(`${workerUrl.replace(/\/$/, '')}/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.WHATSAPP_WORKER_SECRET
          ? { Authorization: `Bearer ${process.env.WHATSAPP_WORKER_SECRET}` }
          : {}),
      },
      body: JSON.stringify({ to: digits, message: params.message }),
      // The worker is on localhost/the same private network — a slow reply means it's stuck, not
      // that the request needs more time. Fail fast so a caller awaiting this never hangs.
      signal: AbortSignal.timeout(8_000),
    });
    const result = await response.json().catch(() => ({}) as Record<string, unknown>);
    if (!response.ok) {
      return { skipped: true, reason: (result as { error?: string })?.error || `Worker returned ${response.status}` };
    }
    if ((result as { skipped?: boolean }).skipped) {
      return { skipped: true, reason: (result as { reason?: string }).reason || 'Worker skipped the send' };
    }
    return { messageId: (result as { messageId?: string }).messageId ?? null };
  } catch (error) {
    // Worker unreachable (not running, network hiccup, VPS restart mid-deploy, ...) — this is the
    // exact "must not crash or block the main app" case from the integration spec.
    return { skipped: true, reason: error instanceof Error ? error.message : 'WhatsApp worker unreachable' };
  }
}
