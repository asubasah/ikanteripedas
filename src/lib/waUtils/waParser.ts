import { normalizeAndValidate } from "./phone";

async function resolveLidToPhone(lid: string): Promise<string | null> {
  const WAHA_URL = process.env.WAHA_URL || 'http://127.0.0.1:3017';
  const GOWA_URL = process.env.GOWA_URL || 'http://127.0.0.1:3010';
  const WAHA_API_KEY = process.env.WAHA_API_KEY || 'mkm123';
  const encodedLid = encodeURIComponent(lid);
  
  // 🎯 Try WAHA first if it looks like a WAHA setup
  if (process.env.WAHA_URL) {
    try {
      console.log(`[LID DEBUG] Attempting to resolve: ${lid} via ${WAHA_URL}`);
      const res = await fetch(`${WAHA_URL}/api/default/contacts/${encodedLid}`, {
        headers: { 'Accept': 'application/json', 'X-Api-Key': WAHA_API_KEY }
      });
      if (res.ok) {
        const data = await res.json();
        const realId = (data.number || data.id || '').split('@')[0];
        if (realId && realId.length >= 10 && !realId.includes('lid')) {
          let phone = realId.replace(/\D/g, "");
          console.log(`✅ LID RESOLVED via WAHA Native: ${lid} -> ${phone}`);
          return phone;
        }
      }
    } catch (e: any) {
      console.warn(`[LID WARNING] WAHA resolve failed, trying GoWA...`);
    }
  }

  // 🎯 Try GoWA resolve if WAHA fails or isn't used
  try {
    const GOWA_BASIC_AUTH = process.env.GOWA_BASIC_AUTH;
    const headers: Record<string, string> = { 'Accept': 'application/json' };
    
    if (GOWA_BASIC_AUTH) {
      headers['Authorization'] = `Basic ${Buffer.from(GOWA_BASIC_AUTH).toString('base64')}`;
    }

    const cleanLid = lid.split('@')[0];
    const res = await fetch(`${GOWA_URL}/user/info?phone=${cleanLid}`, { headers });
    if (res.ok) {
      const data = await res.json();
      const phone = (data.data?.verified_name?.replace(/\D/g, "") || data.data?.id?.split('@')[0]);
      if (phone && phone.length >= 10) return phone;
    }
  } catch (e: any) {
    console.warn(`[LID CRITICAL] All resolve attempts failed:`, e.message);
  }

  return null;
}

export async function extractPhoneDeep(body: any, payload: any): Promise<{ phone: string | null, source: string }> {
  const candidates: { raw: string, source: string }[] = [];

  // 🔥 1. COLLECT ALL POSSIBILITIES
  if (payload.author) candidates.push({ raw: payload.author, source: 'payload.author' });
  if (payload.key?.participant) candidates.push({ raw: payload.key.participant, source: 'key.participant' });
  if (payload.key?.remoteJid) candidates.push({ raw: payload.key.remoteJid, source: 'key.remoteJid' });
  if (payload._data?.id?.remote) candidates.push({ raw: payload._data.id.remote, source: '_data.id.remote' });
  if (payload.sender) candidates.push({ raw: payload.sender, source: 'sender' });
  if (payload.from) candidates.push({ raw: payload.from, source: 'from' });
  if (payload.to) candidates.push({ raw: payload.to, source: 'to' });

  // 🔥 2. ITERATE AND CAPTURE
  let bestIdSoFar: string | null = null;
  let bestSourceSoFar: string = 'unknown';

  for (let c of candidates) {
    if (!c.raw) continue;

    let rawId = c.raw.split("@")[0].replace(/\D/g, "");
    if (!rawId) continue;
    
    bestIdSoFar = rawId;
    bestSourceSoFar = c.source;

    // 🧠 LID DETECTION & AUTO-RESOLUTION
    // Trigger on ANY non-standard/long ID (>11 digits and not starting with 08 or 62)
    const looksLikeLid = rawId.length > 11 && !rawId.startsWith("62") && !rawId.startsWith("08");
    
    if (looksLikeLid || c.raw.includes("@lid")) {
      const lidFull = c.raw.includes("@") ? c.raw : `${rawId}@lid`;
      const resolved = await resolveLidToPhone(lidFull);
      if (resolved) {
        const phone = resolved.replace(/\D/g, "");
        if (phone.startsWith("628")) return { phone: "0" + phone.slice(2), source: c.source + "_resolved" };
        if (phone.startsWith("08")) return { phone: phone, source: c.source + "_resolved" };
        return { phone: phone, source: c.source + "_resolved" };
      }
      // If resolution fails, RETURN RAW LID as is (NO '0' or '08' added)
      console.log(`⚠️ RESOLVE FAILED: Using raw LID as identifier: ${rawId}`);
      return { phone: rawId, source: c.source + "_lid_fallback" };
    }

    // 🔄 STANDARDIZASI NOMOR BIASA (Hanya jika bukan LID)
    let p = rawId;
    if (p.startsWith("628")) return { phone: "0" + p.slice(2), source: c.source };
    if (p.startsWith("62")) return { phone: "0" + p.slice(2), source: c.source };
    if (p.startsWith("08")) return { phone: p, source: c.source };
    if (p.startsWith("8") && p.length <= 13) return { phone: "0" + p, source: c.source };
    
    return { phone: p, source: c.source };
  }

  // 🛟 NO SKIP POLICY: Jika semua gagal tapi kita punya ID, JANGAN DI-DROP!
  if (bestIdSoFar) {
    console.log(`⚠️ FALLBACK MODE: Using raw ID as identifier (${bestSourceSoFar}): ${bestIdSoFar}`);
    return { phone: bestIdSoFar, source: bestSourceSoFar + "_fallback" };
  }

  return { phone: null, source: 'unknown' };
}

