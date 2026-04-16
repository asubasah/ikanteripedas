import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const dbUrl = process.env.DATABASE_URL || 'postgresql://mkm:mkm2026@103.174.114.249:5433/mkm_crm';
const pool = new Pool({ connectionString: dbUrl });

const GOWA_URL = process.env.GOWA_URL || 'http://103.174.114.249:3010';
const GOWA_BASIC_AUTH = process.env.GOWA_BASIC_AUTH;
const MKM_MARKETING_DEVICE_ID = 'd2b23cd1-d667-442d-9271-89ea2f7d54aa'; // Device khusus marketing

const LIMIT_PER_DAY = 35; // Batas Max Blast Per Hari (Anti Spam)

const MARKETING_TEMPLATE = `Selamat siang Bapak/Ibu.
 
Perkenalkan kami dari *MK Metalindo*, spesialis jasa *Laser Cutting (Plat/Pipa) & Bending CNC* di Surabaya.

Kami melihat bisnis Bapak/Ibu bergerak di bidang yang butuh dukungan presisi metal. Kami melayani fabrikasi cepat & akurat untuk part mesin, konstruksi, pagar, dll.

Apakah sedang ada project/kebutuhan yang bisa kami bantu hitungkan estimasinya saat ini? Silakan balas pesan ini ya Pak/Bu agar bisa kami bantu. Terima kasih! 🙏`;

function randomDelay(minSec = 45, maxSec = 150) {
  const ms = Math.floor(Math.random() * (maxSec - minSec + 1) + minSec) * 1000;
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendMarketingGowa(phone: string, text: string) {
    const formattedPhone = `${phone}@s.whatsapp.net`;
    const headers: any = {
        'Content-Type': 'application/json',
        'X-Device-Id': MKM_MARKETING_DEVICE_ID
    };
    if (GOWA_BASIC_AUTH) {
        headers['Authorization'] = `Basic ${Buffer.from(GOWA_BASIC_AUTH).toString('base64')}`;
    }

    try {
        const res = await fetch(`${GOWA_URL}/send/message`, {
            method: 'POST',
            headers,
            body: JSON.stringify({ phone: formattedPhone, message: text })
        });
        return res.ok;
    } catch (e) {
        return false;
    }
}

async function runBlast() {
  console.log('🤖 MENGAKTIFKAN BOT MARKETING B2B MK METALINDO...');

  // 1. Cek Kuota & Waktu (Opsional: batasi hanya jam kerja, skip sabtu/minggu)
  const hour = new Date().getHours();
  if (hour < 8 || hour >= 16) {
      console.log('⏳ Di luar jam kerja (08:00 - 16:00). Blast ditunda untuk menghindari komplain.');
      process.exit(0);
  }

  try {
    // 2. Ambil Leads Cold yang belum dikirim marketing hari ini atau belum sama sekali
    const result = await pool.query(`
      SELECT id, nama_lead, nomor_wa 
      FROM leads_mk 
      WHERE status_crm = 'Cold' 
        AND (last_marketing_at IS NULL OR last_marketing_at < NOW() - INTERVAL '3 days')
      ORDER BY last_marketing_at ASC NULLS FIRST
      LIMIT $1;
    `, [LIMIT_PER_DAY]);

    const targets = result.rows;
    if (targets.length === 0) {
        console.log('✅ Tidak ada Cold Lead baru untuk di-blast hari ini.');
        process.exit(0);
    }

    console.log(`🎯 Ditemukan ${targets.length} target Cold Leads. Memulai Blast beruntun dengan delay Acak (Ultra-Safe Mode)...`);

    for (let i = 0; i < targets.length; i++) {
        const lead = targets[i];
        console.log(`[${i+1}/${targets.length}] Mengirim promo ke ${lead.nama_lead} (${lead.nomor_wa})...`);

        const isSuccess = await sendMarketingGowa(lead.nomor_wa, MARKETING_TEMPLATE);

        if (isSuccess) {
            console.log(`✅ Berhasil terkirim! Merekam ke history...`);
            
            // Record to chat_history
            await pool.query(`
                INSERT INTO chat_history (lead_id, sender_name, message_text, direction, is_ai_response, session_id)
                VALUES ($1, 'Marketing Agent', $2, 'outgoing', true, $3)
            `, [lead.id, MARKETING_TEMPLATE, `marketing-${lead.nomor_wa}`]);

            // Update status leads_mk
            await pool.query(`
                UPDATE leads_mk 
                SET last_marketing_at = NOW(), 
                    marketing_count = marketing_count + 1 
                WHERE id = $1
            `, [lead.id]);

        } else {
            console.log(`❌ Gagal terkirim ke ${lead.nomor_wa}. Melewati...`);
        }

        if (i < targets.length - 1) {
            const delaySecs = Math.floor(Math.random() * (120 - 45 + 1)) + 45;
            console.log(`⏳ Menunggu jeda ${delaySecs} detik sebelum target berikutnya (Menghindari Banned WA)...\n`);
            await randomDelay(45, 120);
        }
    }

    console.log('\n🎉 Sesi Blast Marketing Hari Ini Selesai!');

  } catch (err: any) {
    console.error('Bencana koneksi DB:', err.message);
  } finally {
    process.exit(0);
  }
}

runBlast();
