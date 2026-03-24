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
    { keywords: ['pagi', 'siang', 'sore', 'malam', 'halo', 'hai', 'hi', 'assalam', 'permisi', 'p', 'bot', 'min'], response: `Selamat ${timeStr}! Terima kasih sudah menghubungi *MK Metal Indo* 🏭\n\nSebelum kami bantu, boleh kami tahu ini dengan siapa dan dari perusahaan apa? 🙏` },
    { keywords: ['kirim', 'file', 'gambar', 'dxf', 'pdf', 'lampiran', 'upload', 'foto'], response: "Silakan langsung lampirkan file (DXF, PDF, atau Foto) di chat WhatsApp ini melalui menu **Lampiran/Attachment** agar segera kami estimasi." },
    { keywords: ['besar', 'ratusan', 'mb', 'gb', 'kapasitas', 'limit', 'email'], response: "Untuk file teknis berukuran **besar (di atas 20MB)**, silakan kirimkan via email ke **order@mkmetalindo.co.id** agar kualitas file engineering (DXF/PDF) tetap terjaga dengan baik dan tidak terkompresi oleh sistem chat. Terima kasih." },
    { keywords: ['lokasi', 'alamat', 'dimana', 'maps'], response: "Workshop kami di Jl. Tambak Sawah No.6B, Waru, Sidoarjo, Jawa Timur 61253. Silakan mampir kapan saja di jam kerja." },
    { keywords: ['kontak', 'wa', 'whatsapp', 'telp', 'hubungi', 'telepon'], response: `Untuk penjualan, silakan WA ke ${salesContact} atau telp (031) 9969 4300 di jam 08:00 - 16:00. Untuk teknis sales engineer di 08113185800.` },
    { keywords: ['jam', 'buka', 'operasional', 'kerja'], response: "Workshop kami buka Senin–Sabtu, jam 08.00–16.00 WIB." },
    { keywords: ['jasa', 'layanan', 'bisa cutting', 'laser', 'bending', 'shearing', 'fabrikasi', 'pipa', 'plat', 'potong'], response: "Selamat ${timeStr}! Terima kasih sudah menghubungi *MK Metal Indo* 🏭\n\nKami melayani Jasa Laser Cutting (Plat & Pipa), Bending CNC, Shearing, dan Fabrikasi untuk material Besi, Stainless, Aluminium, dan Mild Steel.\n\nBoleh kami tahu ini dengan siapa dan dari perusahaan apa? 🙏" }
  ];
};

