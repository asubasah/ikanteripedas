import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// FAQ — instant answers for common questions
const getFaqData = (salesContact: string) => {
  const now = new Date();
  const hours = (now.getUTCHours() + 7) % 24;
  let timeStr = "Pagi";
  if (hours >= 11 && hours < 15) timeStr = "Siang";
  else if (hours >= 15 && hours < 19) timeStr = "Sore";
  else if (hours >= 19 || hours < 4) timeStr = "Malam";

  return [
    { keywords: ['pagi', 'siang', 'sore', 'malam', 'halo', 'hai', 'hi', 'assalam', 'permisi', 'p', 'bot', 'min'], response: `Selamat ${timeStr}! Terima kasih sudah menghubungi *MK Metalindo* 🏭\n\nSebelum kami bantu, boleh kami tahu ini dengan siapa dan dari perusahaan apa? 🙏` },
    { keywords: ['kirim', 'file', 'gambar', 'dxf', 'pdf', 'lampiran', 'upload', 'foto'], response: "Silakan langsung kirimkan file (DXF, PDF, atau Foto Plat) dengan meng-klik **Ikon Klip Kertas (Paperclip)** di bagian bawah chat ini untuk segera kami estimasi." },
    { keywords: ['besar', 'ratusan', 'mb', 'gb', 'kapasitas', 'limit', 'email', 'dxf'], response: "Untuk file teknis berukuran **besar (di atas 20MB)**, silakan kirimkan via email ke **order@mkmetalindo.co.id** agar kualitas file engineering (DXF/PDF) tetap terjaga dengan baik dan tidak terkompresi oleh sistem chat. Terima kasih." },
    { keywords: ['lokasi', 'alamat', 'dimana', 'maps'], response: "Workshop kami di Jl. Tambak Sawah No.6B, Waru, Sidoarjo, Jawa Timur 61253. Silakan mampir kapan saja di jam kerja ya." },
    { keywords: ['kontak', 'wa', 'whatsapp', 'telp', 'hubungi', 'telepon'], response: `Untuk penjualan, silakan WA ke ${salesContact} atau telp (031) 9969 4300 di jam 08:00 - 16:00. Untuk teknis sales engineer di 08113195800.` },
    { keywords: ['jam', 'buka', 'operasional', 'kerja'], response: "Workshop kami buka Senin–Sabtu, jam 08.00–16.00 WIB." },
    { keywords: ['jasa', 'layanan', 'bisa cutting', 'laser', 'bending', 'shearing', 'fabrikasi', 'pipa', 'plat', 'potong'], response: "Selamat ${timeStr}! Terima kasih sudah menghubungi *MK Metalindo* 🏭\n\nKami melayani Jasa Laser Cutting (Plat & Pipa), Bending CNC, Shearing, dan Fabrikasi untuk material Besi, Stainless, Aluminium, dan Mild Steel.\n\nBoleh kami tahu ini dengan siapa dan dari perusahaan apa? 🙏" }
  ];
};

