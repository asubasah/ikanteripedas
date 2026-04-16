import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { writeFile } from 'fs/promises';
import { join } from 'path';
import { sendWhatsAppText } from '@/lib/waUtils/waSender';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    const sessionId = formData.get('sessionId') as string;
    const userName = formData.get('userName') as string;
    const phoneNumber = formData.get('phoneNumber') as string;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const filename = `${Date.now()}-${file.name.replace(/\s+/g, '_')}`;
    const path = join(process.cwd(), 'public', 'uploads', filename);
    await writeFile(path, buffer);

    const fileUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/uploads/${filename}`;

    // 1. Get Sales Contact
    const settingsRes = await query(`SELECT setting_value FROM app_settings WHERE setting_key = 'sales_contact_number'`);
    const salesContact = settingsRes.rows.length > 0 ? settingsRes.rows[0].setting_value : '08113438800';

    // 2. Fetch Lead ID
    const leadResult = await query(`SELECT id FROM leads_mk WHERE nomor_wa = $1`, [phoneNumber]);
    const leadId = leadResult.rows.length > 0 ? leadResult.rows[0].id : null;

    if (leadId) {
      // Record in chat history (Include the URL so Dashboard detects it)
      await query(
        `INSERT INTO chat_history (lead_id, sender_name, message_text, direction, session_id) 
         VALUES ($1, $2, $3, 'incoming', $4)`,
        [leadId, userName, `[File Uploaded: ${file.name}] Link: ${fileUrl}`, sessionId]
      );
      
      // Update status
      await query(`UPDATE leads_mk SET status_crm = 'Interested' WHERE id = $1`, [leadId]);
    }

    // 3. Notify Sales Office via waSender
    const notificationText = `*File Uploaded (Web Chat)*\n\n` +
      `👤 Dari: *${userName}*\n` +
      `📞 No: ${phoneNumber}\n` +
      `📄 File: ${file.name}\n` +
      `🔗 Link: ${fileUrl}\n\n` +
      `Segera cek file di atas untuk di-estimasi (DXF/PDF).`;

    await sendWhatsAppText(salesContact, notificationText);

    // ⚡ 4. Notify CUSTOMER via WhatsApp (Validation & Confirmation)
    const customerWaitText = `Halo Bapak/Ibu *${userName}*,\n\n` +
      `Terima kasih! Kami telah menerima file *${file.name}* yang Bapak/Ibu kirimkan melalui Web Chat MK Metalindo.\n\n` +
      `Mohon balas pesan WhatsApp ini dengan ketik *OK* atau *KONFIRMASI* untuk memastikan nomor ini aktif dan tim kami bisa mengirimkan hasil estimasi harganya ke sini.\n\n` +
      `Terima kasih. 🙏`;

    await sendWhatsAppText(phoneNumber, customerWaitText);

    return NextResponse.json({ success: true, url: fileUrl });
  } catch (error: any) {
    console.error('Upload Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