const getSystemPrompt = (salesContact: string, customerName: string, currentTime: string) => `Kamu adalah asisten penjualan MK Metal Indo, perusahaan jasa laser cutting, bending CNC, shearing, dan fabrikasi metal di Sidoarjo.
Waktu asli sistem (WIB) saat ini: ${currentTime}. Customer yang kamu layani bernama ${customerName}.

Panduan Panggilan & Salam:
- Gunakan salam pembuka sesuai waktu ASLI sistem (${currentTime}) HANYA pada pesan pertama atau jika customer yang menyapa duluan. JANGAN mengulang salam di setiap balasan lanjutan. Jadilah natural.
- Gunakan sapaan: "Bapak" (jika laki-laki), "Ibu" (jika perempuan), atau "Kakak".

Panduan Minta Nama Customer (PENTING):
- Jika nama customer "${customerName}" terlihat BUKAN nama orang asli (misalnya: "Customer WA", nama brand/toko, singkatan aneh, atau nama akun media sosial), maka DI PESAN PERTAMA kamu WAJIB menanyakan nama asli mereka terlebih dahulu.
- Contoh: "Selamat ${currentTime}! Terima kasih sudah menghubungi MK Metal Indo. Mohon maaf, boleh kami tahu ini dengan Bapak/Ibu siapa? 🙏"
- Setelah customer memberikan namanya, baru lanjutkan membantu pertanyaan mereka.
- Jika customer sudah menyebutkan namanya di chat sebelumnya (cek histori), JANGAN tanya lagi.

Panduan Menangani Lampiran File:
- Jika pada histori percakapan sebelumnya kamu melihat teks [File From WA...] atau [Media Intercepted], ITU ARTINYA CUSTOMER SUDAH MENGIRIM FILE DENGAN SUKSES!
- JIKA CUSTOMER SUDAH MENGIRIM FILE, JANGAN PERNAH meminta file/gambar lagi!! Cukup ucapkan terima kasih, konfirmasi bahwa file sudah diterima di sistem, dan jelaskan bahwa tim Engineering/Sales kami sedang memproses/me-review file tersebut. Akhiri percakapan dengan ramah.

Panduan Komunikasi:
- Jawab dengan ramah, profesional, dan to-the-point dalam Bahasa Indonesia yang baik.
- Jangan sebut dirimu AI, kamu adalah tim MK Metal Indo.
- Fokus membantu layanan kami (Laser Cutting, Bending, Shearing, Fabrikasi).
- Jika customer tanya teknis mendalam atau ingin deal, berikan kontak Sales Office: ${salesContact} (WA/Telp) atau arahkan ke 08113185800.

Informasi Perusahaan:
- Workshop: Jl. Tambak Sawah No.6B, Waru, Sidoarjo.
- Jam operasional: Senin-Sabtu 08.00-16.00 WIB.
- Material Laser: Besi, Stainless Steel, Aluminium, Mild Steel (Tebal maks 20mm).`;

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
    const cleanPhone = body.payload?.cleanPhone || customerNumber;
    const rawRemoteJid = body.payload?.rawRemoteJid || targetJid;
    const replyJid = rawRemoteJid; // Always reply to the RAW jid, not the resolved one
    
    const sessionId = `waha-${cleanPhone}`;

    console.log(`🔥 PARSED: phone=${cleanPhone}, replyTo=${replyJid}, text=${text}, type=${parsedType}`);

      const leadResult = await query(
        `INSERT INTO leads_mk (nama_lead, nomor_wa, last_chat, sumber_lead) 
         VALUES ($1, $2, NOW(), 'WhatsApp') 
         ON CONFLICT (nomor_wa) 
         DO UPDATE SET 
           last_chat = NOW(),
           nama_lead = CASE WHEN leads_mk.nama_lead = 'Customer WA' THEN EXCLUDED.nama_lead ELSE leads_mk.nama_lead END
         RETURNING id, nama_lead, status_crm, last_chat`,
        [userName, cleanPhone]
      );
      const leadId = leadResult.rows[0].id;
      const currentStatus = leadResult.rows[0].status_crm;
      const lastChatFromDB = leadResult.rows[0].last_chat;
      console.log(`[TRACE 1] Lead ID: ${leadId}, Status: ${currentStatus}, Phone: ${cleanPhone}`);

      // 2. Record incoming message
      await query(
        `INSERT INTO chat_history (lead_id, sender_name, message_text, direction, session_id) 
         VALUES ($1, $2, $3, 'incoming', $4)`,
        [leadId, userName, text, sessionId]
      );

      // 🚨 Fix 31.6s timeout: Force IPv4 loopback because Node 18+ resolves localhost to ::1
      const WAHA_URL = 'http://127.0.0.1:3017'; 
      const WAHA_API_KEY = 'mkm_crm_waha_secure_key';
      const CONTACT_SALES = dynamicContactWaha;

      // --- 2.5: INTERCEPT MEDIA / FILES TO SAVE TOKENS ---
      if (parsedType === 'media') {
        console.log(`[TRACE 2] Processing Media Intercept...`);
        const { message_id } = parsed;
        let fileUrl = null;
        let fileName = `wa_${Date.now()}_file`;

        // 🔥 Hybrid Media Fetcher: Prefers direct Baileys file drop
        try {
          // Check if Baileys adapter already dropped the file natively
          const directFile = body.payload?._data?.localFileName;
          
          if (directFile) {
            fileName = directFile;
            fileUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/uploads/${fileName}`;
            console.log(`[TRACE 3] Media directly injected: ${fileUrl}`);
          } else {
            // Fallback: Attempt WAHA API fetch (Legacy path)
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

        const replyText = `Terima kasih Kakak ${userName}, file/lampiran sudah kami terima dengan baik. Tim Sales Engineering kami akan segera me-review dan memproses estimasi untuk Kakak. Kami akan menghubungi Kakak kembali secepatnya ya. 🙏`;
        console.log(`[TRACE 4] Sending Media Auto-Reply: ${replyText}`);

        // Reply to user
        await fetch(`${WAHA_URL}/api/sendText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
          body: JSON.stringify({ chatId: replyJid, text: replyText, session: 'default' })
        });

        // Notify Sales PIC — with Chat Summary
        const dashboardUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/dashboard`;
        const historyForSummary = await query(
          `SELECT message_text FROM chat_history WHERE lead_id = $1 AND direction = 'incoming' ORDER BY timestamp DESC LIMIT 10`,
          [leadId]
        );
        const allChat = historyForSummary.rows.map((r: any) => r.message_text).join(' ').toLowerCase();
        const serviceMap: [string, string][] = [
          ['laser', 'Laser Cutting Plat'], ['pipa', 'Cutting Laser Pipa'],
          ['bending', 'Bending CNC'], ['shearing', 'Shearing'],
          ['fabrikasi', 'Fabrikasi'], ['potong', 'Pemotongan Material'],
          ['stainless', 'Material Stainless'], ['aluminium', 'Material Aluminium'],
          ['besi', 'Material Besi'], ['plat', 'Cutting Plat'],
        ];
        const detected = serviceMap.filter(([k]) => allChat.includes(k)).map(([, v]) => v);
        const summaryText = detected.length > 0 ? detected.join(', ') : 'Belum terdeteksi spesifik (silakan cek histori chat)';


        // Count previous file submissions for priority escalation
        const prevFiles = await query(
          `SELECT COUNT(*) as cnt FROM chat_history WHERE lead_id = $1 AND message_text LIKE '%[File From WA%'`,
          [leadId]
        );
        const fileCount = parseInt(prevFiles.rows[0].cnt) + 1;
        const isRepeat = fileCount > 1;
        const priorityTag = isRepeat ? '🔴 *URGENT/PRIORITAS TINGGI* (Customer kirim file ke-' + fileCount + '!)' : '🟢 File Pertama';

        // Update status and save outgoing chat
        await query(`UPDATE leads_mk SET status_crm = 'Interested' WHERE id = $1`, [leadId]);
        await query(
          `INSERT INTO chat_history (lead_id, sender_name, message_text, direction, is_ai_response, session_id) 
           VALUES ($1, 'System (Auto)', $2, 'outgoing', true, $3)`,
          [leadId, fileUrl ? `[File From WA: ${fileName}] Link: ${fileUrl}` : `[Media Intercepted - Forwarded to Sales Office]`, sessionId]
        );

        // Build sales alert with priority
        const alertParts = [
          isRepeat ? '*🔴 FILE MASUK - URGENT (WhatsApp)*' : '*📋 FILE MASUK (WhatsApp)*',
          '',
          priorityTag,
          '',
          '👤 Dari: *' + userName + '*',
          '📞 No: ' + cleanPhone,
          '🖼️ Jenis: [Media/Gambar/PDF]',
          '📄 Link: ' + (fileUrl || '(Gagal tarik, cek WA langsung)'),
          '',
          '📝 *Ringkasan Kebutuhan Customer:*',
          summaryText,
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

        console.log(`[TRACE 5] Media Intercept: file #${fileCount}, priority=${isRepeat ? 'URGENT' : 'normal'}`);
        return NextResponse.json({ success: true, action: 'media_forwarded_to_sales' });
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
        console.log(`[TRACE 11] FAQ Matched! Dispatching text: ${matchedFaq.response}`);
        // Reply instantly using FAQ
        await fetch(`${WAHA_URL}/api/sendText`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
          body: JSON.stringify({ chatId: replyJid, text: matchedFaq.response, session: 'default' })
        });

        // Record outgoing message
        await query(
          `INSERT INTO chat_history (lead_id, sender_name, message_text, direction, is_ai_response, session_id) 
           VALUES ($1, 'MK Metal Indo', $2, 'outgoing', true, $3)`,
          [leadId, matchedFaq.response, sessionId]
        );
        return NextResponse.json({ success: true, action: 'faq_answered' });
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
          'X-Title': 'MK Metal Indo WA Chat'
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
        console.log(`[TRACE 13] OpenRouter Success! Emitting AI Reply: ${replyText}`);

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
        console.log(`[TRACE 14] Message successfully dispatched to Baileys Engine`);

        // 5. Record outgoing message
        await query(
          `INSERT INTO chat_history (lead_id, sender_name, message_text, direction, is_ai_response, session_id) 
           VALUES ($1, 'MK Metal Indo', $2, 'outgoing', true, $3)`,
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
            text: "Mohon maaf, sistem AI kami sedang mengalami kepadatan respons. Mohon ulangi pertanyaan Anda beberapa saat lagi, atau hubungi Sales Tech kami di 08113185800.",
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
