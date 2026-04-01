import { normalizeAndValidate } from "./phone";

async function resolveLidToPhone(lid: string): Promise<string | null> {
  const WAHA_URL = process.env.WAHA_URL || 'http://127.0.0.1:3017';
  const WAHA_API_KEY = process.env.WAHA_API_KEY || 'mkm123';
  const encodedLid = encodeURIComponent(lid);
  
  console.log(`[LID DEBUG] Attempting to resolve: ${lid} via ${WAHA_URL}`);

  try {
    // 🎯 Use WAHA Native Contact API to resolve LIDs
    const res = await fetch(`${WAHA_URL}/api/default/contacts/${encodedLid}`, {
      headers: {
        'Accept': 'application/json',
        'X-Api-Key': WAHA_API_KEY
      }
    });

    if (res.ok) {
      const data = await res.json();
      // WAHA returns real ID/Number in 'id' or 'number' field if resolved
      const realId = (data.number || data.id || '').split('@')[0];
      
      if (realId && realId.length >= 10 && !realId.includes('lid')) {
        let phone = realId.replace(/\D/g, "");
        console.log(`✅ LID RESOLVED via WAHA Native: ${lid} -> ${phone}`);
        return phone;
      } else {
        console.warn(`[LID WARNING] WAHA returned data but no real ID found:`, JSON.stringify(data));
      }
    } else {
      const errText = await res.text();
      console.warn(`[LID ERROR] WAHA returned status ${res.status}: ${errText}`);
    }
  } catch (e: any) {
    console.warn(`[LID CRITICAL] Connection to WAHA failed during resolve:`, e.message);
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
    
    if (looksLikeLid) {
      const lidFull = c.raw.includes("@") ? c.raw : `${rawId}@lid`;
      const resolved = await resolveLidToPhone(lidFull);
      if (resolved) {
        const phone = resolved.replace(/\D/g, "");
        // PRIORITAS NORMALISASI ke 08 standard
        if (phone.startsWith("628")) return { phone: "0" + phone.slice(2), source: c.source + "_resolved" };
        if (phone.startsWith("62")) return { phone: "0" + phone.slice(2), source: c.source + "_resolved" };
        if (phone.startsWith("8")) return { phone: "0" + phone, source: c.source + "_resolved" };
        if (phone.startsWith("08")) return { phone: phone, source: c.source + "_resolved" };
        return { phone: phone, source: c.source + "_resolved" };
      }
    }

    // 🔄 STANDARDIZASI NOMOR BIASA (08 / 62)
    let p = rawId;
    if (p.startsWith("628")) return { phone: "0" + p.slice(2), source: c.source };
    if (p.startsWith("62")) return { phone: "0" + p.slice(2), source: c.source };
    if (p.startsWith("08")) return { phone: p, source: c.source };
    if (p.startsWith("8")) return { phone: "0" + p, source: c.source };
    
    // If it looks like a normal but foreign number (short/long), keep it for now
    if (p.length >= 8 && p.length <= 15) return { phone: p, source: c.source };
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
    const isFromMe = payload.fromMe === true;
    const msgText = (payload.body || '').toLowerCase().trim();
    const isCommandMsg = ['#pause', '#resume', '#human', '#ai'].includes(msgText);

    if (isFromMe && !isCommandMsg) {
        return { valid: false, reason: "outgoing_message_ignored" };
    }

    const isGroup = (payload.from || '').includes("@g.us");

    // Async extraction with Deep Multi-Source + LID Resolution
    const { phone: user_id, source: source_field } = await extractPhoneDeep(body, payload);

    if (!user_id && !isGroup) {
      return {
        valid: false,
        reason: "no_identifier_found"
      };
    }

    // 🧠 Extract message info
    let messageText = payload.body || '';
    let type = payload.type || "unknown";
    const hasMedia = payload.hasMedia || false;

    if (['chat', 'text', 'extended_text'].includes(type) && !hasMedia) {
      type = "text";
    } else if (hasMedia || ['image', 'video', 'document', 'audio', 'ptt', 'sticker'].includes(type)) {
      type = "media";
    }

    const pushName = payload.pushName || payload._data?.notifyName || (payload._data?.sender?.pushname) || 'Customer WA';

    // 🧠 IMPROVED: QUOTE/REPLY SUPPORT
    // WAHA usually provides quotedMsg in payload
    const quoted = payload.quotedMsg || payload._data?.quotedMsg;
    if (quoted && (quoted.body || quoted.caption)) {
      const quotedBody = quoted.body || quoted.caption || '';
      const quotedAuthor = quoted.pushName || 'System/Admin';
      // Prepend the quote context to help the AI understand what is being replied to
      messageText = `[REPLY TO "${quotedAuthor}": "${quotedBody.substring(0, 100)}${quotedBody.length > 100 ? '...' : ''}"] ${messageText}`;
    }

    return {
      valid: true,
      user_id: user_id || payload.from.split('@')[0], 
      reply_jid: payload.from,
      user_name: pushName,
      message: messageText,
      type,
      hasMedia,
      is_group: !!isGroup,
      source_field,
      raw_sender: payload.from,
      message_id: typeof payload.id === 'object' && payload.id !== null ? (payload.id._serialized || payload.id.id) : payload.id // 🆔 Fix Object serialization issue
    };
  } catch (err: any) {
    return {
      valid: false,
      reason: "parse_error",
      error: err.message
    };
  }
}
