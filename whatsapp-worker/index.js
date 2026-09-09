/**
 * ilm AI — standalone WhatsApp bot worker (Baileys).
 *
 * WHY A SEPARATE PROCESS: Next.js API routes are request-scoped and die between calls, so they
 * can't hold a persistent WhatsApp Web socket. This file is a small, always-on Node process that
 * runs next to (not inside) the Next.js app on the Oracle VPS, kept alive by PM2 — see
 * ecosystem.config.js at the repo root. The Next app never imports Baileys; it talks to this
 * worker over a tiny local-only HTTP API (see the `http` server below), and this worker talks to
 * Supabase directly with the service-role key to resolve who's messaging in.
 *
 * SCOPE (by design, agreed with the project owner): this bot sends free-form, non-critical
 * WhatsApp notices only — sign-up greetings, broadcasts, and auto-replies to incoming chats.
 * Password resets and anything security-sensitive stay on the existing Supabase/Brevo email
 * flow (src/app/api/auth/recovery/route.ts) — an unofficial WhatsApp client can get its number
 * banned by Meta at any time with no notice, which is not a channel you want your only path to
 * a locked-out account riding on.
 *
 * RESILIENCE: every Baileys call is wrapped in try/catch. A dropped/offline WhatsApp session
 * degrades to `{ skipped: true }` on the HTTP API instead of throwing, and the socket
 * auto-reconnects on its own (see connection.update below) unless it was actually logged out, in
 * which case it prints a fresh QR and waits for a re-scan. Nothing in here can crash or block the
 * main Next.js app — worst case, WhatsApp sends silently stop while email/in-app notifications
 * keep working.
 */

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const http = require('http');
const pino = require('pino');
const qrcodeTerminal = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
  DisconnectReason,
} = require('@whiskeysockets/baileys');
const { toJid, jidToDigits, candidateStoredFormats } = require('./lib/phone');
const { extractTid, extractCode } = require('./lib/paymentParsing');

const PORT = Number(process.env.WHATSAPP_WORKER_PORT || 4310);
// Bound to loopback only (127.0.0.1) further down — this secret is a second layer, required on
// every /send request so nothing else on the box (or a container escape) can send WhatsApp
// messages through this process without it.
const WORKER_SECRET = process.env.WHATSAPP_WORKER_SECRET || '';
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || './auth_info_baileys';

// Where the Next.js app lives — used ONLY for the JazzCash cross-match call below (POST
// /api/payments/jazzcash/verify). Reuses WHATSAPP_WORKER_SECRET as a mutual secret: the app
// already trusts requests bearing it (see src/app/api/payments/jazzcash/verify/route.ts).
const APP_BASE_URL = (process.env.WHATSAPP_APP_BASE_URL || '').replace(/\/$/, '');
const PAYMENT_PROOF_BUCKET = 'jazzcash-payment-proofs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null;

const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL || 'warn' });

/** Mutable handle to the live socket + connection state, read by the HTTP API below. */
const state = { sock: null, connected: false, startingUp: true };

// Per-phone "in progress" JazzCash payment claim — a TID, a plan/claim code, and/or a pending
// screenshot buffer, accumulated across however many messages it takes the payer to send all of
// it. In-memory only (single-process worker): a VPS restart mid-conversation just means the payer
// re-sends, which is an acceptable trade for not needing a DB round trip on every keystroke.
const pendingPaymentClaims = new Map(); // digits -> { tid, code, image: {buffer, mimetype} | null, updatedAt }
const PENDING_CLAIM_TTL_MS = 30 * 60 * 1000;

function getPendingClaim(digits) {
  const existing = pendingPaymentClaims.get(digits);
  if (existing && Date.now() - existing.updatedAt > PENDING_CLAIM_TTL_MS) {
    pendingPaymentClaims.delete(digits);
    return null;
  }
  return existing || null;
}

function touchPendingClaim(digits, patch) {
  const current = getPendingClaim(digits) || { tid: null, code: null, image: null, updatedAt: 0 };
  const next = { ...current, ...patch, updatedAt: Date.now() };
  pendingPaymentClaims.set(digits, next);
  return next;
}

if (!WORKER_SECRET) {
  console.warn(
    '[whatsapp-worker] WHATSAPP_WORKER_SECRET is not set — /send is unauthenticated. Set it in ' +
      'whatsapp-worker/.env (and the matching WHATSAPP_WORKER_SECRET in the Next.js app env) before ' +
      'exposing this beyond localhost.'
  );
}
if (!supabase) {
  console.warn(
    '[whatsapp-worker] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing — incoming-message lookups ' +
      'and logging are disabled; the bot will still send/receive but replies stay generic.'
  );
}

