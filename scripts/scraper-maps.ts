import puppeteer from 'puppeteer';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Koneksi Database
const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: dbUrl });

const KEYWORDS = [
  "Jasa Laser Cutting Sidoarjo",
  "Laser Cutting Plat Surabaya",
  "Fabrication Metal Sidoarjo",
  "Bengkel Pabrik Sidoarjo",
  "Bengkel Bubut Surabaya",
  "Kontraktor Mekanikal Elektrikal Surabaya",
  "Jasa Laser Cutting Gresik",
  "Bengkel Fabrikasi Pasuruan",
];

// Kabupaten lookup - maps kecamatan to kabupaten
const KABUPATEN_LOOKUP: Record<string, string> = {
  // Kota Surabaya
  'Rungkut': 'Kota Surabaya', 'Tenggilis Mejoyo': 'Kota Surabaya', 'Sukolilo': 'Kota Surabaya',
  'Gunung Anyar': 'Kota Surabaya', 'Mulyorejo': 'Kota Surabaya', 'Tambaksari': 'Kota Surabaya',
  'Gubeng': 'Kota Surabaya', 'Wonokromo': 'Kota Surabaya', 'Wonocolo': 'Kota Surabaya',
  'Wiyung': 'Kota Surabaya', 'Gayungan': 'Kota Surabaya', 'Jambangan': 'Kota Surabaya',
  'Karangpilang': 'Kota Surabaya', 'Dukuh Pakis': 'Kota Surabaya', 'Sawahan': 'Kota Surabaya',
  'Tegalsari': 'Kota Surabaya', 'Bubutan': 'Kota Surabaya', 'Simokerto': 'Kota Surabaya',
  'Pabean Cantikan': 'Kota Surabaya', 'Semampir': 'Kota Surabaya', 'Kenjeran': 'Kota Surabaya',
  'Bulak': 'Kota Surabaya', 'Krembangan': 'Kota Surabaya', 'Benowo': 'Kota Surabaya',
  'Pakal': 'Kota Surabaya', 'Lakarsantri': 'Kota Surabaya', 'Sambikerep': 'Kota Surabaya',
  'Tandes': 'Kota Surabaya', 'Sukomanunggal': 'Kota Surabaya', 'Asemrowo': 'Kota Surabaya',
  // Kab. Sidoarjo
  'Waru': 'Kab. Sidoarjo', 'Gedangan': 'Kab. Sidoarjo', 'Sedati': 'Kab. Sidoarjo',
  'Buduran': 'Kab. Sidoarjo', 'Sidoarjo': 'Kab. Sidoarjo', 'Candi': 'Kab. Sidoarjo',
  'Tanggulangin': 'Kab. Sidoarjo', 'Porong': 'Kab. Sidoarjo', 'Krembung': 'Kab. Sidoarjo',
  'Tulangan': 'Kab. Sidoarjo', 'Wonoayu': 'Kab. Sidoarjo', 'Krian': 'Kab. Sidoarjo',
  'Taman': 'Kab. Sidoarjo', 'Sukodono': 'Kab. Sidoarjo', 'Tarik': 'Kab. Sidoarjo',
  'Prambon': 'Kab. Sidoarjo', 'Jabon': 'Kab. Sidoarjo', 'Balong Bendo': 'Kab. Sidoarjo',
  // Kab. Gresik
  'Driyorejo': 'Kab. Gresik', 'Kebomas': 'Kab. Gresik', 'Gresik': 'Kab. Gresik',
  'Manyar': 'Kab. Gresik', 'Cerme': 'Kab. Gresik', 'Bungah': 'Kab. Gresik',
  'Menganti': 'Kab. Gresik', 'Duduk Sampeyan': 'Kab. Gresik',
  // Kab. Pasuruan
  'Pandaan': 'Kab. Pasuruan', 'Beji': 'Kab. Pasuruan', 'Bangil': 'Kab. Pasuruan',
  'Gempol': 'Kab. Pasuruan', 'Rembang': 'Kab. Pasuruan', 'Nguling': 'Kab. Pasuruan',
};

