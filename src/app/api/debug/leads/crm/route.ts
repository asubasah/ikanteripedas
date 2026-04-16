import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Map kecamatan to kabupaten for auto-detection
const KABUPATEN_MAP: Record<string, string> = {
  // Kota Surabaya
  'Sukolilo': 'Kota Surabaya', 'Rungkut': 'Kota Surabaya', 'Tenggilis Mejoyo': 'Kota Surabaya',
  'Gunung Anyar': 'Kota Surabaya', 'Mulyorejo': 'Kota Surabaya', 'Tambaksari': 'Kota Surabaya',
  'Gubeng': 'Kota Surabaya', 'Wonokromo': 'Kota Surabaya', 'Wonocolo': 'Kota Surabaya',
  'Wiyung': 'Kota Surabaya', 'Dukuh Pakis': 'Kota Surabaya', 'Sawahan': 'Kota Surabaya',
  'Tegalsari': 'Kota Surabaya', 'Bubutan': 'Kota Surabaya', 'Simokerto': 'Kota Surabaya',
  'Pabean Cantikan': 'Kota Surabaya', 'Semampir': 'Kota Surabaya', 'Kenjeran': 'Kota Surabaya',
  'Bulak': 'Kota Surabaya', 'Krembangan': 'Kota Surabaya', 'Benowo': 'Kota Surabaya',
  'Pakal': 'Kota Surabaya', 'Lakarsantri': 'Kota Surabaya', 'Sambikerep': 'Kota Surabaya',
  'Tandes': 'Kota Surabaya', 'Sukomanunggal': 'Kota Surabaya', 'Asemrowo': 'Kota Surabaya',
  'Gayungan': 'Kota Surabaya', 'Jambangan': 'Kota Surabaya', 'Karangpilang': 'Kota Surabaya',
  // Kabupaten Sidoarjo
  'Waru': 'Kab. Sidoarjo', 'Gedangan': 'Kab. Sidoarjo', 'Sedati': 'Kab. Sidoarjo',
  'Buduran': 'Kab. Sidoarjo', 'Sidoarjo': 'Kab. Sidoarjo', 'Candi': 'Kab. Sidoarjo',
  'Tanggulangin': 'Kab. Sidoarjo', 'Porong': 'Kab. Sidoarjo', 'Krembung': 'Kab. Sidoarjo',
  'Tulangan': 'Kab. Sidoarjo', 'Wonoayu': 'Kab. Sidoarjo', 'Krian': 'Kab. Sidoarjo',
  'Balong Bendo': 'Kab. Sidoarjo', 'Taman': 'Kab. Sidoarjo', 'Sukodono': 'Kab. Sidoarjo',
  'Tarik': 'Kab. Sidoarjo', 'Prambon': 'Kab. Sidoarjo', 'Jabon': 'Kab. Sidoarjo',
  // Kab. Gresik
  'Driyorejo': 'Kab. Gresik', 'Kebomas': 'Kab. Gresik', 'Gresik': 'Kab. Gresik',
  'Manyar': 'Kab. Gresik', 'Cerme': 'Kab. Gresik', 'Bungah': 'Kab. Gresik',
  // Kab. Pasuruan
  'Pandaan': 'Kab. Pasuruan', 'Beji': 'Kab. Pasuruan', 'Bangil': 'Kab. Pasuruan',
  'Rembang': 'Kab. Pasuruan', 'Gempol': 'Kab. Pasuruan',
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const kabupaten = searchParams.get('kabupaten');
    const kecamatan = searchParams.get('kecamatan');
    const kategori = searchParams.get('kategori');
    const status = searchParams.get('status');

    const statsQuery = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(DISTINCT COALESCE(kabupaten, 'Unknown')) as total_kabupaten,
        COUNT(CASE WHEN nomor_wa IS NOT NULL THEN 1 END) as total_with_phone,
        MAX(lead_score) as max_score
      FROM leads_mk WHERE sumber_lead = 'Scraper'
    `);

    const kabupatenQuery = await query(`
      SELECT DISTINCT COALESCE(kabupaten, 'Unknown') as kabupaten, COUNT(*) as jumlah
      FROM leads_mk WHERE sumber_lead = 'Scraper'
      GROUP BY kabupaten ORDER BY jumlah DESC
    `);

    const params: any[] = [];
    let where = `WHERE sumber_lead = 'Scraper'`;

    if (kabupaten && kabupaten !== 'Semua') {
      params.push(kabupaten);
      where += ` AND COALESCE(kabupaten, 'Unknown') = $${params.length}`;
    }
    if (kecamatan && kecamatan !== 'Semua') {
      params.push(kecamatan);
      where += ` AND kecamatan = $${params.length}`;
    }
    if (kategori && kategori !== 'Semua') {
      params.push(kategori);
      where += ` AND COALESCE(kategori, 'Umum') = $${params.length}`;
    }
    if (status && status !== 'Semua') {
      params.push(status);
      where += ` AND status_crm = $${params.length}`;
    }

    const kecQuery = await query(
      `SELECT DISTINCT kecamatan FROM leads_mk WHERE sumber_lead='Scraper' AND kecamatan IS NOT NULL ${kabupaten && kabupaten !== 'Semua' ? `AND COALESCE(kabupaten,'Unknown') = '${kabupaten.replace(/'/g,"''")}'` : ''} ORDER BY kecamatan ASC`
    );

    const leadsQuery = await query(
      `SELECT id, nama_lead, nomor_wa, alamat_lengkap, website, bintang_google, koordinat_maps, kecamatan, kabupaten, kategori, lead_score, status_crm, last_marketing_at
       FROM leads_mk ${where} ORDER BY lead_score DESC NULLS LAST LIMIT 200`,
      params
    );

    return NextResponse.json({
      stats: {
        total: parseInt(statsQuery.rows[0].total || 0),
        total_kabupaten: parseInt(statsQuery.rows[0].total_kabupaten || 0),
        total_with_phone: parseInt(statsQuery.rows[0].total_with_phone || 0),
        max_score: parseInt(statsQuery.rows[0].max_score || 0),
      },
      kabupaten_list: kabupatenQuery.rows,
      kecamatan_list: kecQuery.rows.map(r => r.kecamatan),
      leads: leadsQuery.rows,
    });
  } catch (error) {
    console.error('API /leads/crm Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

// PATCH: Update a single lead (edit inline)
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, kecamatan, kabupaten, kategori, status_crm, nomor_wa } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    // Auto-detect kabupaten if kecamatan provided but kabupaten not
    const resolvedKab = kabupaten || (kecamatan ? KABUPATEN_MAP[kecamatan] || null : undefined);

    await query(
      `UPDATE leads_mk SET 
        kecamatan = COALESCE($1, kecamatan),
        kabupaten = COALESCE($2, kabupaten),
        kategori = COALESCE($3, kategori),
        status_crm = COALESCE($4, status_crm),
        nomor_wa = COALESCE($5, nomor_wa)
       WHERE id = $6`,
      [kecamatan, resolvedKab, kategori, status_crm, nomor_wa, id]
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('PATCH /leads/crm Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
