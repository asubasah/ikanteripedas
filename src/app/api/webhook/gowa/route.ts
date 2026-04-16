import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseWebhook } from '@/lib/waUtils/waParser';
import { sendWhatsAppText } from '@/lib/waUtils/waSender';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

const getFaqData = (salesContact: string) => {
  const now = new Date();
  const hours = (now.getUTCHours() + 7) % 24;
  let timeStr = "Pagi";
  if (hours >= 11 && hours < 15) timeStr = "Siang";
  else if (hours >= 15 && hours < 19) timeStr = "Sore";
  else if (hours >= 19 || hours < 4) timeStr = "Malam";

  return [
    { keywords: ['pagi', 'siang', 'sore', 'malam', 'halo', 'hai', 'hi', 'assalam', 'permisi', 'p', 'bot', 'min'], response: `Selamat ${timeStr}! Terima kasih sudah menghubungi *MK Metalindo* 🏭\n\nSebelum kami bantu, boleh kami tahu ini dengan siapa dan dari perusahaan apa? 🙏` },
    { keywords: ['kirim', 'file', 'gambar', 'dxf', 'pdf', 'lampiran', 'upload', 'foto'], response: "Silakan langsung lampirkan file (DXF, PDF, atau Foto) di chat WhatsApp ini melalui menu **Lampiran/Attachment** agar segera kami estimasi." },
    { keywords: ['besar', 'ratusan', 'mb', 'gb', 'kapasitas', 'limit', 'email'], response: "Untuk file teknis berukuran **besar (di atas 20MB)**, silakan kirimkan via email ke **order@mkmetalindo.co.id** agar kualitas file engineering (DXF/PDF) tetap terjaga dengan baik dan tidak terkompresi oleh sistem chat. Terima kasih." },
    { keywords: ['lokasi', 'alamat', 'dimana', 'maps'], response: "Workshop kami di Jl. Tambak Sawah No.6B, Waru, Sidoarjo, Jawa Timur 61253. Silakan mampir kapan saja di jam kerja." },
    { keywords: ['kontak', 'wa', 'whatsapp', 'telp', 'hubungi', 'telepon'], response: `Untuk penjualan, silakan WA ke ${salesContact} atau telp (031) 9969 4300 di jam 08:00 - 16:00. Untuk teknis sales engineer di 08113195800.` },
    { keywords: ['jam', 'buka', 'operasional', 'kerja'], response: "Workshop kami buka Senin–Sabtu, jam 08.00–16.00 WIB." },
    { keywords: ['jasa', 'layanan', 'bisa cutting', 'laser', 'bending', 'shearing', 'fabrikasi', 'pipa', 'plat', 'potong'], response: "Selamat ${timeStr}! Terima kasih sudah menghubungi *MK Metalindo* 🏭\n\nKami melayani Jasa Laser Cutting (Plat & Pipa), Bending CNC, Shearing, dan Fabrikasi untuk material Besi, Stainless, Aluminium, dan Mild Steel.\n\nBoleh kami tahu ini dengan siapa dan dari perusahaan apa? 🙏" }
  ];
};

const getCoreSystemPrompt = (salesContact: string, customerName: string, currentTime: string) => `Kamu adalah asisten penjualan MK Metalindo, perusahaan jasa laser cutting, bending CNC, shearing, dan fabrikasi metal di Sidoarjo.
Waktu asli sistem (WIB) saat ini: ${currentTime}. Customer yang kamu layani bernama ${customerName}.

DILARANG KERAS mengeja nama perusahaan sebagai "MK Metal Indo", atau ejaan salah lainnya. Selalu gunakan "MK Metalindo".

Panduan Panggilan & Salam:
- Gunakan salam pembuka sesuai waktu ASLI sistem (${currentTime}) HANYA pada pesan pertama.
- Gunakan sapaan: "Bapak" (jika laki-laki), "Ibu" (jika perempuan), atau "Kakak".

Panduan Minta Nama Customer:
- Jika nama customer "${customerName}" terlihat BUKAN nama orang asli, tanyakan nama asli mereka di PESAN PERTAMA.

Informasi Operasional & Kapasitas:
- Jam operasional: Senin-Sabtu 08.00-16.00 WIB.
- Kapasitas Mesin Laser Cutting: Daya mesin 3000 Watt, dengan ukuran potongan maksimal 3 meter.
- Kontak Sales Office: ${salesContact} (WA/Telp) atau arahkan ke 08113195800.
- DILARANG membahas asal negara teknologi mesin (Eropa/China/dll).`;

