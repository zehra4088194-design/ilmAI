const path = require('path');
const Module = require('module');

// Retire the private CEO WhatsApp destination even when an old VPS env variable is still present.
delete process.env.WHATSAPP_CEO_NUMBER;

const target = path.resolve(__dirname, 'index.js');
const originalCompile = Module.prototype._compile;

const SAFE_HELPERS = `
const WHATSAPP_ADMIN_EMAIL = process.env.WHATSAPP_ADMIN_EMAIL || process.env.CONTACT_EMAIL || process.env.SUGGESTION_EMAIL || 'ilmai.study1@gmail.com';

async function sendAdminHandoffEmail({ senderNumber, senderName, topic, message, requestedAction, attachment }) {
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
      const blob = new Blob([attachment.buffer], { type: attachment.contentType || 'application/octet-stream' });
      form.append('attachment', blob, attachment.filename || 'whatsapp-attachment');
    }

    const response = await fetch(\`\${APP_BASE_URL}/api/internal/whatsapp/handoff\`, {
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
`;

Module.prototype._compile = function patchedCompile(content, filename) {
  if (path.resolve(filename) !== target) return originalCompile.call(this, content, filename);

  let next = content;

  // The old source constructs CEO_JID from WHATSAPP_CEO_NUMBER. Force it to null at runtime.
  next = next.replace(
    /const CEO_JID = toJid\(process\.env\.WHATSAPP_CEO_NUMBER \|\| ''\);/,
    'const CEO_JID = null;'
  );

  next = next.replace(
    'const PAYMENT_PROOF_BUCKET = \'jazzcash-payment-proofs\';',
    `const PAYMENT_PROOF_BUCKET = 'jazzcash-payment-proofs';\n${SAFE_HELPERS}`
  );

  // Old CEO notification -> internal email bridge.
  const notifyStart = next.indexOf('async function notifyCEOOfHandoff(');
  const notifyEnd = next.indexOf('\nif (!WORKER_SECRET)', notifyStart);
  if (notifyStart !== -1 && notifyEnd !== -1) {
    next =
      next.slice(0, notifyStart) +
      `async function notifyCEOOfHandoff(from, digits, text) {\n  let profile = null;\n  if (supabase && digits) {\n    profile = (await supabase\n      .from('profiles')\n      .select('full_name, role')\n      .in('phone', candidateStoredFormats(digits))\n      .limit(1)\n      .maybeSingle()).data;\n  }\n  return sendAdminHandoffEmail({\n    senderNumber: digits,\n    senderName: profile?.full_name || 'Unknown sender',\n    topic: 'CEO / admin contact request',\n    message: text,\n    requestedAction: 'User requested direct contact with Husnain Noor / the admin',\n  });\n}\n` +
      next.slice(notifyEnd);
  }

  // Old CEO media forwarder -> internal email bridge with the original attachment.
  const mediaStart = next.indexOf('async function forwardMediaToCEO(');
  const mediaEnd = next.indexOf('\nasync function handlePossiblePaymentMessage', mediaStart);
  if (mediaStart !== -1 && mediaEnd !== -1) {
    next =
      next.slice(0, mediaStart) +
      `async function forwardMediaToCEO(from, digits, msg, mediaKind) {\n  const media = getMediaMessage(msg);\n  if (!media) return false;\n\n  try {\n    const buffer = await downloadMediaMessage(msg, 'buffer', {}, {\n      logger,\n      reuploadRequest: state.sock.updateMediaMessage,\n    });\n\n    let profile = null;\n    if (supabase && digits) {\n      profile = (await supabase\n        .from('profiles')\n        .select('full_name, role')\n        .in('phone', candidateStoredFormats(digits))\n        .limit(1)\n        .maybeSingle()).data;\n    }\n\n    const senderName = profile?.full_name || msg.pushName || 'Unknown sender';\n    const caption = getText(msg);\n    const mediaLabel = mediaKind === 'document' ? (media.fileName || 'document') : mediaKind;\n    const detail =\n      'WhatsApp media received\\n' +\n      'Sender: ' + senderName + '\\n' +\n      'Number: +' + (digits || 'unknown') + '\\n' +\n      'Role: ' + (profile?.role || 'unknown') + '\\n' +\n      'Type: ' + mediaLabel +\n      (caption ? '\\nCaption: ' + caption.slice(0, 1000) : '') +\n      '\\n\\nNo reply was sent to the sender.';\n\n    const ok = await sendAdminHandoffEmail({\n      senderNumber: digits,\n      senderName,\n      topic: 'WhatsApp media received',\n      message: detail,\n      requestedAction: 'Review incoming WhatsApp media',\n      attachment: {\n        buffer,\n        filename: media.fileName || ('whatsapp-' + mediaKind + '-' + Date.now()),\n        contentType: media.mimetype || 'application/octet-stream',\n      },\n    });\n    console.log('[whatsapp-worker] Media handoff email %s for %s.', ok ? 'sent' : 'failed', digits || 'unknown');\n    return ok;\n  } catch (error) {\n    console.error('[whatsapp-worker] Failed to prepare media email:', error?.message || error);\n    return false;\n  }\n}\n` +
      next.slice(mediaEnd);
  }

  return originalCompile.call(this, next, filename);
};
