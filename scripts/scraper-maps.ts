import puppeteer from 'puppeteer';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Koneksi ke Database CRM di VPS
// Ganti localhost dengan IP VPS jika dijalankan dari laptop
const dbUrl = process.env.DATABASE_URL || 'postgresql://mkm:mkm2026@103.174.114.249:5433/mkm_crm';
const pool = new Pool({ connectionString: dbUrl });

const KEYWORDS = [
  "Bengkel Las Surabaya",
  "Pabrik Manufaktur Sidoarjo",
  "Jasa Fabrikasi Metal Gresik"
];

async function autoScroll(page: any) {
  await page.evaluate(async () => {
    await new Promise((resolve) => {
      let totalHeight = 0;
      let distance = 300;
      const timer = setInterval(() => {
        const scrollable = document.querySelector('div[role="feed"]');
        if (scrollable) {
          scrollable.scrollBy(0, distance);
          totalHeight += distance;
          if (totalHeight >= scrollable.scrollHeight - window.innerHeight) {
            clearInterval(timer);
            resolve(true);
          }
        } else {
          clearInterval(timer);
          resolve(true);
        }
      }, 500);
    });
  });
}

function cleanPhone(raw: string) {
  let cleaned = raw.replace(/\D/g, '');
  if (cleaned.startsWith('62')) cleaned = '0' + cleaned.substring(2);
  if (cleaned.startsWith('8')) cleaned = '0' + cleaned;
  return cleaned.length >= 10 ? cleaned : null;
}

async function scrapeMaps() {
  console.log('🚀 Memulai Scraper Google Maps...');
  console.log('[PERINGATAN] Aplikasi ini membuka browser Puppeteer. Jalankan dari PC Lokal, BUKAN dari VPS agar server tidak keberatan.');

  const browser = await puppeteer.launch({
    headless: false, // Set false agar bisa lihat prosesnya
    defaultViewport: null,
    args: ['--start-maximized']
  });

  let totalScraped = 0;

  for (const keyword of KEYWORDS) {
    console.log(`\n🔍 Mencari: ${keyword}`);
    const page = await browser.newPage();
    try {
      await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(keyword)}`);
      console.log('Menunggu loading hasil...');
      await page.waitForSelector('div[role="feed"]', { timeout: 10000 });
      
      console.log('Scroll otomatis untuk memuat semua hasil (Sekitar 30 detik)...');
      await autoScroll(page);
      
      // Extract links
      const businessLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href^="https://www.google.com/maps/place"]'))
          .map((a: any) => a.href);
      });
      
      const uniqueLinks = [...new Set(businessLinks)];
      console.log(`📌 Menemukan ${uniqueLinks.length} bisnis potensial.`);

      for (const link of uniqueLinks) {
        try {
            await page.goto(link, { waitUntil: 'domcontentloaded' });
            await page.waitForTimeout(2000); // 2 seconds delay

            const data = await page.evaluate(() => {
                const nameNode = document.querySelector('h1.fontHeadlineLarge');
                const phoneNodes = Array.from(document.querySelectorAll('button[data-tooltip="Salin nomor telepon"]'));
                
                return {
                    name: nameNode ? nameNode.textContent?.trim() : '',
                    phoneText: phoneNodes.length > 0 ? phoneNodes[0].textContent?.replace('Dipilih', '')?.trim() : null
                };
            });

            if (data.name && data.phoneText) {
                const phone = cleanPhone(data.phoneText);
                if (phone) {
                   // Cek & Insert ke DB
                   const check = await pool.query('SELECT id FROM leads_mk WHERE nomor_wa = $1', [phone]);
                   if (check.rows.length === 0) {
                      await pool.query(
                        `INSERT INTO leads_mk (nama_lead, nomor_wa, status_crm, sumber_lead, last_chat) 
                         VALUES ($1, $2, 'Cold', 'Scraper', NOW())`,
                        [data.name, phone]
                      );
                      console.log(`✅ [NEW LEAD] ${data.name} - ${phone}`);
                      totalScraped++;
                   } else {
                      console.log(`⏭️ [SKIP] ${data.name} (Sudah ada di database)`);
                   }
                }
            }
        } catch (e) {
            console.warn(`Gagal memproses salah satu link bisnis. Skipping...`);
        }
      }
    } catch (e: any) {
      console.error(`Gagal mencari rute: ${keyword}`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`\n🎉 Proses Selesai! Berhasil mengekstrak ${totalScraped} Cold Leads baru ke CRM.`);
  process.exit(0);
}

scrapeMaps().catch(console.error);
