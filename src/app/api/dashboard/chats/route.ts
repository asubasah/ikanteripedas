import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('admin_auth');
  if (!authCookie || authCookie.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get('leadId');

  try {
    if (leadId) {
      // Get chat history for a specific lead
      const result = await query(`
        SELECT 
          c.id, c.sender_name, c.message_text, c.direction, 
          c.timestamp, c.is_ai_response
        FROM chat_history c
        WHERE c.lead_id = $1
        ORDER BY c.timestamp ASC
      `, [leadId]);
      return NextResponse.json({ messages: result.rows });
    } else {
      // Get all leads with last message preview
      const result = await query(`
        SELECT 
          l.id, l.nama_lead, l.nomor_wa, l.status_crm, l.last_chat,
          (SELECT message_text FROM chat_history WHERE lead_id = l.id ORDER BY timestamp DESC LIMIT 1) as last_message,
          (SELECT COUNT(*) FROM chat_history WHERE lead_id = l.id AND direction = 'incoming') as total_messages
        FROM leads_mk l
        ORDER BY l.last_chat DESC
      `);
      return NextResponse.json({ leads: result.rows });
    }
  } catch (error) {
    console.error('Dashboard API error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