const getLanguageLogicPrompt = () => `Karakter & Bahasa (Aturan 70-30):
- DEFAULT BAHASA KAMU ADALAH BAHASA INDONESIA YANG PROFESIONAL DAN RAMAH.
- PRIORITASKAN bahasa dari pesan TERAKHIR customer untuk menentukan bahasa balasanmu.
- ATURAN SWITCH BAHASA: 
  * Jika pesan customer mengandung unsur bahasa lain (Jawa, Inggris, Madura, dll) sebanyak minimal 30%, kamu diperbolehkan membalas dengan bahasa tersebut.
  * Namun, jika pesan berikutnya dari customer kembali menggunakan Bahasa Indonesia (min 70%), kamu WAJIB segera kembali menggunakan Bahasa Indonesia.
  * JANGAN terpaku pada histori chat lama.`;

const getCombinedSystemPrompt = (core: string, dynamic: string, langLogic: string) => `${core}\n\n${langLogic}\n\n${dynamic ? `INSTRUKSI TAMBAHAN/DINAMIS SAAT INI:\n${dynamic}` : ''}`;

const pendingMediaReplies = new Map<string, NodeJS.Timeout>();
const collectedMediaFiles = new Map<string, string[]>();
const pendingTextReplies = new Map<string, NodeJS.Timeout>();

