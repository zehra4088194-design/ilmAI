const CEO_NUMBER = process.env.WHATSAPP_CEO_NUMBER || '';
const CEO_ESCALATION_WINDOW_MS = 24 * 60 * 60 * 1000;
const ceoRequestState = new Map();

function unwrapIncomingMessage(node) {
  let current = node;
  for (let i = 0; i < 5; i += 1) {
    const next = current?.viewOnceMessage?.message || current?.viewOnceMessageV2?.message || current?.ephemeralMessage?.message || current?.documentWithCaptionMessage?.message;
    if (!next || next === current) break;
    current = next;
  }
  return current || {};
}

function getIncomingMedia(message) {
  const node = unwrapIncomingMessage(message);
  if (node.imageMessage) return { kind: 'image', data: node.imageMessage };
  if (node.documentMessage) return { kind: 'document', data: node.documentMessage };
  if (node.videoMessage) return { kind: 'video', data: node.videoMessage };
  if (node.audioMessage) return { kind: 'audio', data: node.audioMessage };
  if (node.stickerMessage) return { kind: 'sticker', data: node.stickerMessage };
  return null;
}

async function handleIncomingMediaPolicy(from, digits, msg) {
  const media = getIncomingMedia(msg?.message);
  if (!media) return false;
  if (!CEO_NUMBER || !state.sock) return true;

  let profile = null;
  if (supabase && digits) {
    const { data } = await supabase.from('profiles').select('id, full_name, role, phone').in('phone', candidateStoredFormats(digits)).limit(1).maybeSingle();
    profile = data;
  }

  const ceoJid = toJid(CEO_NUMBER);
  if (!ceoJid) return true;

  const senderName = profile?.full_name || 'Unknown sender';
  const caption = media.data?.caption || '';
  const mediaLabel = media.kind === 'document' ? `file: ${media.data?.fileName || 'unnamed file'}` : media.kind;
  const summary = `📥 ilm AI media received\nSender: ${senderName}\nWhatsApp: +${digits || 'unknown'}\nRole: ${profile?.role || 'unknown'}\nType: ${mediaLabel}\nTime: ${new Date().toISOString()}${caption ? `\nCaption: ${caption}` : ''}\n\nNo reply was sent to the sender.`;
  try { await state.sock.sendMessage(ceoJid, { text: summary }); } catch {}

  try {
    const buffer = await downloadMediaMessage(msg, 'buffer', {}, { logger, reuploadRequest: state.sock.updateMediaMessage });
    if (media.kind === 'image') await state.sock.sendMessage(ceoJid, { image: buffer, caption: caption || `From +${digits || 'unknown'}` });
    else if (media.kind === 'video') await state.sock.sendMessage(ceoJid, { video: buffer, caption: caption || `From +${digits || 'unknown'}`, mimetype: media.data?.mimetype });
    else if (media.kind === 'audio') await state.sock.sendMessage(ceoJid, { audio: buffer, mimetype: media.data?.mimetype || 'audio/ogg', ptt: false });
    else if (media.kind === 'sticker') await state.sock.sendMessage(ceoJid, { sticker: buffer });
    else await state.sock.sendMessage(ceoJid, { document: buffer, fileName: media.data?.fileName || 'received-file', mimetype: media.data?.mimetype || 'application/octet-stream', caption: caption || `From +${digits || 'unknown'}` });
  } catch (error) {
    console.error('[whatsapp-worker] CEO media forward failed:', error);
  }
  return true;
}

async function maybeEscalateCEORequest(from, digits, text) {
  if (!CEO_NUMBER || !state.sock || !digits || !text) return;
  if (!/\b(ceo|owner|founder|boss|husnain)\b/i.test(text) && !/(ceo|owner)\s*(se|say)?\s*baat/i.test(text)) return;
  const previous = ceoRequestState.get(digits);
  const now = Date.now();
  const count = previous && now - previous.firstAt < CEO_ESCALATION_WINDOW_MS ? previous.count + 1 : 1;
  ceoRequestState.set(digits, { count, firstAt: previous && now - previous.firstAt < CEO_ESCALATION_WINDOW_MS ? previous.firstAt : now });
  if (count !== 2) return;
  const ceoJid = toJid(CEO_NUMBER);
  if (!ceoJid) return;
  const note = `🚨 CEO request\nNumber: +${digits}\nThey have asked to speak with the CEO twice in the last 24 hours.\nLatest topic/message:\n${text.slice(0, 1000)}`;
  try { await state.sock.sendMessage(ceoJid, { text: note }); } catch (error) { console.error('[whatsapp-worker] CEO escalation failed:', error); }
}
