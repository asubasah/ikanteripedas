import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { parseWebhook } from '@/lib/waUtils/waParser';
import { writeFile } from 'fs/promises';
import { join } from 'path';

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
    // Fetch dynamic settings
    const settingsRes = await query(`SELECT setting_key, setting_value FROM app_settings`);
    const settings = settingsRes.rows.reduce((acc: any, row: any) => {
      acc[row.setting_key] = row.setting_value;
      return acc;
    }, {});

    const dynamicSalesContact = settings['sales_contact_number'] || '08113438800';
    const dynamicAiPrompt = settings['ai_system_prompt'] || '';
    const dynamicAiModel = settings['ai_model'] || process.env.AI_MODEL || 'google/gemini-2.0-flash-001';
    
    // Format to WAHA standard (628...)
    const WAHA_SESSION_NAME = process.env.WAHA_SESSION_NAME || 'default';
    
    // Format to WAHA standard (628...)
    let dynamicContactWaha = dynamicSalesContact.startsWith('0') 
        ? '62' + dynamicSalesContact.substring(1) + '@c.us' 
        : dynamicSalesContact + (dynamicSalesContact.includes('@') ? '' : '@c.us');

    const body = await req.json();
    console.log('--- RAW PAYLOAD ---', JSON.stringify(body, null, 2));
    console.log('WAHA Webhook received summary:', body.event, body.session);

    // 1. Triage & Parse via waParser
    const parsed = await parseWebhook(body);

    // 🚨 Filter invalid (bukan pesan user atau nomor ga valid)
    if (!parsed.valid) {
      console.log("SKIP:", parsed.reason);
      return NextResponse.json({ success: true, ignored: true, reason: parsed.reason });
    }

    // 🚨 Skip group messages
    if (parsed.is_group) {
      console.log("SKIP: group_message");
      return NextResponse.json({ success: true, ignored: true });
    }

    // 🚫 IGNORE WHATSAPP STATUS (STORIES) AND SYSTEM MESSAGES
    const message = body.payload;
    if (
      message.from === 'status@broadcast' || 
      message.isStatus || 
      message.type === 'e2e_notification' ||
      message.type === 'protocol'
    ) {
      console.log('SKIP: status/system_message from WAHA.');
      return NextResponse.json({ success: true, ignored: true });
    }

    const { user_id: customerNumber, reply_jid: targetJid, user_name: userName, message: text, type: parsedType, hasMedia, source_field, raw_sender } = parsed;
    
    // Standardize phone/JID from WAHA payload
    let cleanPhone = customerNumber;
    let rawRemoteJid = targetJid;
    // Normalize JID to @c.us for reliable delivery on some WAHA engines
    const replyJid = rawRemoteJid;
    
    const sessionId = `waha-${cleanPhone}`;

    console.log(`🔥 PARSED: phone=${cleanPhone}, replyTo=${replyJid}, text=${text}, type=${parsedType}`);

      let leadResult;
      try {
        leadResult = await query(
          `INSERT INTO leads_mk (nama_lead, nomor_wa, last_chat, sumber_lead) 
           VALUES ($1, $2, NOW(), 'WhatsApp') 
           ON CONFLICT (nomor_wa) 
           DO UPDATE SET 
             last_chat = NOW(),
             nama_lead = CASE WHEN leads_mk.nama_lead = 'Customer WA' THEN EXCLUDED.nama_lead ELSE leads_mk.nama_lead END
           RETURNING id, nama_lead, status_crm, last_chat, is_jawab_ai`,
          [userName, cleanPhone]
        );
      } catch (dbErr: any) {
        console.warn("[DB WARNING]:", dbErr.message);
        if (dbErr.code === '42703' || (dbErr.message && dbErr.message.includes('is_jawab_ai'))) {
          console.log('[MIGRATION] Auto-adding is_jawab_ai column dynamically for VPS...');
          await query('ALTER TABLE leads_mk ADD COLUMN IF NOT EXISTS is_jawab_ai BOOLEAN DEFAULT TRUE');
          leadResult = await query(
            `INSERT INTO leads_mk (nama_lead, nomor_wa, last_chat, sumber_lead) 
             VALUES ($1, $2, NOW(), 'WhatsApp') 
             ON CONFLICT (nomor_wa) 
             DO UPDATE SET 
               last_chat = NOW(),
               nama_lead = CASE WHEN leads_mk.nama_lead = 'Customer WA' THEN EXCLUDED.nama_lead ELSE leads_mk.nama_lead END
             RETURNING id, nama_lead, status_crm, last_chat, is_jawab_ai`,
            [userName, cleanPhone]
          );
        } else {
          throw dbErr;
        }
      }
      const leadId = leadResult.rows[0].id;
      const currentStatus = leadResult.rows[0].status_crm;
      const lastChatFromDB = leadResult.rows[0].last_chat;
      const isJawabAi = leadResult.rows[0].is_jawab_ai ?? true;
      console.log(`[TRACE 1] Lead ID: ${leadId}, Status: ${currentStatus}, Phone: ${cleanPhone}, AI Active: ${isJawabAi}`);

      // Handle Admin Command triggers
      if (body.payload?.fromMe === true) {
         const lowerText = text.toLowerCase().trim();
         if (['#pause', '#human'].includes(lowerText)) {
             await query(`UPDATE leads_mk SET is_jawab_ai = false WHERE id = $1`, [leadId]);
             console.log(`[TRACE AI HANDOFF] AI Paused for Lead ID: ${leadId}`);
             return NextResponse.json({ success: true, action: 'ai_paused' });
         } else if (['#resume', '#ai'].includes(lowerText)) {
             await query(`UPDATE leads_mk SET is_jawab_ai = true WHERE id = $1`, [leadId]);
             console.log(`[TRACE AI HANDOFF] AI Resumed for Lead ID: ${leadId}`);
             return NextResponse.json({ success: true, action: 'ai_resumed' });
         }
      }

      // 2. Record incoming message
      await query(
        `INSERT INTO chat_history (lead_id, sender_name, message_text, direction, session_id) 
         VALUES ($1, $2, $3, 'incoming', $4)`,
        [leadId, userName, text, sessionId]
      );

      // Stop AI processing if Handoff is active
      if (!isJawabAi) {
          console.log(`[TRACE 1.5] AI is PAUSED for Lead ID: ${leadId}. Skipping AI response.`);
          return NextResponse.json({ success: true, action: 'ai_is_paused' });
      }

      // 🚨 Standard WAHA (Docker)
      const WAHA_URL = process.env.WAHA_URL || 'http://127.0.0.1:3007'; 
      const WAHA_API_KEY = process.env.WAHA_API_KEY || 'mkm123';

      // --- 2.5: INTERCEPT MEDIA / FILES TO SAVE TOKENS ---
      if (parsedType === 'media') {
        console.log(`[TRACE 2] Processing Media Intercept...`);
        const { message_id } = parsed;
        let fileUrl = null;
        let fileName = `wa_${Date.now()}_file`;

        // 🔥 Hybrid Media Fetcher
        try {
          const directFile = body.payload?._data?.localFileName;
          
          if (directFile) {
            fileName = directFile;
            fileUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/uploads/${fileName}`;
            console.log(`[TRACE 3] Media directly injected: ${fileUrl}`);
          } else {
            const encodedId = encodeURIComponent(message_id);
            const wahaFileUrl = `${WAHA_URL}/api/default/messages/${encodedId}/download`;
            console.log(`📡 FETCHING MEDIA FROM WAHA (Fallback): ${wahaFileUrl}`);

            const wahaRes = await fetch(wahaFileUrl, {
              headers: { 'X-Api-Key': WAHA_API_KEY }
            });
            
            if (wahaRes.ok) {
              const buffer = Buffer.from(await wahaRes.arrayBuffer());
              const contentType = wahaRes.headers.get('content-type') || 'application/octet-stream';
              let ext = contentType.split('/')[1]?.split(';')[0] || 'bin';
              if (ext === 'jpeg') ext = 'jpg';
              
              fileName = `wa_${message_id.replace(/[^a-zA-Z0-9]/g, '')}.${ext}`;
              const outPath = join(process.cwd(), 'public', 'uploads', fileName);
              await writeFile(outPath, buffer);
              fileUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/uploads/${fileName}`;
              console.log(`✅ FALLBACK MEDIA SAVED LOCALLY: ${fileUrl}`);
            } else {
              const errLog = await wahaRes.text();
              console.warn(`⚠️ WAHA API returned ${wahaRes.status}: ${errLog}`);
            }
          }
        } catch (e: any) {
          console.error("❌ Media Bridge ERROR:", e.message);
        }

        // 1. CLEAR EXISTING TIMEOUT
        if (pendingMediaReplies.has(leadId)) {
          clearTimeout(pendingMediaReplies.get(leadId));
        }

        // 2. COLLECT MEDIA FILES
        if (!collectedMediaFiles.has(leadId)) {
          collectedMediaFiles.set(leadId, []);
        }
        if (fileUrl) {
           collectedMediaFiles.get(leadId)!.push(fileUrl);
        }

        // Update status and save outgoing chat (to keep record of intercept)
        await query(`UPDATE leads_mk SET status_crm = 'Interested' WHERE id = $1`, [leadId]);
        await query(
          `INSERT INTO chat_history (lead_id, sender_name, message_text, direction, is_ai_response, session_id) 
           VALUES ($1, 'System (Auto)', $2, 'outgoing', true, $3)`,
          [leadId, fileUrl ? `[File From WA: ${fileName}] Link: ${fileUrl}` : `[Media Intercepted - Forwarded to Sales Office]`, sessionId]
        );

        // 3. SET NEW TIMEOUT (60 seconds)
        const timeout = setTimeout(async () => {
             const finalFiles = collectedMediaFiles.get(leadId) || [];
             const fileCount = finalFiles.length;

             const replyText = `Terima kasih Kakak ${userName}, file/lampiran sudah kami terima dengan baik. Apakah file ini saja atau kah ada file lain atau tambahan info spesifikasi? Jika tidak, kami akan teruskan ke tim engineer MK Metalindo. 🙏`;
             
             // Reply to user
             const resUser = await fetch(`${WAHA_URL}/api/sendText`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
               body: JSON.stringify({ chatId: replyJid, text: replyText, session: WAHA_SESSION_NAME })
             });
             console.log(`[WAHA] Reply to user status: ${resUser.status} ${resUser.statusText}`);

             // Notify Sales PIC
             const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`;
             const alertParts = [
               '*📋 BATCH FILE MASUK (WhatsApp)*',
               '',
               `🟢 Total File Diterima: ${fileCount}`,
               '',
               '👤 Dari: *' + userName + '*',
               '📞 No: ' + cleanPhone,
               '📄 Link Files:\n' + finalFiles.map((f, i) => `${i+1}. ${f}`).join('\n'),
               '',
               '💡 Untuk detail lengkap histori chat, silakan cek *Monitoring Dashboard CRM*:',
               dashboardUrl
             ];
             const alertSales = alertParts.join('\n');

             const resSales = await fetch(`${WAHA_URL}/api/sendText`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
               body: JSON.stringify({ chatId: dynamicContactWaha, text: alertSales, session: WAHA_SESSION_NAME })
             });
             console.log(`[WAHA] Notify Sales status: ${resSales.status} ${resSales.statusText}`);

             // Cleanup Memory
             pendingMediaReplies.delete(leadId);
             collectedMediaFiles.delete(leadId);
             console.log(`[TRACE 5] Batch Media Processed: sent 1 reply for ${fileCount} files.`);
        }, 60000); // 1 MINUTE DURATION

        pendingMediaReplies.set(leadId, timeout);

        console.log(`[TRACE 2.5] Media Intercept: queued batch response. (Timeout 60s)`);
        return NextResponse.json({ success: true, action: 'media_queued_for_batching' });
      }
      // ---------------------------------------------------

      // 🔥 2.7: FLEXIBLE LEAD RE-ENGAGEMENT
      // AI always responds, even for Interested leads. No hard lockout.
      console.log(`[TRACE 6] Status: ${currentStatus}. AI will respond flexibly.`);
      const isReturningLead = currentStatus === 'Interested';

      // --- 2.8: TRY FAQ FIRST (ONLY for brand new leads with no chat history) ---
      const prevMsgCount = await query(
        `SELECT COUNT(*) as cnt FROM chat_history WHERE lead_id = $1 AND direction = 'incoming'`,
        [leadId]
      );
      const incomingCount = parseInt(prevMsgCount.rows[0].cnt);
      console.log(`[TRACE 10] Checking FAQ... (${incomingCount} previous incoming messages)`);
      const lowerMessage = text.toLowerCase();
      
      // FAQ only triggers for the FIRST message from a new lead (no conversation history)
      // Once a conversation is going, AI handles everything for contextual responses.
      const isComplexQuery = ['harga', 'biaya', 'pricelist', 'berapa', 'estimasi', 'hitung', 'waktu', 'ukuran'].some(k => lowerMessage.includes(k));
      
      let matchedFaq = null;
      if (!isComplexQuery && incomingCount <= 1) {
        const faqData = getFaqData(dynamicSalesContact);
        matchedFaq = faqData.find((f: any) => 
          f.keywords.some((k: any) => new RegExp(`\\b${k}\\b`, 'i').test(lowerMessage))
        );
      }

      if (matchedFaq) {
        const delayMs = Math.floor(Math.random() * (12000 - 5000 + 1)) + 5000;
        console.log(`[TRACE 11] FAQ Matched! Delaying response by ${delayMs}ms to simulate human typing.`);
        
        // Decouple from webhook synchronous response
        setTimeout(async () => {
          try {
            const resFaq = await fetch(`${WAHA_URL}/api/sendText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
              body: JSON.stringify({ chatId: replyJid, text: matchedFaq.response, session: WAHA_SESSION_NAME })
            });
            console.log(`[WAHA] FAQ Reply status: ${resFaq.status} ${resFaq.statusText}`);

            await query(
              `INSERT INTO chat_history (lead_id, sender_name, message_text, direction, is_ai_response, session_id) 
               VALUES ($1, 'MK Metalindo', $2, 'outgoing', true, $3)`,
              [leadId, matchedFaq.response, sessionId]
            );
          } catch (e: any) {
            console.error("[FAQ Background Task Error]:", e.message);
          }
        }, delayMs);

        return NextResponse.json({ success: true, action: 'faq_queued' });
      }
      // ---------------------------------------------------

      // 3. AI Logic
      if (pendingTextReplies.has(leadId)) {
        clearTimeout(pendingTextReplies.get(leadId)!);
        console.log(`[TRACE 11.5] Cleared previous debounce timer for ${leadId}.`);
      }

      console.log(`[TRACE 12] Waiting 4 seconds to batch messages for ${leadId}...`);
      
      const debounceTimer = setTimeout(async () => {
        try {
          console.log(`[TRACE 12.1] Debounce complete for ${leadId}. Fetching history and calling AI...`);
          // Get history for context
          const historyResult = await query(
            `SELECT direction, message_text 
             FROM chat_history 
             WHERE lead_id = $1 
             ORDER BY timestamp DESC LIMIT 7`,
            [leadId]
          );

          const conversationHistory = historyResult.rows.reverse().map((row: any) => ({
            role: row.direction === 'incoming' ? 'user' : 'assistant',
            content: row.message_text
          }));

          const now = new Date();
          const hours = (now.getUTCHours() + 7) % 24; // Convert UTC to WIB
          let timeContext = "Pagi";
          if (hours >= 11 && hours < 15) timeContext = "Siang";
          else if (hours >= 15 && hours < 19) timeContext = "Sore";
          else if (hours >= 19 || hours < 4) timeContext = "Malam";

              const corePrompt = getCoreSystemPrompt(dynamicSalesContact, userName, timeContext);
              const langLogic = getLanguageLogicPrompt();
              const fullPrompt = getCombinedSystemPrompt(corePrompt, dynamicAiPrompt, langLogic);

              const openRouterRes = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                  'HTTP-Referer': 'http://localhost:3000',
                  'X-Title': 'MK Metalindo WA Chat'
                },
                body: JSON.stringify({
                  model: dynamicAiModel,
                  messages: [
                    { role: 'system', content: fullPrompt },
                    ...conversationHistory
                  ],
              user: sessionId,
              max_tokens: 500,
              temperature: 0.7
            })
          });

          if (openRouterRes.ok) {
            const aiData = await openRouterRes.json();
            const replyText = aiData.choices?.[0]?.message?.content || '';
            
            const typingDelayMs = Math.floor(Math.random() * (7000 - 3000 + 1)) + 3000;
            console.log(`[TRACE 13] OpenRouter Success! Delaying WAHA dispatch by ${typingDelayMs}ms.`);

            setTimeout(async () => {
              try {
                // 4. Send response via WAHA
                const resAi = await fetch(`${WAHA_URL}/api/sendText`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    'X-Api-Key': WAHA_API_KEY
                  },
                  body: JSON.stringify({
                    chatId: replyJid,
                    text: replyText,
                    session: WAHA_SESSION_NAME 
                  })
                });
                console.log(`[WAHA] AI Response status: ${resAi.status} ${resAi.statusText}`);
                if (!resAi.ok) {
                  console.error(`[WAHA ERROR] AI content NOT delivered to ${replyJid}:`, await resAi.text());
                } else {
                  console.log(`[TRACE 14] AI Message dispatched to Baileys Engine after delay`);
                }

                // 5. Record outgoing message
                await query(
                  `INSERT INTO chat_history (lead_id, sender_name, message_text, direction, is_ai_response, session_id) 
                   VALUES ($1, 'MK Metalindo', $2, 'outgoing', true, $3)`,
                  [leadId, replyText, sessionId]
                );

                // Auto-upgrade status & Notify Sales if AI hands off
                if (replyText.toLowerCase().includes(dynamicSalesContact) || replyText.toLowerCase().includes('luluk')) {
                  await query(`UPDATE leads_mk SET status_crm = 'Interested' WHERE id = $1`, [leadId]);
                  
                  // Send notification to Sales via WAHA
                  const resAiSales = await fetch(`${WAHA_URL}/api/sendText`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
                    body: JSON.stringify({ 
                      chatId: dynamicContactWaha, 
                      text: `*Lead Handoff AI*: Customer *${userName}* (${customerNumber}) baru saja diarahkan ke Anda oleh AI Agent. Mohon bersiap untuk follow-up.`, 
                      session: WAHA_SESSION_NAME 
                    })
                  });
                  console.log(`[WAHA] AI Sales Notification status: ${resAiSales.status}`);
                }
              } catch (e: any) {
                 console.error("[AI Background Task Error]:", e.message);
              }
            }, typingDelayMs);
          } else {
            // OpenRouter API failed (e.g., 503 No Capacity)
            const errorText = await openRouterRes.text();
            console.error("[TRACE 13 ERROR] OpenRouter API Error:", openRouterRes.status, errorText);
            
            // Notify user about system overload
            await fetch(`${WAHA_URL}/api/sendText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
              body: JSON.stringify({
                chatId: replyJid,
                text: "Mohon maaf, sistem AI kami sedang mengalami kepadatan respons. Mohon ulangi pertanyaan Anda beberapa saat lagi, atau hubungi Sales Tech kami di 08113195800.",
                session: WAHA_SESSION_NAME 
              })
            });
          }
        } catch (e: any) {
           console.error("[Debounce OpenRouter Error]", e);
        } finally {
           pendingTextReplies.delete(leadId);
        }
      }, 4000); // 4 seconds debounce

      pendingTextReplies.set(leadId, debounceTimer);
      return NextResponse.json({ success: true, action: 'text_queued_for_debounce' });
  } catch (error) {
    console.error('[FATAL CRASH] WAHA Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