// ---------------------------------------------------------------------------------------------
// Connection lifecycle — self-healing reconnect, QR-to-terminal on first run / after logout.
// ---------------------------------------------------------------------------------------------

async function startSock() {
  try {
    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      auth: authState,
      logger,
      printQRInTerminal: false, // deprecated in newer Baileys — we print it ourselves below.
      browser: ['ilm AI', 'Chrome', '1.0.0'],
    });
    state.sock = sock;

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        console.log('\n[whatsapp-worker] Scan this QR with WhatsApp > Linked Devices:\n');
        qrcodeTerminal.generate(qr, { small: true });
        // Terminal ASCII QR renders unreliably on some terminals (e.g. Windows Git Bash/MinTTY
        // mangles the block characters) — also dump the raw QR payload to a file so it can be
        // turned into a real PNG image instead (see whatsapp-worker/README.md's troubleshooting
        // note) rather than asking someone to scan a possibly-distorted terminal QR.
        try {
          fs.writeFileSync(path.join(__dirname, 'last_qr.txt'), qr);
        } catch (error) {
          console.error('[whatsapp-worker] Failed to write last_qr.txt:', error);
        }
      }

      if (connection === 'open') {
        state.connected = true;
        state.startingUp = false;
        console.log('[whatsapp-worker] Connected to WhatsApp as', sock.user?.id || '(unknown)');
      }

      if (connection === 'close') {
        state.connected = false;
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const loggedOut = statusCode === DisconnectReason.loggedOut;
        console.warn(
          '[whatsapp-worker] Connection closed. statusCode=%s loggedOut=%s',
          statusCode,
          loggedOut
        );
        if (loggedOut) {
          console.error(
            '[whatsapp-worker] Session was logged out (device unlinked from the phone). Delete ' +
              `${AUTH_DIR} and restart the worker to scan a fresh QR code.`
          );
          state.startingUp = false;
          return; // do NOT auto-reconnect — it would just loop on an invalid session.
        }
        // Any other disconnect reason (network blip, phone offline, WA server restart, etc.) —
        // reconnect automatically so the bot heals itself without a human touching the VPS.
        setTimeout(() => {
          startSock().catch((error) => console.error('[whatsapp-worker] Reconnect failed:', error));
        }, 3_000);
      }
    });

    sock.ev.on('messages.upsert', (payload) => {
      handleIncoming(payload).catch((error) =>
        console.error('[whatsapp-worker] Error handling incoming message:', error)
      );
    });
  } catch (error) {
    // Never let a startup failure crash the process — PM2 would restart it anyway, but this way
    // a single bad tick doesn't spam PM2's restart counter, and we get one clean retry.
    console.error('[whatsapp-worker] Failed to start WhatsApp socket, retrying in 5s:', error);
    setTimeout(() => {
      startSock().catch((retryError) => console.error('[whatsapp-worker] Retry failed:', retryError));
    }, 5_000);
  }
}

// ---------------------------------------------------------------------------------------------
// JazzCash payment cross-match — the actual activation logic lives in the Next.js app
// (src/app/api/payments/jazzcash/verify/route.ts); this worker only extracts the TID/code from
// chat, forwards them, and relays the reply. See handleIncoming() below for where this plugs in.
// ---------------------------------------------------------------------------------------------