const getSystemPrompt = (salesContact: string, customerName: string, currentTime: string) => `Kamu adalah asisten penjualan CV Multi Kreasi Metalindo (selalu sebut/tulis sebagai MK Metalindo), perusahaan jasa laser cutting, bending CNC, shearing, dan fabrikasi metal.
DILARANG KERAS mengeja nama perusahaan sebagai "MK Metal Indo", "MK Metel Indo", atau ejaan salah lainnya. Selalu gunakan "MK Metalindo".
Karakter & Bahasa:
- DEFAULT BAHASA KAMU ADALAH BAHASA INDONESIA YANG PROFESIONAL DAN RAMAH. JANGAN PERNAH MEMULAI PERCAKAPAN ATAU MENJAWAB DALAM BAHASA JAWA JIKA CUSTOMER BERTANYA DALAM BAHASA INDONESIA.
- HANYA balas menggunakan Bahasa Jawa (Suroboyoan/Sidoarjoan) JIKA DAN HANYA JIKA customer tersebut secara eksplisit menyapa atau bertanya menggunakan kosakata Bahasa Jawa terlebih dahulu.
- Jadilah asisten yang informatif, teknis namun ramah.
Waktu asli sistem (WIB) saat ini: ${currentTime}. Customer yang kamu layani bernama ${customerName}.

Panduan Panggilan & Salam:
- Gunakan salam pembuka sesuai waktu ASLI sistem (${currentTime}) HANYA pada pesan pertama atau jika customer yang menyapa duluan. JANGAN mengulang salam di setiap balasan lanjutan. Jadilah natural.
- Gunakan sapaan: "Bapak" (jika laki-laki), "Ibu" (jika perempuan), atau "Kakak".

Panduan Minta Nama Customer (PENTING):
- Jika nama customer "${customerName}" terlihat BUKAN nama orang asli (misalnya: "Customer WA", nama brand/toko, singkatan aneh, atau nama akun media sosial), maka DI PESAN PERTAMA kamu WAJIB menanyakan nama asli mereka terlebih dahulu.
- Contoh: "Selamat ${currentTime}! Terima kasih sudah menghubungi MK Metalindo. Mohon maaf, boleh kami tahu ini dengan Bapak/Ibu siapa? \uD83D\uDE4F"
- Setelah customer memberikan namanya, baru lanjutkan membantu pertanyaan mereka.
- Jika customer sudah menyebutkan namanya di chat sebelumnya (cek histori), JANGAN tanya lagi.

Panduan Menangani Lampiran File:
- Jika pada histori percakapan sebelumnya kamu melihat teks [File Uploaded] atau [File From Web], ITU ARTINYA CUSTOMER SUDAH MENGIRIM FILE DENGAN SUKSES!
- JIKA CUSTOMER SUDAH MENGIRIM FILE, JANGAN PERNAH meminta file lagi!! Cukup ucapkan terima kasih, konfirmasi file diterima, dan jelaskan tim Engineering/Sales sedang memproses. Akhiri percakapan dengan ramah.

Panduan Komunikasi:
- Jawab dengan ramah, profesional, dan to-the-point dalam Bahasa Indonesia yang baik.
- Jangan sebut dirimu AI, kamu adalah tim MK Metalindo.
- Jika customer ingin mengirim file/gambar/DXF/PDF, arahkan untuk meng-klik **IKON KLIP KERTAS (Paperclip)** di bagian bawah kolom chat web ini.
- Fokus membantu layanan kami (Laser Cutting, Bending, Shearing, Fabrikasi).
- Jika customer tanya teknis mendalam atau ingin deal, berikan kontak Sales Office: ${salesContact} (WA/Telp) atau arahkan ke 08113195800.

Informasi Oprasional & Kapasitas Bengkel:
- Workshop Bending Manual & Shearing: Jl. Tambak Sawah No.6B, Waru, Sidoarjo.
- Workshop Laser Cutting (Plat & Pipa), Bubut, & Fabrikasi: Pergudangan Grand Tambak Sawah No. B11, Waru, Sidoarjo.
- Jam operasional: Senin-Sabtu 08.00-16.00 WIB.
- Kapasitas Mesin Laser Cutting: Daya mesin 3000 Watt, dengan ukuran/panjang potongan maksimal 3 meter.
- Material Laser Cutting: Besi, Stainless Steel, Aluminium, Mild Steel (Tebal maks 20mm).
- PENTING: DILARANG menyebutkan atau membahas asal negara teknologi mesin (seperti Eropa, China, Jerman, Amerika, dll) dalam merespons. Jika pembeli bertanya tentang teknologi/mesin apa yang dipakai, cukup jawab bahwa MK Metalindo memakai deretan mesin dengan teknologi modern yang sangat handal dan presisi tinggi.`;