// Also detect from city name in address
const KOTA_LOOKUP: Record<string, string> = {
  'surabaya': 'Kota Surabaya',
  'sidoarjo': 'Kab. Sidoarjo',
  'gresik': 'Kab. Gresik',
  'pasuruan': 'Kab. Pasuruan',
};

function resolveKabupaten(kecamatan: string | null, address: string | null): string | null {
  // Try by kecamatan lookup first
  if (kecamatan && KABUPATEN_LOOKUP[kecamatan]) return KABUPATEN_LOOKUP[kecamatan];
  // Try by address keywords
  if (address) {
    const addr = address.toLowerCase();
    for (const [city, kab] of Object.entries(KOTA_LOOKUP)) {
      if (addr.includes(city)) return kab;
    }
  }
  return null;
}

      return match[1].trim();
  }
  // Fallback: get the 2nd to last comma separated value if no 'Kec' is found
  const parts = address.split(',');
  if (parts.length >= 3) {
      return parts[parts.length - 2].trim();
  }
  return "Unknown";
}

function calculateScore(data: any) {
  let score = 0;
  if (data.phone) score += 30;
  if (data.website) score += 30;
  if (data.rating) {
     const numRating = parseFloat(data.rating.replace(',', '.'));
     if (numRating >= 4.5) score += 40;
     else if (numRating >= 4.0) score += 20;
     else score += 10;
  }
  return score;
}

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

