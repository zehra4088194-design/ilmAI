require('dotenv').config();

const fs = require('fs');
const path = require('path');
const http = require('http');
const pino = require('pino');
const qrcodeTerminal = require('qrcode-terminal');
const QRCode = require('qrcode');
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
const WORKER_SECRET = process.env.WHATSAPP_WORKER_SECRET || '';
const AUTH_DIR = process.env.WHATSAPP_AUTH_DIR || './auth_info_baileys';
const APP_BASE_URL = (process.env.WHATSAPP_APP_BASE_URL || '').replace(/\/$/, '');
const WHATSAPP_ADMIN_EMAIL =
  process.env.WHATSAPP_ADMIN_EMAIL ||
  process.env.CONTACT_EMAIL ||
  process.env.SUGGESTION_EMAIL ||
  'ilmai.study1@gmail.com';
const PAYMENT_PROOF_EMAIL = process.env.PAYMENT_PROOF_EMAIL || 'proof@ilmai.study';
const PAYMENT_PROOF_MESSAGE =
  `Theek hai 👍 JazzCash se payment karne ke baad transaction ka screenshot isi WhatsApp chat par bhej dein, ya ${PAYMENT_PROOF_EMAIL} par email kar dein. Proof milne ke baad team payment verify karke 30 minutes ke andar aapka plan activate kar degi.`;
const PAYMENT_PROOF_BUCKET = 'jazzcash-payment-proofs';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey, { auth: { persistSession: false } })
    : null;

const logger = pino({ level: process.env.WHATSAPP_LOG_LEVEL || 'warn' });
const state = { sock: null, connected: false, startingUp: true };

const pendingPaymentClaims = new Map();
const PENDING_CLAIM_TTL_MS = 30 * 60 * 1000;
const phoneQueues = new Map();
const closedHandoffPhones = new Set();

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

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function randomReplyDelayMs() {
  return 15_000 + Math.floor(Math.random() * 5_001);
}

function runSerializedForPhone(digits, task) {
  const key = digits || 'unknown';
  const previous = phoneQueues.get(key) || Promise.resolve();
  const current = previous.catch(() => {}).then(task);
  phoneQueues.set(key, current);
  current.finally(() => {
    if (phoneQueues.get(key) === current) phoneQueues.delete(key);
  });
  return current;
}

function getText(msg) {
  return (
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    msg.message?.buttonsResponseMessage?.selectedDisplayText ||
    msg.message?.listResponseMessage?.title ||
    msg.message?.imageMessage?.caption ||
    msg.message?.videoMessage?.caption ||
    msg.message?.documentMessage?.caption ||
    ''
  );
}

function getMediaKind(msg) {
  const message = msg.message || {};
  if (message.imageMessage) return 'image';
  if (message.videoMessage) return 'video';
  if (message.documentMessage) return 'document';
  if (message.audioMessage) return 'audio';
  if (message.stickerMessage) return 'sticker';
  if (message.documentWithCaptionMessage?.message?.documentMessage) return 'document';
  return null;
}

function getMediaMessage(msg) {
  const message = msg.message || {};
  return (
    message.imageMessage ||
    message.videoMessage ||
    message.documentMessage ||
    message.audioMessage ||
    message.stickerMessage ||
    message.documentWithCaptionMessage?.message?.documentMessage ||
    null
  );
}

function isCeoRequest(text) {
  const normalized = String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!normalized) return false;

  const directContactIntent =
    /(baat|bat|talk|speak|speaking|contact|connect|milna|meet|personally|direct|help)/.test(normalized);

  if (/\b(admin|ceo)\b/.test(normalized) && directContactIntent) return true;
  if (/\b(husnain|founder|owner|boss)\b/.test(normalized) && directContactIntent) return true;

  return false;
}

