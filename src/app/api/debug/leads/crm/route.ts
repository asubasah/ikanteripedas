import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const wilayah = searchParams.get('wilayah');

    // Get statistics
    const statsQuery = await query(`
      SELECT 
        COUNT(*) as total_scraper,
        COUNT(DISTINCT kecamatan) as total_kecamatan,
        MAX(lead_score) as max_score
      FROM leads_mk
      WHERE sumber_lead = 'Scraper' AND nomor_wa IS NOT NULL
    `);

    // Get distinct regions for filter dropdown
    const regionsQuery = await query(`
      SELECT DISTINCT kecamatan 
      FROM leads_mk 
      WHERE sumber_lead = 'Scraper' AND kecamatan IS NOT NULL
      ORDER BY kecamatan ASC
    `);

    // Prepare main query
    let sql = `
      SELECT id, nama_lead, nomor_wa, alamat_lengkap, website, bintang_google, koordinat_maps, kecamatan, lead_score, status_crm, last_marketing_at
      FROM leads_mk
      WHERE sumber_lead = 'Scraper'
    `;
    const params: any[] = [];

    if (wilayah && wilayah !== 'Semua') {
       params.push(wilayah);
       sql += ` AND kecamatan = $1`;
    }

    sql += ` ORDER BY lead_score DESC NULLS LAST LIMIT 100`;

    const leadsQuery = await query(sql, params);

    return NextResponse.json({
      stats: {
        total: parseInt(statsQuery.rows[0].total_scraper || 0),
        domains: parseInt(statsQuery.rows[0].total_kecamatan || 0),
        top_score: parseInt(statsQuery.rows[0].max_score || 0)
      },
      regions: regionsQuery.rows.map(r => r.kecamatan),
      leads: leadsQuery.rows
    });
  } catch (error) {
    console.error('API /leads/crm Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
