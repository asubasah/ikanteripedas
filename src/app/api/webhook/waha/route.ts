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

const getSystemPrompt = (salesContact: string, customerName: string, currentTime: string) => `Kamu adalah asisten penjualan CV Multi Kreasi Metalindo (selalu sebut/tulis sebagai MK Metalindo), perusahaan jasa laser cutting, bending CNC, shearing, dan fabrikasi metal di Sidoarjo.
Waktu asli sistem (WIB) saat ini: ${currentTime}. Customer yang kamu layani bernama ${customerName}.

DILARANG KERAS mengeja nama perusahaan sebagai "MK Metal Indo", "MK Metel Indo", atau ejaan salah lainnya. Selalu gunakan "MK Metalindo".

Karakter & Bahasa:
- DEFAULT BAHASA KAMU ADALAH BAHASA INDONESIA YANG PROFESIONAL DAN RAMAH. JANGAN PERNAH MEMULAI PERCAKAPAN ATAU MENJAWAB DALAM BAHASA JAWA JIKA CUSTOMER BERTANYA DALAM BAHASA INDONESIA.
- HANYA balas menggunakan Bahasa Jawa (Suroboyoan/Sidoarjoan) JIKA DAN HANYA JIKA customer tersebut secara eksplisit menyapa atau bertanya menggunakan kosakata Bahasa Jawa terlebih dahulu.
- Jadilah asisten yang informatif, teknis namun ramah.

Panduan Panggilan & Salam:
- Gunakan salam pembuka sesuai waktu ASLI sistem (${currentTime}) HANYA pada pesan pertama atau jika customer yang menyapa duluan. JANGAN mengulang salam di setiap balasan lanjutan. Jadilah natural.
- Gunakan sapaan: "Bapak" (jika laki-laki), "Ibu" (jika perempuan), atau "Kakak".

Panduan Minta Nama Customer (PENTING):
- Jika nama customer "${customerName}" terlihat BUKAN nama orang asli (misalnya: "Customer WA", nama brand/toko, singkatan aneh, atau nama akun media sosial), maka DI PESAN PERTAMA kamu WAJIB menanyakan nama asli mereka terlebih dahulu.
- Contoh: "Selamat ${currentTime}! Terima kasih sudah menghubungi MK Metalindo. Mohon maaf, boleh kami tahu ini dengan Bapak/Ibu siapa? 🙏"
- Setelah customer memberikan namanya, baru lanjutkan membantu pertanyaan mereka.
- Jika customer sudah menyebutkan namanya di chat sebelumnya (cek histori), JANGAN tanya lagi.

Panduan Menangani Lampiran File:
- Jika pada histori percakapan sebelumnya kamu melihat teks [File From WA...] atau [Media Intercepted], ITU ARTINYA CUSTOMER SUDAH MENGIRIM FILE DENGAN SUKSES!
- JIKA CUSTOMER SUDAH MENGIRIM FILE, JANGAN PERNAH meminta file/gambar lagi!! Cukup ucapkan terima kasih, konfirmasi bahwa file sudah diterima di sistem, dan jelaskan bahwa tim Engineering/Sales kami sedang memproses/me-review file tersebut. Akhiri percakapan dengan ramah.

Panduan Komunikasi:
- Jawab dengan ramah, profesional, dan to-the-point dalam Bahasa Indonesia yang baik.
- Jangan sebut dirimu AI, kamu adalah tim MK Metalindo.
- Fokus membantu layanan kami (Laser Cutting, Bending, Shearing, Fabrikasi).
- Jika customer tanya teknis mendalam atau ingin deal, berikan kontak Sales Office: ${salesContact} (WA/Telp) atau arahkan ke 08113195800.

Informasi Perusahaan:
- Workshop: Jl. Tambak Sawah No.6B, Waru, Sidoarjo.
- Jam operasional: Senin-Sabtu 08.00-16.00 WIB.
- Material Laser: Besi, Stainless Steel, Aluminium, Mild Steel (Tebal maks 20mm).`;