async function verifyJazzcashPayment(phoneDigits, tid, code) {
  if (!APP_BASE_URL) {
    return { verified: false, message: 'Payment verification is not configured yet — please contact support.' };
  }
  try {
    const response = await fetch(`${APP_BASE_URL}/api/payments/jazzcash/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WORKER_SECRET ? { Authorization: `Bearer ${WORKER_SECRET}` } : {}),
      },
      body: JSON.stringify({ phoneDigits, tid, code }),
      signal: AbortSignal.timeout(15_000),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok && !result.message) {
      return { verified: false, message: 'We could not verify that payment right now. Please try again shortly.' };
    }
    return { verified: Boolean(result.verified), message: result.message || 'Could not verify that payment.' };
  } catch (error) {
    console.error('[whatsapp-worker] jazzcash verify request failed:', error);
    return { verified: false, message: 'We could not reach the verification service. Please try again shortly.' };
  }
}

/**
 * AI-powered auto-reply — the actual conversation (persona, Groq call, close-the-conversation
 * logic) lives in the Next.js app (src/app/api/whatsapp/ai-reply/route.ts); this worker only
 * forwards the message and relays whatever reply comes back. `reply: null` means the app decided
 * this number's conversation is already closed (see that route's CLOSE_TOKEN handling) — nothing
 * gets sent, but the message was still logged just above in handleIncoming().
 */
async function getAiReply(phoneDigits, message, profileName) {
  if (!APP_BASE_URL) return null;
  try {
    const response = await fetch(`${APP_BASE_URL}/api/whatsapp/ai-reply`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(WORKER_SECRET ? { Authorization: `Bearer ${WORKER_SECRET}` } : {}),
      },
      body: JSON.stringify({ phoneDigits, message, profileName: profileName || null }),
      signal: AbortSignal.timeout(20_000), // Groq + gateway round trip needs more room than /send.
    });
    const result = await response.json().catch(() => ({}));
    return typeof result.reply === 'string' ? result.reply : null;
  } catch (error) {
    console.error('[whatsapp-worker] ai-reply request failed:', error);
    return "Sorry, I'm having a little trouble replying right now — please try again in a bit 🙏";
  }
}

/** Uploads a payment-proof screenshot to a private Supabase Storage bucket for manual audit —
 * never written to disk on the VPS at any point (downloaded straight into memory from WhatsApp,
 * uploaded straight from memory), so there's no temp file to remember to clean up. */
async function uploadPaymentScreenshot(buffer, mimetype, tid) {
  if (!supabase) return null;
  try {
    const extension = (mimetype || '').includes('png') ? 'png' : 'jpg';
    const path = `${tid || 'unmatched'}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage
      .from(PAYMENT_PROOF_BUCKET)
      .upload(path, buffer, { contentType: mimetype || 'image/jpeg', upsert: false });
    if (error) {
      console.error('[whatsapp-worker] Screenshot upload failed:', error.message);
      return null;
    }
    return path;
  } catch (error) {
    console.error('[whatsapp-worker] Screenshot upload threw:', error);
    return null;
  }
}

/**
 * Handles one incoming message that looks like it's part of a JazzCash payment confirmation (has
 * a TID, a plan/claim code, or an image attached). Merges whatever this message contributed into
 * the sender's pending claim; once both a TID and a code are known, calls the Next.js app to do
 * the real cross-match and relays its reply. Returns true if this message was actually a payment
 * message (so handleIncoming knows not to also send the generic greeting reply).
 */
async function handlePossiblePaymentMessage(from, digits, text, msg) {
  const foundTid = extractTid(text);
  const foundCode = extractCode(text);
  const hasImage = Boolean(msg.message.imageMessage);
  if (!foundTid && !foundCode && !hasImage && !getPendingClaim(digits)) return false;

  let image = null;
  if (hasImage) {
    try {
      const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: state.sock.updateMediaMessage });
      image = { buffer, mimetype: msg.message.imageMessage?.mimetype || 'image/jpeg' };
    } catch (error) {
      console.error('[whatsapp-worker] Failed to download image, continuing without it:', error);
    }
  }

  const claim = touchPendingClaim(digits, {
    ...(foundTid ? { tid: foundTid } : {}),
    ...(foundCode ? { code: foundCode } : {}),
    ...(image ? { image } : {}),
  });

  if (!claim.tid || !claim.code) {
    const missing = !claim.tid && !claim.code ? 'your transaction ID and plan/claim code' : !claim.tid ? 'your transaction ID' : 'your plan/claim code';
    await state.sock?.sendMessage(from, {
      text:
        `Got it${image ? ' (and the screenshot)' : ''} — I still need ${missing} to verify this payment.\n\n` +
        'Send it like: "TID 123456789012 CODE STU-PRO-M" (the code is shown on the checkout page next to the amount).',
    });
    return true;
  }

  const result = await verifyJazzcashPayment(digits, claim.tid, claim.code);
  let screenshotNote = '';
  if (claim.image) {
    const path = await uploadPaymentScreenshot(claim.image.buffer, claim.image.mimetype, claim.tid);
    if (path) screenshotNote = '\n\n(Your screenshot was saved for our records.)';
  }
  pendingPaymentClaims.delete(digits); // whether it matched or not — a stale tid/code shouldn't linger.

  await state.sock?.sendMessage(from, { text: `${result.message}${result.verified ? screenshotNote : ''}` });
  return true;
}

// ---------------------------------------------------------------------------------------------
// Incoming messages — AI-powered auto-reply (see getAiReply() above / src/app/api/whatsapp/
// ai-reply/route.ts for the actual persona + Groq call). Looks the sender up by phone in
// `profiles` so the AI can personalize its reply, and always logs the message to
// `whatsapp_inbound_messages` (see supabase/migrations/) regardless of whether the AI replies —
// so a human can review the full conversation even after the bot has gone quiet for a number.
//
// A message that looks like a JazzCash payment confirmation (TID, plan/claim code, or an image)
// is routed to handlePossiblePaymentMessage() above instead of getting the AI reply below.
// ---------------------------------------------------------------------------------------------