export async function POST(req: Request) {
  try {
    // Fetch dynamic sales contact
    const settingsRes = await query(`SELECT setting_value FROM app_settings WHERE setting_key = 'sales_contact_number'`);
    const dynamicSalesContact = settingsRes.rows.length > 0 ? settingsRes.rows[0].setting_value : '08961722712';

    const { message, sessionId, userName, phoneNumber, companyName } = await req.json();

    if (!phoneNumber || !userName) {
      return NextResponse.json({ error: 'Nama dan nomor HP wajib diisi.' }, { status: 400 });
    }

    // 1. Upsert Lead — phoneNumber is entity key
    const leadResult = await query(
      `INSERT INTO leads_mk (nama_lead, nomor_wa, last_chat, sumber_lead) 
       VALUES ($1, $2, NOW(), 'Web Chat') 
       ON CONFLICT (nomor_wa) 
       DO UPDATE SET last_chat = NOW(), nama_lead = COALESCE(NULLIF($1, ''), leads_mk.nama_lead)
       RETURNING id, status_crm, last_chat`,
      [userName, phoneNumber]
    );
    const leadId = leadResult.rows[0].id;
    const currentStatus = leadResult.rows[0].status_crm;
    const lastChat = leadResult.rows[0].last_chat;
    const lastChatDate = lastChat ? new Date(lastChat) : new Date(0);
    const diffHours = (new Date().getTime() - lastChatDate.getTime()) / (1000 * 60 * 60);

    // 🔥 2.5: FLEXIBLE RE-ENGAGEMENT (no hard lockout)
    const isReturningLead = currentStatus === 'Interested';
    // AI always responds to returning leads — no blocking.

    // 2. Record user message
    await query(
      `INSERT INTO chat_history (lead_id, sender_name, message_text, direction, session_id) 
       VALUES ($1, $2, $3, 'incoming', $4)`,
      [leadId, userName, message, sessionId]
    );

    // 🧠 3. INTERCEPT: Phone Number Correction
    const cleanMsg = message.replace(/[^0-9]/g, '');
    if (cleanMsg.length >= 10 && cleanMsg.length <= 15 && cleanMsg.startsWith('08')) {
      // User sent a new phone number!
      await query(`UPDATE leads_mk SET nomor_wa = $1, status_crm = 'Interested' WHERE id = $2`, [cleanMsg, leadId]);
      
      // Notify Sales PIC
      const WAHA_URL = 'http://127.0.0.1:3017';
      const WAHA_API_KEY = process.env.WAHA_API_KEY || 'mkm123';
      
      const salesRes = await query(`SELECT setting_value FROM app_settings WHERE setting_key = 'sales_contact_number'`);
      const salesPIC = salesRes.rows.length > 0 ? salesRes.rows[0].setting_value : '08961722712';
      const targetJid = salesPIC.startsWith('0') ? '62' + salesPIC.substring(1) + '@c.us' : salesPIC + '@c.us';

      await fetch(`${WAHA_URL}/api/sendText`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Api-Key': WAHA_API_KEY },
        body: JSON.stringify({
          chatId: targetJid,
          text: `*UPGRADE NOMOR KONTAK*\n\nUser *${userName}* telah memperbarui nomor WA yang bisa dihubungi menjadi: *${cleanMsg}*.\nMohon hubungi nomor ini untuk follow-up file/estimasi.`,
          session: 'default'
        })
      });

      return NextResponse.json({ reply: `Terima kasih Kakak ${userName}. Nomor kontak Kakak telah diperbarui menjadi ${cleanMsg}. Tim Sales PIC kami akan segera menghubungi Kakak di nomor tersebut.` });
    }

    // 4. Check FAQ (ONLY for brand new leads with no chat history)
    const prevMsgCount = await query(
      `SELECT COUNT(*) as cnt FROM chat_history WHERE lead_id = $1 AND direction = 'incoming'`,
      [leadId]
    );
    const incomingCount = parseInt(prevMsgCount.rows[0].cnt);
    const lowerMessage = message.toLowerCase();
    
    const isComplexQuery = ['harga', 'biaya', 'pricelist', 'berapa', 'estimasi', 'hitung', 'waktu', 'ukuran'].some(k => lowerMessage.includes(k));
    
    let matchedFaq = null;
    if (!isComplexQuery && incomingCount <= 1) {
      const faqData = getFaqData(dynamicSalesContact);
      matchedFaq = faqData.find((f: any) => 
        f.keywords.some((k: any) => lowerMessage.includes(k))
      );
    }

    let responseText = "";
    let isAiResponse = false;

    if (matchedFaq) {
      // FAQ match — instant response
      responseText = matchedFaq.response;
    } else {
      // 4. Forward to OpenClaw AI — completely transparent to user
      try {
        // Get recent chat history for context
        const historyResult = await query(
          `SELECT sender_name, message_text, direction 
           FROM chat_history 
           WHERE lead_id = $1 
           ORDER BY timestamp DESC LIMIT 10`,
          [leadId]
        );

        // Build conversation messages for OpenClaw
        const conversationHistory = historyResult.rows.reverse().map((row: { direction: string; message_text: string }) => ({
          role: row.direction === 'incoming' ? 'user' as const : 'assistant' as const,
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
            'HTTP-Referer': 'http://localhost:3000', // Optional: your site URL
            'X-Title': 'MK Metalindo Web Chat' // Optional: your site name
          },
          body: JSON.stringify({
          model: process.env.AI_MODEL || "google/gemini-2.0-flash-001",
          messages: [
            { role: 'system', content: getSystemPrompt(dynamicSalesContact, userName, timeContext) },
            ...conversationHistory,
            { role: 'user', content: message }
          ],
            user: sessionId,
            max_tokens: 500,
            temperature: 0.7
          })
        });

        if (openRouterRes.ok) {
          const data = await openRouterRes.json();
          responseText = data.choices?.[0]?.message?.content || '';
          isAiResponse = true;

          // Auto-upgrade lead status based on conversation progression
          if (currentStatus === 'Cold') {
            await query(`UPDATE leads_mk SET status_crm = 'FollowUp', layanan = $1 WHERE id = $2`, [message.substring(0, 100), leadId]);
          }

          // Detect if AI is directing to WhatsApp (close-deal signal)
          // Auto-upgrade status if AI drops the sales contact number
        if (responseText.toLowerCase().includes(dynamicSalesContact) || responseText.toLowerCase().includes('luluk')) {
          await query(`UPDATE leads_mk SET status_crm = 'Interested' WHERE id = $1`, [leadId]);
        }
        } else {
          // OpenRouter is down or error — graceful fallback
          const errorText = await openRouterRes.text();
          console.error('OpenRouter Error Text:', errorText);
          try {
             const errorData = JSON.parse(errorText);
             console.error('OpenRouter Error JSON:', errorData);
          } catch(e) {}
          responseText = "Terima kasih atas pertanyaannya. Untuk detail lebih lanjut, tim kami bisa bantu langsung via WhatsApp di 0811 3195 800, atau kalau ada gambar teknis bisa kirimkan ke sana juga.";
        }
      } catch {
        responseText = "Terima kasih sudah menghubungi MK Metalindo. Untuk respon lebih cepat, silakan hubungi kami di WhatsApp 0811 3195 800.";
      }
    }

    // 5. Record bot response
    await query(
      `INSERT INTO chat_history (lead_id, sender_name, message_text, direction, is_ai_response, session_id) 
       VALUES ($1, 'MK Metalindo', $2, 'outgoing', $3, $4)`,
      [leadId, responseText, isAiResponse, sessionId]
    );

    return NextResponse.json({ reply: responseText });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