const pendingMediaReplies = new Map<string, NodeJS.Timeout>();
const collectedMediaFiles = new Map<string, string[]>();

export async function POST(req: Request) {
  try {
    // Fetch dynamic sales contact
    const settingsRes = await query(`SELECT setting_value FROM app_settings WHERE setting_key = 'sales_contact_number'`);
    const dynamicSalesContact = settingsRes.rows.length > 0 ? settingsRes.rows[0].setting_value : '08961722712';
    
    // Format to WAHA standard (628...)
    let dynamicContactWaha = dynamicSalesContact.startsWith('0') 
        ? '62' + dynamicSalesContact.substring(1) + '@c.us' 
        : dynamicSalesContact + '@c.us';

    const body = await req.json();
    console.log('WAHA Webhook received:', JSON.stringify(body, null, 2));

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
    
    // 🔥 USE BAILEYS PRE-RESOLVED DATA
    // cleanPhone = real Indonesian phone (08xxx), rawRemoteJid = original WA address for reply routing
    let cleanPhone = body.payload?.cleanPhone || customerNumber;
    if (cleanPhone.startsWith('628')) {
      cleanPhone = '0' + cleanPhone.substring(2);
    } else if (cleanPhone.startsWith('62')) {
      cleanPhone = '0' + cleanPhone.substring(2);
    }
    const rawRemoteJid = body.payload?.rawRemoteJid || targetJid;
    const replyJid = rawRemoteJid; // Always reply to the RAW jid, not the resolved one
    
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

      // 🚨 Fix 31.6s timeout: Force IPv4 loopback because Node 18+ resolves localhost to ::1
      const WAHA_URL = 'http://127.0.0.1:3017'; 
      const WAHA_API_KEY = process.env.WAHA_API_KEY || 'mkm123';
      const CONTACT_SALES = dynamicContactWaha;

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
             await fetch(`${WAHA_URL}/api/sendText`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
               body: JSON.stringify({ chatId: replyJid, text: replyText, session: 'default' })
             });

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

             await fetch(`${WAHA_URL}/api/sendText`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
               body: JSON.stringify({ chatId: dynamicContactWaha, text: alertSales, session: 'default' })
             });

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
            await fetch(`${WAHA_URL}/api/sendText`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
              body: JSON.stringify({ chatId: replyJid, text: matchedFaq.response, session: 'default' })
            });

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
      console.log(`[TRACE 12] Calling OpenRouter AI...`);
      // Get history for context
      const historyResult = await query(
        `SELECT direction, message_text 
         FROM chat_history 
         WHERE lead_id = $1 
         ORDER BY timestamp DESC LIMIT 5`,
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

      const openRouterRes = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'MK Metalindo WA Chat'
        },
        body: JSON.stringify({
          model: process.env.AI_MODEL || "google/gemini-2.0-flash-001",
          messages: [
            { role: 'system', content: getSystemPrompt(dynamicSalesContact, userName, timeContext) },
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
        
        const typingDelayMs = Math.floor(Math.random() * (10000 - 4000 + 1)) + 4000;
        console.log(`[TRACE 13] OpenRouter Success! Delaying WAHA dispatch by ${typingDelayMs}ms to simulate typing.`);

        setTimeout(async () => {
          try {
            // 4. Send response via WAHA
            await fetch(`${WAHA_URL}/api/sendText`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-Api-Key': WAHA_API_KEY
              },
              body: JSON.stringify({
                chatId: replyJid,
                text: replyText,
                session: 'default' 
              })
            });
            console.log(`[TRACE 14] AI Message dispatched to Baileys Engine after delay`);

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
              await fetch(`${WAHA_URL}/api/sendText`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
                body: JSON.stringify({ 
                  chatId: dynamicContactWaha, 
                  text: `*Lead Handoff AI*: Customer *${userName}* (${customerNumber}) baru saja diarahkan ke Anda oleh AI Agent. Mohon bersiap untuk follow-up.`, 
                  session: 'default' 
                })
              });
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
            session: 'default' 
          })
        });
      }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[FATAL CRASH] WAHA Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