export async function POST(req: Request) {
  try {
    const GOWA_URL = process.env.GOWA_URL || 'http://103.174.114.249:3010';
    const GOWA_API_KEY = process.env.GOWA_API_KEY || ''; // Usually empty for GoWA by default

    // Fetch dynamic settings
    const settingsRes = await query(`SELECT setting_key, setting_value FROM app_settings`);
    const settings = settingsRes.rows.reduce((acc: any, row: any) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});

    const dynamicSalesContact = settings['sales_contact_number'] || '08113438800';
    const dynamicAiPrompt = settings['ai_system_prompt'] || '';
    const dynamicAiModel = settings['ai_model'] || process.env.AI_MODEL || 'google/gemini-2.0-flash-001';
    
    let dynamicContactGowa = dynamicSalesContact.replace(/\D/g, "");
    if (dynamicContactGowa.startsWith('0')) dynamicContactGowa = '62' + dynamicContactGowa.substring(1);
    const dynamicContactGowaJid = dynamicContactGowa + '@s.whatsapp.net';

    const body = await req.json();
    console.log('[GOWA] Webhook Payload:', JSON.stringify(body, null, 2));

    const parsed = await parseWebhook(body);

    const MKM_DEVICE_ID = process.env.GOWA_DEVICE_ID || 'd1b23cd1-d667-442d-9271-89ea2f7d54aa';
    const MKM_MARKETING_DEVICE_ID = 'd2b23cd1-d667-442d-9271-89ea2f7d54aa';
    const MKM_PHONE_FILTER = '628113195800';
    const incomingDeviceId = body.device_id || '';
    const incomingPhone = incomingDeviceId.split('@')[0];
    const isMarketingDevice = incomingDeviceId === MKM_MARKETING_DEVICE_ID;

    // 🚨 SAFETY FILTER: Only process if message is for MKM number OR matches known UUID
    const isMkmDevice = (incomingPhone === MKM_PHONE_FILTER) || (incomingDeviceId === MKM_DEVICE_ID) || isMarketingDevice;

    if (!isMkmDevice) {
      console.log(`[GOWA IGNORE]: Message for other device ${incomingDeviceId}. Expected ${MKM_PHONE_FILTER}, ${MKM_DEVICE_ID}, or ${MKM_MARKETING_DEVICE_ID}`);
      return NextResponse.json({ success: true, ignored: true, reason: "mismatched_device_id" });
    }

    if (!parsed.valid) {
      console.log("[GOWA SKIP]:", parsed.reason);
      return NextResponse.json({ success: true, ignored: true, reason: parsed.reason });
    }

    if (parsed.is_group) {
      console.log("[GOWA SKIP]: group_message");
      return NextResponse.json({ success: true, ignored: true });
    }

    const { 
      user_id: customerNumber = 'unknown', 
      reply_jid: targetJid = '', 
      user_name: userName = 'Customer WA', 
      message: text = '', 
      type: parsedType = 'text', 
      gateway = 'gowa', 
      device_id = 'default' 
    } = parsed as any;
    const cleanPhone = customerNumber;
    const sessionId = `gowa-${cleanPhone}`;
    
    // Standardize target phone to international format (62...) and append @s.whatsapp.net
    let targetPhone = targetJid?.split('@')[0] || cleanPhone;
    if (targetPhone.startsWith('08')) {
        targetPhone = '62' + targetPhone.substring(1);
    }
    if (!targetPhone.includes('@')) {
        targetPhone = targetPhone + '@s.whatsapp.net';
    }

    console.log(`[GOWA FIRE]: phone=${cleanPhone}, target=${targetPhone}, text=${text}, type=${parsedType}`);

    // DB Sync
    let leadResult = await query(
      `INSERT INTO leads_mk (nama_lead, nomor_wa, last_chat, sumber_lead) 
       VALUES ($1, $2, NOW(), 'WhatsApp') 
       ON CONFLICT (nomor_wa) 
       DO UPDATE SET 
         last_chat = NOW(),
         nama_lead = CASE WHEN leads_mk.nama_lead = 'Customer WA' THEN EXCLUDED.nama_lead ELSE leads_mk.nama_lead END
       RETURNING id, nama_lead, status_crm, is_jawab_ai`,
      [userName, cleanPhone]
    );

    const leadId = leadResult.rows[0].id;
    const currentStatus = leadResult.rows[0].status_crm;
    const isJawabAi = leadResult.rows[0].is_jawab_ai ?? true;

    // Record incoming
    await query(
      `INSERT INTO chat_history (lead_id, sender_name, message_text, direction, session_id) 
       VALUES ($1, $2, $3, 'incoming', $4)`,
      [leadId, userName, text, sessionId]
    );

    if (!isJawabAi) {
        console.log(`[GOWA] AI is PAUSED for Lead ID: ${leadId}.`);
        return NextResponse.json({ success: true, action: 'ai_is_paused' });
    }

    // --- Media Bridge (Simplified for GoWA) ---
    if (parsedType === 'media') {
       // logic for media batching (similar to waha)
       if (pendingMediaReplies.has(leadId)) clearTimeout(pendingMediaReplies.get(leadId));
       if (!collectedMediaFiles.has(leadId)) collectedMediaFiles.set(leadId, []);
       
       // Handle media download if needed, but GoWA usually gives path if local.
       // For now, acknowledgement
       const timeout = setTimeout(async () => {
            const replyText = `Terima kasih Kakak ${userName}, file sudah kami terima. Kami akan teruskan ke tim engineer. 🙏`;
            await fetch(`${GOWA_URL}/send/message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Device-Id': device_id },
              body: JSON.stringify({ phone: targetPhone, message: replyText })
            });

            // Notify Sales
            await fetch(`${GOWA_URL}/send/message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Device-Id': device_id },
              body: JSON.stringify({ phone: dynamicContactGowaJid, message: `*File Masuk (MKM GoWA)*\nDari: ${userName}\nNo: ${cleanPhone}\nCek dashboard untuk detail.` })
            });

            pendingMediaReplies.delete(leadId);
            collectedMediaFiles.delete(leadId);
       }, 60000);
       pendingMediaReplies.set(leadId, timeout);
       return NextResponse.json({ success: true, action: 'media_queued' });
    }

    // --- FAQ & AI Logic ---
    const prevMsgCount = await query(`SELECT COUNT(*) as cnt FROM chat_history WHERE lead_id = $1 AND direction = 'incoming'`, [leadId]);
    const incomingCount = parseInt(prevMsgCount.rows[0].cnt);
    const lowerMessage = text.toLowerCase();
    const isComplexQuery = ['harga', 'biaya', 'pricelist', 'berapa', 'estimasi', 'hitung', 'waktu', 'ukuran'].some(k => lowerMessage.includes(k));

    if (!isComplexQuery && incomingCount <= 1) {
      const faqData = getFaqData(dynamicSalesContact);
      const matchedFaq = faqData.find((f: any) => f.keywords.some((k: any) => new RegExp(`\\b${k}\\b`, 'i').test(lowerMessage)));
      if (matchedFaq) {
        setTimeout(async () => {
          await sendWhatsAppText(targetPhone, matchedFaq.response);
          await query(`INSERT INTO chat_history (lead_id, sender_name, message_text, direction, is_ai_response, session_id) VALUES ($1, 'MK Metalindo', $2, 'outgoing', true, $3)`, [leadId, matchedFaq.response, sessionId]);
        }, 5000);
        return NextResponse.json({ success: true, action: 'faq_queued' });
      }
    }

    // AI Response with Debounce
    if (pendingTextReplies.has(leadId)) clearTimeout(pendingTextReplies.get(leadId)!);
    
    const debounceTimer = setTimeout(async () => {
      try {
        const historyResult = await query(`SELECT direction, message_text FROM chat_history WHERE lead_id = $1 ORDER BY timestamp DESC LIMIT 7`, [leadId]);
        const conversationHistory = historyResult.rows.reverse().map((row: any) => ({
          role: row.direction === 'incoming' ? 'user' : 'assistant',
          content: row.message_text
        }));

        const now = new Date();
        const hours = (now.getUTCHours() + 7) % 24;
        let timeContext = "Pagi";
        if (hours >= 11 && hours < 15) timeContext = "Siang";
        else if (hours >= 15 && hours < 19) timeContext = "Sore";
        else if (hours >= 19 || hours < 4) timeContext = "Malam";

        let fullPrompt = '';
        
        // ✨ MARKETING INTENT DETECTION
        if (isMarketingDevice && currentStatus === 'Cold') {
          console.log(`[GOWA AI] Analyzing intent for Marketing Blast Lead: ${leadId}`);
          fullPrompt = `Kamu adalah analis niat (Intent Analyzer) untuk pesan WhatsApp B2B MK Metalindo.
Lead ini baru saja menerima blast penawaran marketing (Laser Cutting & Bending CNC).
Deteksi niat dari balasan lead saat ini, dan berikan balasan yang sangat ringkas dan natural.

ATURAN:
1. Jika balasan berisi penolakan kasar, makian, tidak mau diganggu, "jangan wa lagi", dll:
   Mulakan pesan bahasamu dengan kata [REJECTED]. Lanjutkan dengan permohonan maaf sopan maksimal 2 kalimat (Misal: "[REJECTED] Baik Bapak/Ibu, mohon maaf atas ketidaknyamanannya. Terima kasih atas waktunya.").
2. Jika balasan berisi ketertarikan, tanya harga, minta proposal, kirim gambar, dll:
   Mulakan pesan bahasamu dengan kata [INTERESTED]. Lanjutkan dengan jawaban antusias (Misal: "[INTERESTED] Tentu Bapak/Ibu, silakan kirimkan file gambarnya untuk kami estimasikan.").
3. Jika niatnya netral atau bertanya hal lain:
   Mulakan pesan bahasamu dengan kata [INTERESTED].`;
        } else {
          // Standard CS Prompt
          fullPrompt = getCombinedSystemPrompt(getCoreSystemPrompt(dynamicSalesContact, userName, timeContext), dynamicAiPrompt, getLanguageLogicPrompt());
        }

        console.log(`[GOWA AI] Sending to OpenRouter. Model: ${dynamicAiModel}. Context: ${conversationHistory.length} messages.`);
        const openRouterStartTime = Date.now();
        const openRouterRes = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          },
          body: JSON.stringify({
            model: dynamicAiModel,
            messages: [{ role: 'system', content: fullPrompt }, ...conversationHistory],
            user: sessionId, temperature: 0.7
          })
        });

        console.log(`[GOWA AI] OpenRouter returned status: ${openRouterRes.status} in ${Date.now() - openRouterStartTime}ms`);

        if (openRouterRes.ok) {
          const aiData = await openRouterRes.json();
          let replyText = aiData.choices?.[0]?.message?.content || '';
          
          if (isMarketingDevice && currentStatus === 'Cold') {
            if (replyText.startsWith('[REJECTED]')) {
               replyText = replyText.replace('[REJECTED]', '').trim();
               await query(`UPDATE leads_mk SET status_crm = 'Rejected' WHERE id = $1`, [leadId]);
            } else if (replyText.startsWith('[INTERESTED]')) {
               replyText = replyText.replace('[INTERESTED]', '').trim();
               await query(`UPDATE leads_mk SET status_crm = 'Interested' WHERE id = $1`, [leadId]);
            }
          }
          
          setTimeout(async () => {
            const headers: Record<string, string> = { 
                'Content-Type': 'application/json',
                'X-Device-Id': incomingDeviceId
            };
            if (process.env.GOWA_BASIC_AUTH) {
                headers['Authorization'] = `Basic ${Buffer.from(process.env.GOWA_BASIC_AUTH).toString('base64')}`;
            }

            // Using unified sender for consistency and reliability
            const sendAiRes = await sendWhatsAppText(targetPhone, replyText);

            if (sendAiRes.success) {
              await query(`INSERT INTO chat_history (lead_id, sender_name, message_text, direction, is_ai_response, session_id) VALUES ($1, 'MK Metalindo', $2, 'outgoing', true, $3)`, [leadId, replyText, sessionId]);
              
              if (replyText.toLowerCase().includes(dynamicSalesContact) || replyText.toLowerCase().includes('luluk')) {
                await query(`UPDATE leads_mk SET status_crm = 'Interested' WHERE id = $1`, [leadId]);
                
                await sendWhatsAppText(dynamicContactGowa, `*Lead Handoff Marketing (GoWA)*: Customer *${userName}* diteruskan ke Sales (${targetPhone}).`);
              }
            } else {
              console.error("[GOWA AI ERROR] Failed to send reply via GoWA/WAHA:", sendAiRes.error);
            }
          }, 4000);
        } else {
          const errorText = await openRouterRes.text();
          console.error("[GOWA AI ERROR] OpenRouter failed:", openRouterRes.status, errorText);
          
          // Fallback response for stability
          const fallbackText = "Terima kasih sudah menghubungi MK Metalindo. Mohon maaf, sistem kami sedang mengalami kendala teknis singkat. Tim sales kami akan segera membalas chat ini secara manual. 🙏";
          
          setTimeout(async () => {
            const sendFallbackRes = await sendWhatsAppText(targetPhone, fallbackText);
            if (sendFallbackRes.success) {
              await query(`INSERT INTO chat_history (lead_id, sender_name, message_text, direction, is_ai_response, session_id) VALUES ($1, 'MK Metalindo', $2, 'outgoing', true, $3)`, [leadId, fallbackText, sessionId]);
            }
          }, 2000);
        }
      } catch (e) {
        console.error("[GOWA AI ERROR]", e);
      } finally {
        pendingTextReplies.delete(leadId);
      }
    }, 4000);

    pendingTextReplies.set(leadId, debounceTimer);
    return NextResponse.json({ success: true, action: 'text_queued' });
  } catch (error) {
    console.error('[FATAL] GOWA Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
