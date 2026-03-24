import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const { code } = await req.json();

    if (!code || code.length !== 6) {
      return NextResponse.json({ error: 'Kode OTP tidak valid' }, { status: 400 });
    }

    const res = await query(`SELECT setting_value FROM app_settings WHERE setting_key = 'admin_otp'`);
    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'OTP tidak ditemukan. Silakan request ulang.' }, { status: 400 });
    }

    const otpData = JSON.parse(res.rows[0].setting_value);
    
    if (Date.now() > otpData.expiresAt) {
      return NextResponse.json({ error: 'Kode OTP kadaluarsa. Silakan request ulang.' }, { status: 400 });
    }

    if (otpData.code !== code) {
      return NextResponse.json({ error: 'Kode OTP salah. Coba lagi.' }, { status: 400 });
    }

    // Clear OTP
    await query(`DELETE FROM app_settings WHERE setting_key = 'admin_otp'`);

    // Set secure cookie
    const cookieStore = await cookies();
    cookieStore.set('admin_auth', 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7, // 1 week
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Verify OTP Error:', err);
    return NextResponse.json({ error: 'Terjadi kesalahan sistem.' }, { status: 500 });
  }
}