export async function parseWebhook(body: any) {
  try {
    if (!['message', 'message.any'].includes(body.event) || !body.payload) {
        return { valid: false, reason: "invalid_event_type" };
    }

    const payload = body.payload;
    const isGoWa = !!body.device_id; // GoWA includes device_id at root
    
    // 🧠 Gateway-agnostic field extraction
    let isFromMe = isGoWa ? payload.from_me === true : payload.fromMe === true;
    let messageText = '';
    let type = "unknown";
    let hasMedia = false;
    let fromJid = isGoWa ? payload.from : payload.from;
    let pushName = payload.pushName || payload.from_name || 'Customer WA';

    if (isGoWa) {
      // GoWA Payload Handling
      const msgData = payload.message || {};
      messageText = msgData.conversation || msgData.extendedTextMessage?.text || msgData.imageMessage?.caption || msgData.videoMessage?.caption || '';
      hasMedia = !!(msgData.imageMessage || msgData.videoMessage || msgData.documentMessage || msgData.audioMessage || msgData.stickerMessage);
      type = hasMedia ? "media" : "text";
    } else {
      // WAHA Payload Handling
      messageText = payload.body || '';
      type = payload.type || "unknown";
      hasMedia = payload.hasMedia || false;
      if (['chat', 'text', 'extended_text'].includes(type) && !hasMedia) type = "text";
      else if (hasMedia) type = "media";
      pushName = payload.pushName || payload._data?.notifyName || (payload._data?.sender?.pushname) || pushName;
    }

    const msgTextLower = messageText.toLowerCase().trim();
    const isCommandMsg = ['#pause', '#resume', '#human', '#ai'].includes(msgTextLower);

    if (isFromMe && !isCommandMsg) {
        return { valid: false, reason: "outgoing_message_ignored" };
    }

    const isGroup = (fromJid || '').includes("@g.us");

    // Async extraction with Deep Multi-Source + LID Resolution
    const { phone: user_id, source: source_field } = await extractPhoneDeep(body, payload);

    if (!user_id && !isGroup) {
      return { valid: false, reason: "no_identifier_found" };
    }

    // 🧠 IMPROVED: QUOTE/REPLY SUPPORT
    const quoted = isGoWa 
      ? (payload.message?.extendedTextMessage?.contextInfo?.quotedMessage)
      : (payload.quotedMsg || payload._data?.quotedMsg);

    if (quoted) {
      const quotedBody = quoted.conversation || quoted.extendedTextMessage?.text || quoted.caption || quoted.body || '';
      if (quotedBody) {
        const quotedAuthor = isGoWa ? 'User' : (quoted.pushName || 'System/Admin');
        messageText = `[REPLY TO "${quotedAuthor}": "${quotedBody.substring(0, 100)}${quotedBody.length > 100 ? '...' : ''}"] ${messageText}`;
      }
    }

    return {
      valid: true,
      user_id: user_id || (fromJid ? fromJid.split('@')[0] : 'unknown'), 
      reply_jid: fromJid,
      user_name: pushName,
      message: messageText,
      type,
      hasMedia,
      is_group: !!isGroup,
      source_field,
      raw_sender: fromJid,
      gateway: isGoWa ? 'gowa' : 'waha',
      device_id: body.device_id || body.session || 'default',
      message_id: isGoWa ? payload.id : (typeof payload.id === 'object' && payload.id !== null ? (payload.id._serialized || payload.id.id) : payload.id)
    };
  } catch (err: any) {
    return {
      valid: false,
      reason: "parse_error",
      error: err.message
    };
  }
}
