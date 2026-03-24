import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    const res = await query("SELECT nama_lead, nomor_wa, last_chat FROM leads_mk ORDER BY last_chat DESC LIMIT 1;");
    return NextResponse.json(res.rows[0] || { message: "No leads found yet" });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
