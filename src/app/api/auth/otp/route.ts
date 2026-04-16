import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { sendWhatsAppText } from '@/lib/waUtils/waSender';

export async function POST() {
  try {
    const settingsRes = await query(`SELECT setting_value FROM app_settings WHERE setting_key = 'sales_contact_number'`);
    const salesPIC = settingsRes.rows.length > 0 ? settingsRes.rows[0].setting_value : '08113195800';
    
    // Generate 6 digit code
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes

    // Save strictly to app_settings as 'admin_otp'
    await query(
      `INSERT INTO app_settings (setting_key, setting_value) 
       VALUES ('admin_otp', $1) 
       ON CONFLICT (setting_key) DO UPDATE SET setting_value = $1`,
      [JSON.stringify({ code: otp, expiresAt })]
    );

    // Send OTP via waSender (Handles GoWA/WAHA automatically)
    const text = `*KODE LOGIN DASHBOARD MK METAL INDO*\n\nKode OTP Anda adalah: *${otp}*\n\nBerlaku selama 5 menit. Jangan bagikan kode ini kepada siapapun. 🔒`;
    
    const sendRes = await sendWhatsAppText(salesPIC, text);

    if (!sendRes.success) {
        throw new Error(`Failed to send WA message: ${sendRes.error}`);
    }

    // Mask phone number for UI like 0811****800
    const maskedPhone = salesPIC.substring(0, 4) + '****' + salesPIC.substring(salesPIC.length - 3);

    return NextResponse.json({ success: true, maskedPhone });
  } catch (err: any) {
    console.error('OTP Error:', err.message);
    return NextResponse.json({ error: 'Gagal mengirim OTP. Pastikan service WA menyala.' }, { status: 500 });
  }
}