function isJazzCashPaid(text) {
  const normalized = String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  if (!normalized) return false;
  return (
    /jazz\s*cash/.test(normalized) &&
    /(payment|pay|paid|paye|transfer|send|sent|amount)/.test(normalized) &&
    /(kar\s*(di|dia|diya)|kr\s*(di|dia|diya)|kardi|karna\s*(tha|hai)|done|paid|sent|send|transfer|bhej\s*(di|dia|diya)|made|make|ho\s*giya|hogi|hogaya|ho\s*gaya)/.test(normalized)
  ) || (
    /(i\s*(have|'ve)?\s*paid|paid|payment\s*(is|was|done|made|sent)|payment\s*kar)/.test(normalized) &&
    /jazz\s*cash/.test(normalized)
  );
}

async function isConversationClosed(digits) {
  if (!digits) return false;
  if (closedHandoffPhones.has(digits)) return true;
  if (!supabase) return false;
  try {
    const { data } = await supabase
      .from('whatsapp_ai_conversations')
      .select('status')
      .eq('phone_digits', digits)
      .maybeSingle();
    if (data?.status === 'closed') {
      closedHandoffPhones.add(digits);
      return true;
    }
  } catch (error) {
    console.error('[whatsapp-worker] Closed-status lookup failed:', error?.message || error);
  }
  return false;
}

async function markConversationClosed(digits) {
  if (!digits) return;
  closedHandoffPhones.add(digits);
  if (!supabase) return;
  try {
    const { data: existing } = await supabase
      .from('whatsapp_ai_conversations')
      .select('history')
      .eq('phone_digits', digits)
      .maybeSingle();
    await supabase.from('whatsapp_ai_conversations').upsert(
      {
        phone_digits: digits,
        status: 'closed',
        history: Array.isArray(existing?.history) ? existing.history : [],
        closed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'phone_digits' }
    );
  } catch (error) {
    console.error('[whatsapp-worker] Failed to persist admin handoff:', error?.message || error);
  }
}

async function sendAdminHandoffEmail({
  senderNumber,
  senderName,
  topic,
  message,
  requestedAction,
  attachment,
}) {
  if (!APP_BASE_URL || !WORKER_SECRET) {
    console.error('[whatsapp-worker] App URL/worker secret missing; admin email skipped.');
    return false;
  }

  try {
    const form = new FormData();
    form.append('senderNumber', String(senderNumber || 'unknown'));
    form.append('senderName', String(senderName || 'Unknown sender'));
    form.append('topic', String(topic || '').slice(0, 240));
    form.append('message', String(message || '').slice(0, 6000));
    form.append('requestedAction', String(requestedAction || 'Admin contact').slice(0, 160));

    if (attachment?.buffer) {
      const blob = new Blob([attachment.buffer], {
        type: attachment.contentType || 'application/octet-stream',
      });
      form.append('attachment', blob, attachment.filename || 'whatsapp-attachment');
    }

    const response = await fetch(`${APP_BASE_URL}/api/internal/whatsapp/handoff`, {
      method: 'POST',
      headers: { 'x-whatsapp-worker-secret': WORKER_SECRET },
      body: form,
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[whatsapp-worker] Admin handoff email failed:', response.status, detail.slice(0, 500));
      return false;
    }

    console.log('[whatsapp-worker] Admin handoff email sent to %s.', WHATSAPP_ADMIN_EMAIL);
    return true;
  } catch (error) {
    console.error('[whatsapp-worker] Admin handoff email request failed:', error?.message || error);
    return false;
  }
}

async function startSock() {
  try {
    const { state: authState, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
    const { version } = await fetchLatestBaileysVersion();
    const sock = makeWASocket({
      version,
      auth: authState,
      logger,
      printQRInTerminal: false,
      browser: ['ilm AI', 'Chrome', '1.0.0'],
    });
    state.sock = sock;
    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', (update) => {
      const { connection, lastDisconnect, qr } = update;
      if (qr) {
        console.log('\n[whatsapp-worker] Scan this QR with WhatsApp > Linked Devices:\n');
        qrcodeTerminal.generate(qr, { small: true });
        try {
          fs.writeFileSync(path.join(__dirname, 'last_qr.txt'), qr);
        } catch (error) {
          console.error('[whatsapp-worker] Failed to write last_qr.txt:', error);
        }
        (async () => {
          try {
            await QRCode.toFile(path.join(__dirname, 'last_qr.png'), qr, { width: 512, margin: 2 });
            console.log('[whatsapp-worker] QR code image saved to last_qr.png');
          } catch (error) {
            console.error('[whatsapp-worker] Failed to generate QR PNG:', error);
          }
        })();
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
        if (statusCode === 515 || loggedOut) {
          console.error('[whatsapp-worker] WhatsApp session is invalid/logged out. Delete auth_info_baileys and relink.');
          state.startingUp = false;
          process.exit(0);
        }
        console.warn('[whatsapp-worker] Connection closed. Reconnecting in 3s. statusCode=%s', statusCode);
        setTimeout(() => startSock().catch((error) => console.error('[whatsapp-worker] Reconnect failed:', error)), 3000);
      }
    });

    sock.ev.on('messages.upsert', (payload) => {
      handleIncoming(payload).catch((error) => console.error('[whatsapp-worker] Error handling incoming message:', error));
    });
  } catch (error) {
    console.error('[whatsapp-worker] Failed to start WhatsApp socket, retrying in 5s:', error);
    setTimeout(() => startSock().catch((retryError) => console.error('[whatsapp-worker] Retry failed:', retryError)), 5000);
  }
}

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
      signal: AbortSignal.timeout(45_000),
    });
    const result = await response.json().catch(() => ({}));
    return typeof result.reply === 'string' ? result.reply : null;
  } catch (error) {
    console.error('[whatsapp-worker] ai-reply request failed:', error);
    return "Sorry, I'm having a little trouble replying right now — please try again in a bit 🙏";
  }
}

