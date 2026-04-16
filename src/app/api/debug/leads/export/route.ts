import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('admin_auth');
  if (!authCookie || authCookie.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const kabupaten = searchParams.get('kabupaten');
    const kecamatan = searchParams.get('kecamatan');
    const kategori = searchParams.get('kategori');
    const status = searchParams.get('status');

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

    const leadsQuery = await query(
      `SELECT nama_lead, nomor_wa, alamat_lengkap, website, bintang_google, jumlah_review, koordinat_maps, kecamatan, kabupaten, kategori, lead_score, status_crm
       FROM leads_mk ${where} ORDER BY lead_score DESC NULLS LAST LIMIT 5000`,
      params
    );

    const headers = [
      'Nama Prospek', 'Nomor WA', 'Alamat', 'Website', 'Rating Google', 'Jumlah Review', 
      'Link Maps', 'Kecamatan', 'Kabupaten', 'Kategori', 'Lead Score', 'Status CRM'
    ];

    let csvContent = headers.join(',') + '\n';

    leadsQuery.rows.forEach(row => {
      const mapsLink = row.koordinat_maps ? `https://www.google.com/maps?q=${row.koordinat_maps}` : '';
      const vals = [
        `"${(row.nama_lead || '').replace(/"/g, '""')}"`,
        `"${row.nomor_wa || ''}"`,
        `"${(row.alamat_lengkap || '').replace(/"/g, '""')}"`,
        `"${row.website || ''}"`,
        row.bintang_google || '',
        row.jumlah_review || 0,
        `"${mapsLink}"`,
        `"${row.kecamatan || ''}"`,
        `"${row.kabupaten || ''}"`,
        `"${row.kategori || ''}"`,
        row.lead_score || 0,
        `"${row.status_crm || ''}"`
      ];
      csvContent += vals.join(',') + '\n';
    });

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="prospek_crm.csv"'
      }
    });

  } catch (error) {
    console.error('API /leads/export Error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
