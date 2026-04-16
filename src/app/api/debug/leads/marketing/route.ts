import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Basic marketing stats
    const coldLeadsQuery = await query(`SELECT COUNT(*) as count FROM leads_mk WHERE status_crm = 'Cold'`);
    const sentTodayQuery = await query(`
      SELECT COUNT(DISTINCT lead_id) as count 
      FROM chat_history 
      WHERE session_id LIKE 'marketing-%' AND timestamp >= CURRENT_DATE
    `);
    const interestedQuery = await query(`SELECT COUNT(*) as count FROM leads_mk WHERE status_crm = 'Interested'`);
    const rejectedQuery = await query(`SELECT COUNT(*) as count FROM leads_mk WHERE status_crm = 'Rejected'`);

    // Recent Blast Logs
    const recentLogsQuery = await query(`
      SELECT 
        l.nama_lead, l.nomor_wa, l.status_crm,
        c.message_text, c.timestamp
      FROM chat_history c
      JOIN leads_mk l ON c.lead_id = l.id
      WHERE c.session_id LIKE 'marketing-%'
      ORDER BY c.timestamp DESC
      LIMIT 15
    `);

    return NextResponse.json({
      stats: {
        cold_leads: parseInt(coldLeadsQuery.rows[0].count),
        sent_today: parseInt(sentTodayQuery.rows[0].count),
        interested: parseInt(interestedQuery.rows[0].count),
        rejected: parseInt(rejectedQuery.rows[0].count),
      },
      logs: recentLogsQuery.rows
    });
  } catch (error) {
    console.error('API /marketing/logs Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