async function uploadPaymentScreenshot(buffer, mimetype, tid) {
  if (!supabase) return null;
  try {
    const extension = (mimetype || '').includes('png') ? 'png' : 'jpg';
    const storagePath = `${tid || 'unmatched'}/${Date.now()}.${extension}`;
    const { error } = await supabase.storage
      .from(PAYMENT_PROOF_BUCKET)
      .upload(storagePath, buffer, { contentType: mimetype || 'image/jpeg', upsert: false });
    if (error) {
      console.error('[whatsapp-worker] Screenshot upload failed:', error.message);
      return null;
    }
    return storagePath;
  } catch (error) {
    console.error('[whatsapp-worker] Screenshot upload threw:', error);
    return null;
  }
}

async function forwardMediaToAdminEmail(from, digits, msg, mediaKind) {
  const media = getMediaMessage(msg);
  if (!media) return false;

  try {
    const buffer = await downloadMediaMessage(msg, 'buffer', {}, {
      logger,
      reuploadRequest: state.sock.updateMediaMessage,
    });

    let profile = null;
    if (supabase && digits) {
      profile = (await supabase
        .from('profiles')
        .select('full_name', 'role')
        .in('phone', candidateStoredFormats(digits))
        .limit(1)
        .maybeSingle()).data;
    }

    const senderName = profile?.full_name || msg.pushName || 'Unknown sender';
    const caption = getText(msg);
    const mediaLabel = mediaKind === 'document' ? (media.fileName || 'document') : mediaKind;
    const detail =
      'WhatsApp media received\n' +
      'Sender: ' + senderName + '\n' +
      'Number: +' + (digits || 'unknown') + '\n' +
      'Role: ' + (profile?.role || 'unknown') + '\n' +
      'Type: ' + mediaLabel +
      (caption ? '\nCaption: ' + caption.slice(0, 1000) : '') +
      '\n\nNo reply was sent to the sender.';

    const ok = await sendAdminHandoffEmail({
      senderNumber: digits,
      senderName,
      topic: 'WhatsApp media received',
      message: detail,
      requestedAction: 'Review incoming WhatsApp media',
      attachment: {
        buffer,
        filename: media.fileName || `whatsapp-${mediaKind}-${Date.now()}`,
        contentType: media.mimetype || 'application/octet-stream',
      },
    });

    console.log('[whatsapp-worker] Media handoff email %s for %s.', ok ? 'sent' : 'failed', digits || 'unknown');
    return ok;
  } catch (error) {
    console.error('[whatsapp-worker] Failed to prepare media email:', error?.message || error);
    return false;
  }
}

async function handlePossiblePaymentMessage(from, digits, text, msg) {
  const foundCode = extractCode(text);
  const hasTidLabel = /\bT\.?I\.?D\.?\b/i.test(text);

  // Never treat an ordinary phone number, email, or other long digit string as a payment/TID.
  // Payment parsing starts only when the user supplied an explicit TID label or a valid plan/claim code.
  if (!hasTidLabel && !foundCode) return false;

  const foundTid = extractTid(text);
  const fallbackBareTid =
    !foundTid && foundCode
      ? String(text).match(/\b\d{9,20}\b/)?.[0] || null
      : null;

  const claim = touchPendingClaim(digits, {
    ...((foundTid || fallbackBareTid) ? { tid: foundTid || fallbackBareTid } : {}),
    ...(foundCode ? { code: foundCode } : {}),
  });

  if (!claim.tid || !claim.code) {
    const missing = !claim.tid && !claim.code ? 'your transaction ID and plan/claim code' : !claim.tid ? 'your transaction ID' : 'your plan/claim code';
    await state.sock?.sendMessage(from, {
      text: `Got it — I still need ${missing} to verify this payment.\n\nSend it like: "TID 123456789012 CODE STU-PRO-M".`,
    });
    return true;
  }

  const result = await verifyJazzcashPayment(digits, claim.tid, claim.code);
  if (claim.image) await uploadPaymentScreenshot(claim.image.buffer, claim.image.mimetype, claim.tid);
  pendingPaymentClaims.delete(digits);
  await state.sock?.sendMessage(from, { text: result.message });
  return true;
}

