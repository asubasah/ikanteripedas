import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseWebhook } from '@/lib/waUtils/waParser';
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

    const body = await req.json();
    console.log('[GOWA] Webhook Payload:', JSON.stringify(body, null, 2));

    const parsed = await parseWebhook(body);

    const MKM_DEVICE_ID = process.env.GOWA_DEVICE_ID || '628113195800';
    const incomingDeviceId = (body.device_id || '').split('@')[0];

    // 🚨 SAFETY FILTER: Only process if message is for MKM number
    if (incomingDeviceId !== MKM_DEVICE_ID) {
      console.log(`[GOWA IGNORE]: Message for other device ${incomingDeviceId}. Expected ${MKM_DEVICE_ID}`);
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
    const targetPhone = targetJid?.split('@')[0] || cleanPhone;

    console.log(`[GOWA FIRE]: phone=${cleanPhone}, text=${text}, type=${parsedType}, device=${device_id}`);

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
              body: JSON.stringify({ phone: dynamicContactGowa, message: `*File Masuk (MKM GoWA)*\nDari: ${userName}\nNo: ${cleanPhone}\nCek dashboard untuk detail.` })
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
          await fetch(`${GOWA_URL}/send/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Device-Id': device_id },
            body: JSON.stringify({ phone: targetPhone, message: matchedFaq.response })
          });
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

        const fullPrompt = getCombinedSystemPrompt(getCoreSystemPrompt(dynamicSalesContact, userName, timeContext), dynamicAiPrompt, getLanguageLogicPrompt());

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

        if (openRouterRes.ok) {
          const aiData = await openRouterRes.json();
          const replyText = aiData.choices?.[0]?.message?.content || '';
          
          setTimeout(async () => {
            const resAi = await fetch(`${GOWA_URL}/send/message`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Device-Id': device_id },
              body: JSON.stringify({ phone: targetPhone, message: replyText })
            });

            if (resAi.ok) {
              await query(`INSERT INTO chat_history (lead_id, sender_name, message_text, direction, is_ai_response, session_id) VALUES ($1, 'MK Metalindo', $2, 'outgoing', true, $3)`, [leadId, replyText, sessionId]);
              
              if (replyText.toLowerCase().includes(dynamicSalesContact) || replyText.toLowerCase().includes('luluk')) {
                await query(`UPDATE leads_mk SET status_crm = 'Interested' WHERE id = $1`, [leadId]);
                await fetch(`${GOWA_URL}/send/message`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json', 'X-Device-Id': device_id },
                  body: JSON.stringify({ phone: dynamicContactGowa, message: `*Lead Handoff GoWA*: Customer *${userName}* diteruskan ke Sales.` })
                });
              }
            }
          }, 4000);
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
