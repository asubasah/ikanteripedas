import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const authCookie = cookieStore.get('admin_auth');
  if (!authCookie || authCookie.value !== 'authenticated') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { prompt, kategori_list } = await request.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const openRouterRes = await fetch(`https://openrouter.ai/api/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.AI_MODEL || "google/gemini-2.0-flash-001",
        messages: [
          {
            role: 'system',
            content: `Kamu adalah asisten pengatur Scraper CRM MK Metalindo.
Tugas kamu adalah mengekstrak JSON dari kalimat user.
User akan menginput sebuah kalimat perintah dalam bahasa indonesia.
Tugas kamu: Tentukan "keyword" (pencarian di google maps) dan "kategori" (untuk disimpan di sistem).

Aturan Main:
1. Keyword harus spesifik untuk pencarian Google Maps (misal User pesan: "Cari karoseri di deket sidoarjo dong" -> "Karoseri Sidoarjo"). 
2. Jika user memberikan nama kota/wilayah, tambahkan di posisi akhir keyword.
3. Untuk kolom "kategori", usahakan memilih salah satu dari daftar kategori yang di berikan. Jika benar-benar tidak ada yang cocok, gunakan nama kategori baru yang paling masuk akal (misal: "Otomotif & Karoseri").

Daftar Kategori Sistem Saat Ini:
${kategori_list.join(", ")}

Kembalikan jawaban HANYA berupa JSON tanpa format backticks markdown seperti ini:
{
  "keyword": "Kata Kunci Pencariannya",
  "kategori": "Nama Kategorinya"
}`
          },
          { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!openRouterRes.ok) {
      const e = await openRouterRes.text();
      console.error('OpenRouter error:', e);
      return NextResponse.json({ error: 'Gagal menghubungi server AI' }, { status: 500 });
    }

    const data = await openRouterRes.json();
    let resultText = data.choices?.[0]?.message?.content || '{}';
    
    // Clean up if the AI ignores strict JSON rules and puts backticks anyway
    resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    const parsed = JSON.parse(resultText);

    return NextResponse.json({ 
      keyword: parsed.keyword || '',
      kategori: parsed.kategori || ''
    });

  } catch (error: any) {
    console.error('AI Intent Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