async function handleIncoming({ messages, type }) {
  if (type !== 'notify') return;

  for (const msg of messages || []) {
    try {
      if (!msg.message || msg.key.fromMe) continue;
      const from = msg.key.remoteJid;
      if (!from || from.endsWith('@g.us') || from === 'status@broadcast') continue; // ignore groups/status

      const text =
        msg.message.conversation ||
        msg.message.extendedTextMessage?.text ||
        msg.message.buttonsResponseMessage?.selectedDisplayText ||
        msg.message.imageMessage?.caption ||
        '';

      const digits = jidToDigits(from);

      const handledAsPayment = await handlePossiblePaymentMessage(from, digits, text, msg);
      if (handledAsPayment) continue;

      let profile = null;
      if (supabase && digits) {
        const { data } = await supabase
          .from('profiles')
          .select('id, full_name, role')
          .in('phone', candidateStoredFormats(digits))
          .limit(1)
          .maybeSingle();
        profile = data;
      }

      if (supabase) {
        // Best-effort — a logging failure must never stop the reply below.
        await supabase
          .from('whatsapp_inbound_messages')
          .insert({
            phone_digits: digits || null,
            profile_id: profile?.id || null,
            message: text.slice(0, 4000),
          })
          .then(
            () => {},
            (error) => console.error('[whatsapp-worker] Failed to log inbound message:', error?.message)
          );
      }

      if (!text) continue; // an image with no caption and no pending claim — nothing to reply to.

      const reply = await getAiReply(digits, text, profile?.full_name || null);
      if (reply) await state.sock?.sendMessage(from, { text: reply });
      // reply === null means the app already closed this number's conversation (handed off to
      // the CEO) — per spec, stay silent from here on for that number.
    } catch (error) {
      console.error('[whatsapp-worker] Failed to process one incoming message:', error);
      // Continue with the rest of the batch — one bad message must not stop the others.
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Local HTTP API — this is the ONLY thing the Next.js app talks to. Bound to 127.0.0.1 so it's
// never reachable off the VPS even if the firewall is misconfigured.
// ---------------------------------------------------------------------------------------------

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy(); // 1MB guard against a runaway body
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
    req.on('error', reject);
  });
}

function isAuthorized(req) {
  if (!WORKER_SECRET) return true; // no secret configured — see the startup warning above.
  const header = req.headers['authorization'] || '';
  return header === `Bearer ${WORKER_SECRET}`;
}

const server = http.createServer(async (req, res) => {
  try {
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true, connected: state.connected, startingUp: state.startingUp }));
      return;
    }

    if (req.method === 'POST' && req.url === '/send') {
      if (!isAuthorized(req)) {
        res.writeHead(401, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Unauthorized' }));
        return;
      }
      const body = await readJsonBody(req);
      const { to, message } = body || {};
      if (!to || !message) {
        res.writeHead(400, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ error: 'Both "to" and "message" are required' }));
        return;
      }
      if (!state.connected || !state.sock) {
        // Graceful degrade — the WhatsApp session is down (offline phone, mid-reconnect, never
        // scanned). This is NOT an error the caller should treat as fatal.
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ skipped: true, reason: 'WhatsApp session is not connected' }));
        return;
      }
      const jid = toJid(to);
      if (!jid) {
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ skipped: true, reason: 'Recipient has no usable phone number' }));
        return;
      }
      try {
        const result = await state.sock.sendMessage(jid, { text: String(message) });
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ messageId: result?.key?.id || null }));
      } catch (sendError) {
        console.error('[whatsapp-worker] sendMessage failed:', sendError);
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(JSON.stringify({ skipped: true, reason: 'Send failed — see worker logs' }));
      }
      return;
    }

    res.writeHead(404, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Not found' }));
  } catch (error) {
    console.error('[whatsapp-worker] Unhandled request error:', error);
    try {
      res.writeHead(500, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Internal error' }));
    } catch {
      /* response may already be closed */
    }
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[whatsapp-worker] HTTP API listening on http://127.0.0.1:${PORT}`);
});

// Belt-and-braces: a truly uncaught error must not take the whole VPS process down and silently
// stop notifications with no restart. PM2 also restarts on exit, but this avoids the exit.
process.on('uncaughtException', (error) => console.error('[whatsapp-worker] Uncaught exception:', error));
process.on('unhandledRejection', (error) => console.error('[whatsapp-worker] Unhandled rejection:', error));

startSock().catch((error) => console.error('[whatsapp-worker] Fatal startup error:', error));
