/**
 * Unified "notify a user" helper — fetches whatever's missing from their `profiles` row via
 * Supabase, then fires Email (Brevo, src/lib/email/send.ts) and free-form WhatsApp (Baileys
 * worker, src/lib/whatsapp/baileys.ts) side by side. Server-only (uses the service-role client).
 *
 * Both channels are best-effort: a missing address/phone, an unconfigured provider, or a
 * provider error all degrade to `{ skipped: true, reason }` in the returned result instead of
 * throwing — this function is meant to be called from request paths (like sign-up) that must
 * complete even if notifications fail. If you need a send to be guaranteed as sent, don't use
 * this — call sendEmail()/sendBrevoWhatsApp() directly and handle the error yourself.
 *
 * WhatsApp here is the unofficial Baileys channel — non-critical notices only (see the header
 * comment in whatsapp-worker/index.js). For fee reminders, absence alerts, weekly reports, or
 * anything password/security-related, use src/lib/whatsapp/brevo.ts (Meta-approved) or email
 * instead, not this helper's WhatsApp leg.
 */

import { createServiceClient } from '@/lib/supabase/service';
import { isEmailConfigured, sendEmail } from '@/lib/email/send';
import { isBaileysWhatsAppConfigured, sendBaileysWhatsApp } from '@/lib/whatsapp/baileys';

type NotifyProfile = {
  email?: string | null;
  phone?: string | null;
  full_name?: string | null;
};

export type NotifyUserParams = {
  /** Looked up from `profiles` (email, phone, full_name) if `profile` isn't passed directly. */
  userId?: string;
  profile?: NotifyProfile;
  email?: { subject: string; html: string; text?: string };
  /** Free-form WhatsApp text — no template/approval needed, but see the scope note above. */
  whatsapp?: { message: string };
};

type ChannelResult = { skipped: true; reason: string } | { sent: true; messageId?: string | null };

export type NotifyUserResult = {
  email?: ChannelResult;
  whatsapp?: ChannelResult;
};

export async function notifyUser(params: NotifyUserParams): Promise<NotifyUserResult> {
  const result: NotifyUserResult = {};
  if (!params.email && !params.whatsapp) return result;

  let profile = params.profile;
  try {
    if (!profile && params.userId) {
      const db = createServiceClient() as any;
      const { data } = await db
        .from('profiles')
        .select('email, phone, full_name')
        .eq('id', params.userId)
        .maybeSingle();
      profile = data || undefined;
    }
  } catch (error) {
    // A failed lookup shouldn't stop the caller — just means neither channel has a target.
    console.error('[notifications] Failed to load profile for notifyUser:', error);
  }

  const jobs: Array<Promise<void>> = [];

  if (params.email) {
    jobs.push(
      (async () => {
        try {
          if (!isEmailConfigured() || !profile?.email) {
            result.email = { skipped: true, reason: 'Brevo is not configured or the profile has no email' };
            return;
          }
          const send = await sendEmail({
            to: profile.email,
            subject: params.email!.subject,
            html: params.email!.html,
            text: params.email!.text,
          });
          result.email = { sent: true, messageId: send.messageId };
        } catch (error) {
          // Never throw out of notifyUser — log and report as skipped instead.
          result.email = { skipped: true, reason: error instanceof Error ? error.message : 'Email send failed' };
          console.error('[notifications] Email send failed:', error);
        }
      })()
    );
  }

  if (params.whatsapp) {
    jobs.push(
      (async () => {
        try {
          if (!isBaileysWhatsAppConfigured() || !profile?.phone) {
            result.whatsapp = { skipped: true, reason: 'WhatsApp worker is not configured or the profile has no phone' };
            return;
          }
          const send = await sendBaileysWhatsApp({ to: profile.phone, message: params.whatsapp!.message });
          result.whatsapp = 'skipped' in send ? send : { sent: true, messageId: send.messageId };
        } catch (error) {
          result.whatsapp = { skipped: true, reason: error instanceof Error ? error.message : 'WhatsApp send failed' };
          console.error('[notifications] WhatsApp send failed:', error);
        }
      })()
    );
  }

  await Promise.all(jobs);
  return result;
}