async function scrapeMaps() {
  console.log('🚀 Memulai Scraper Deep-Data Google Maps...');
  console.log('[PERINGATAN] Proses ini lebih lambat karena membuka setiap profil untuk mengambil Alamat, Web, dan Bintang.');

  const browser = await puppeteer.launch({
    headless: true,
    defaultViewport: null,
    args: [
      '--no-sandbox', 
      '--disable-setuid-sandbox', 
      '--disable-dev-shm-usage', 
      '--disable-accelerated-2d-canvas', 
      '--disable-gpu',
      '--js-flags="--max-old-space-size=512"'
    ]
  });

  let totalScraped = 0;

  for (const keyword of KEYWORDS) {
    console.log(`\n🔍 Mencari: ${keyword}`);
    const page = await browser.newPage();
    
    // Resource Optimization: Block images and styles
    await page.setRequestInterception(true);
    page.on('request', (req) => {
      if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
        req.abort();
      } else {
        req.continue();
      }
    });

    try {
      await page.goto(`https://www.google.com/maps/search/${encodeURIComponent(keyword)}`);
      await page.waitForSelector('div[role="feed"]', { timeout: 15000 }).catch(() => console.log('Feed tidak ditemukan'));
      
      console.log('Scroll memuat daftar...');
      await autoScroll(page);
      
      const businessLinks = await page.evaluate(`(function() {
        return Array.from(document.querySelectorAll('a[href^="https://www.google.com/maps/place"]'))
          .map((a) => a.href);
      })()`) as string[];
      
      const uniqueLinks = [...new Set(businessLinks)];
      console.log(`📌 Menemukan ${uniqueLinks.length} prospek. Memulai Deep-Scraping...`);

      for (let i = 0; i < uniqueLinks.length; i++) {
        const link = uniqueLinks[i] as string;
        try {
            await page.goto(link, { waitUntil: 'load', timeout: 30000 });
            await new Promise(resolve => setTimeout(resolve, 3000)); // Wait for the left panel to fully populate
            
            // Extract Coordinate from URL
            // Format: .../data=!...@latitude,longitude,zoom...
            const coordsMatch = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
            const koordinat = coordsMatch ? `${coordsMatch[1]}, ${coordsMatch[2]}` : null;

            const data = await page.evaluate(`(function() {
                // Name: try multiple selectors
                const nameSelectors = ['h1', 'h1.fontHeadlineLarge', '[role="heading"][aria-level="1"]', '.DUwDvf', '.qBF1Pd'];
                let name = '';
                for (const sel of nameSelectors) {
                    const el = document.querySelector(sel);
                    if (el && el.textContent.trim().length > 2) { name = el.textContent.trim(); break; }
                }

                // Rating: look for a star pattern like "4,5"
                let rating = null;
                const allSpans = document.querySelectorAll('span');
                for (const span of allSpans) {
                    const t = span.textContent.trim();
                    if (/^[1-5][,.]\\d$/.test(t)) { rating = t; break; }
                }

                // Address and phone from button list
                let address = null;
                let phoneText = null;
                const buttons = document.querySelectorAll('button.CsEnBe, button[data-item-id]');
                for (const btn of buttons) {
                    const label = btn.getAttribute('aria-label') || btn.getAttribute('data-item-id') || '';
                    const text = btn.querySelector('.Io6YTe, .fontBodyMedium')?.textContent?.trim();
                    if (!text) continue;
                    if (label.toLowerCase().includes('address') || label.toLowerCase().includes('alamat') || label.toLowerCase().includes('location')) {
                        address = text;
                    } else if (label.toLowerCase().includes('phone') || label.toLowerCase().includes('telepon') || /^[\\d\\s\\(\\)\\-\\+]+$/.test(text)) {
                        phoneText = text;
                    }
                }

                // Fallback: scan all button aria-labels for phone pattern
                if (!phoneText) {
                    const allBtns = document.querySelectorAll('button');
                    for (const btn of allBtns) {
                        const label = btn.getAttribute('aria-label') || '';
                        const phoneMatch = label.match(/([\\d\\s\\(\\)\\-\\+]{9,20})/);
                        if (phoneMatch) { phoneText = phoneMatch[1].trim(); break; }
                    }
                }

                // Website link
                let website = null;
                const links = document.querySelectorAll('a[data-item-id*="authority"], a[aria-label*="website"], a[aria-label*="situs"]');
                if (links.length > 0) website = links[0].href;

                return { name, rating, address, phoneText, website };
            })()`);

            if (data.name) {
                const phone = data.phoneText ? cleanPhone(data.phoneText) : null;
                const kecamatan = data.address ? extractKecamatan(data.address) : null;
                const kabupaten = resolveKabupaten(kecamatan, data.address);
                
                const finalData = {
                   ...data,
                   phone,
                   koordinat,
                   kecamatan: kecamatan || 'Unknown',
                   kabupaten,
                   score: calculateScore({ phone, rating: data.rating, website: data.website })
                };

                // Check for duplication: if has phone, check phone; if not, check name
                let check;
                if (phone) {
                   check = await pool.query('SELECT id FROM leads_mk WHERE nomor_wa = $1', [phone]);
                } else {
                   check = await pool.query('SELECT id FROM leads_mk WHERE nama_lead = $1 AND alamat_lengkap = $2', [data.name, data.address]);
                }

                if (check.rows.length === 0) {
                   await pool.query(
                     `INSERT INTO leads_mk (nama_lead, nomor_wa, status_crm, sumber_lead, alamat_lengkap, website, bintang_google, koordinat_maps, kecamatan, kabupaten, lead_score, last_chat) 
                      VALUES ($1, $2, 'Cold', 'Scraper', $3, $4, $5, $6, $7, $8, $9, NOW())`,
                     [
                        finalData.name, phone, finalData.address, finalData.website, 
                        finalData.rating ? parseFloat(finalData.rating.replace(',','.')) : null,
                        finalData.koordinat, finalData.kecamatan, finalData.kabupaten, finalData.score
                     ]
                   );
                   const loc = finalData.kabupaten ? `${finalData.kecamatan} · ${finalData.kabupaten}` : finalData.kecamatan;
                   console.log(`✅ [${finalData.score} Pts] ${finalData.name} | ${loc} ${phone ? '(' + phone + ')' : '(Tanpa HP)'}`);
                   totalScraped++;
                } else {
                   console.log(`♻️  [SKIP] ${finalData.name} (Sudah ada di database)`);
                }
            } else {
                console.log(`⏭️ [SKIP] Nama tidak ditemukan`);
            }
        } catch (e: any) {
            console.warn(`❌ Gagal memproses link (${link.substring(0, 40)}...): ${e.message}`);
        }
      }
    } catch (e: any) {
      console.error(`Gagal mencari rute: ${keyword}`, e.message);
    } finally {
      await page.close();
    }
  }

  await browser.close();
  console.log(`\n🎉 Proses Deep-Scraping Selesai!`);
  process.exit(0);
}

scrapeMaps().catch(console.error);