async function logIncoming(digits, text, profile) {
  if (!supabase) return;
  await supabase
    .from('whatsapp_inbound_messages')
    .insert({ phone_digits: digits || null, profile_id: profile?.id || null, message: text.slice(0, 4000) })
    .then(() => {}, (error) => console.error('[whatsapp-worker] Failed to log inbound message:', error?.message));
}

async function processOneMessage(from, digits, msg) {
  const mediaKind = getMediaKind(msg);

  // HARD RULE: every incoming picture/file/media is emailed to the admin and the sender gets NO reply.
  // This always runs before the closed-handoff, payment, and AI handlers.
  if (mediaKind) {
    const text = getText(msg);
    const profile = supabase && digits
      ? (await supabase.from('profiles').select('id, full_name, role').in('phone', candidateStoredFormats(digits)).limit(1).maybeSingle()).data
      : null;
    await logIncoming(digits, text || `[${mediaKind}]`, profile);
    await forwardMediaToAdminEmail(from, digits, msg, mediaKind);
    return;
  }

  // Once a user has been handed off to the admin, all later text is silently logged/ignored.
  if (await isConversationClosed(digits)) return;

  const text = getText(msg);

  // Direct admin/CEO requests bypass AI and payment parsing completely.
  if (isCeoRequest(text)) {
    const profile = supabase && digits
      ? (await supabase.from('profiles').select('id, full_name, role').in('phone', candidateStoredFormats(digits)).limit(1).maybeSingle()).data
      : null;
    await logIncoming(digits, text, profile);

    const notified = await sendAdminHandoffEmail({
      senderNumber: digits,
      senderName: profile?.full_name || msg.pushName || 'Unknown sender',
      topic: 'Admin / CEO contact request',
      message: text,
      requestedAction: 'User requested direct contact with Husnain Noor / the admin',
    });

    await markConversationClosed(digits);
    if (notified) {
      await state.sock?.sendMessage(from, {
        text: 'Theek hai 👍 Aapki request note kar li gayi hai. Husnain Noor ki team aapse follow up karegi. Ab is chat par hum mazeed automated replies nahi bhejenge.',
      });
    }
    return;
  }

  // JazzCash payment intent is deterministic and intentionally narrow.
  if (isJazzCashPaid(text)) {
    await logIncoming(digits, text, null);
    await state.sock?.sendMessage(from, { text: PAYMENT_PROOF_MESSAGE });
    return;
  }

  const handledAsPayment = await handlePossiblePaymentMessage(from, digits, text, msg);
  if (handledAsPayment) return;

  let profile = null;
  if (supabase && digits) {
    profile = (await supabase.from('profiles').select('id, full_name, role').in('phone', candidateStoredFormats(digits)).limit(1).maybeSingle()).data;
  }
  await logIncoming(digits, text, profile);
  if (!text) return;

  const reply = await getAiReply(digits, text, profile?.full_name || null);
  if (!reply) return;
  try {
    await state.sock?.presenceSubscribe(from);
    await state.sock?.sendPresenceUpdate('composing', from);
  } catch {}
  await sleep(randomReplyDelayMs());
  await state.sock?.sendMessage(from, { text: reply });
}

async function handleIncoming({ messages, type }) {
  if (type !== 'notify') return;
  for (const msg of messages || []) {
    if (!msg.message || msg.key.fromMe) continue;
    const from = msg.key.remoteJid;
    if (!from || from.endsWith('@g.us') || from === 'status@broadcast') continue;
    const digits = jidToDigits(from);
    runSerializedForPhone(digits, () => processOneMessage(from, digits, msg)).catch((error) => {
      console.error('[whatsapp-worker] Failed to process one incoming message:', error);
    });
  }
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 1_000_000) req.destroy();
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
  if (!WORKER_SECRET) return true;
  return (req.headers.authorization || '') === `Bearer ${WORKER_SECRET}`;
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
      } catch (error) {
        console.error('[whatsapp-worker] sendMessage failed:', error);
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
    } catch {}
  }
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`[whatsapp-worker] HTTP API listening on http://127.0.0.1:${PORT}`);
});

process.on('uncaughtException', (error) => console.error('[whatsapp-worker] Uncaught exception:', error));
process.on('unhandledRejection', (error) => console.error('[whatsapp-worker] Unhandled rejection:', error));

startSock().catch((error) => console.error('[whatsapp-worker] Fatal startup error:', error));
