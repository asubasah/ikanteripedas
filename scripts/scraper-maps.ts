import puppeteer from 'puppeteer';
import { Pool } from 'pg';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Koneksi Database
const dbUrl = process.env.DATABASE_URL;
const pool = new Pool({ connectionString: dbUrl });

// Keyword → Kategori otomatis (Fokus Target Market)
let KEYWORD_MAP: { keyword: string; kategori: string }[] = [];

if (process.env.SCRAPE_KEYWORDS) {
  try {
     KEYWORD_MAP = JSON.parse(process.env.SCRAPE_KEYWORDS);
  } catch (e) {
     console.error('Invalid custom SCRAPE_KEYWORDS JSON');
  }
}

if (KEYWORD_MAP.length === 0) {
  KEYWORD_MAP = [
  // Kompetitor / Kolaborator
  { keyword: "Jasa Laser Cutting Sidoarjo",       kategori: "Jasa Cutting Laser" },
  { keyword: "Laser Cutting Plat Surabaya",        kategori: "Jasa Cutting Laser" },
  { keyword: "Jasa Bending CNC Sidoarjo",          kategori: "Jasa Bending" },
  { keyword: "Shearing Plat Surabaya",             kategori: "Jasa Shearing" },
  
  // Target Market Spesifik (Konsumen Jasa Laser)
  { keyword: "Karoseri Sidoarjo",                  kategori: "Otomotif & Karoseri" },
  { keyword: "Pabrik Pembuat Karoseri Gresik",     kategori: "Otomotif & Karoseri" },
  { keyword: "Pabrik Mesin Surabaya",              kategori: "Pabrik Mesin" },
  { keyword: "Produsen Alat Pertanian Jawa Timur", kategori: "Alat Pertanian" },
  { keyword: "Workshop Konstruksi Baja Gresik",    kategori: "Konstruksi Baja" },
  { keyword: "Pembuat Lift Surabaya",              kategori: "Manufaktur Lift" },
  { keyword: "Manufaktur Logam Sidoarjo",          kategori: "Industri Manufaktur" },
    { keyword: "Produsen Pintu Besi Pasuruan",       kategori: "Manufaktur Pintu/Pagar" },
    { keyword: "Kontraktor Mekanikal Elektrikal Surabaya", kategori: "Kontraktor ME" },
    { keyword: "Pembuat Mesin Industri Surabaya",    kategori: "Pabrik Mesin" },
  ];
}

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

function extractKecamatan(address: string): string | null {
  const match = address.match(/(?:Kec\.|Kecamatan)\s+([A-Za-z\s]+)(?:,|$)/i);
  if (match && match[1]) return match[1].trim();
  const parts = address.split(',');
  if (parts.length >= 3) return parts[parts.length - 2].trim();
  return null;
}

function cleanPhone(raw: string): string | null {
  let cleaned = raw.replace(/\D/g, '');
  if (cleaned.startsWith('62')) cleaned = '0' + cleaned.substring(2);
  if (cleaned.startsWith('8')) cleaned = '0' + cleaned;
  return cleaned.length >= 10 ? cleaned : null;
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
      let prevHeight = 0;
      let noChangeCount = 0;
      
      const timer = setInterval(() => {
        const scrollable = document.querySelector('div[role="feed"]');
        if (scrollable) {
          // Scroll down by a large amount
          scrollable.scrollBy(0, 800);
          
          if (scrollable.scrollHeight === prevHeight) {
             noChangeCount++;
             // Wait 10 iterations without height change before deciding it's the end (5 seconds)
             if (noChangeCount >= 10) { 
                clearInterval(timer);
                resolve(true);
             }
          } else {
             noChangeCount = 0;
             prevHeight = scrollable.scrollHeight;
          }
        } else {
          // Fallback if no feed div found
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

  for (const { keyword, kategori: autoKategori } of KEYWORD_MAP) {
    console.log(`\n🔍 [${autoKategori}] Mencari: ${keyword}`);
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
        return Array.from(document.querySelectorAll('a[href^="https://www.google.com/maps/place"], a.hfpxzc'))
          .map((a) => a.href || '')
          .filter(href => href.includes('/maps/place'));
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

                // Reviews count
                let reviews = 0;
                for (const span of allSpans) {
                    const t = span.textContent.trim();
                    const match = t.match(/^\\((\\d[\\d,.]*)\\)$/); // e.g. "(123)" or "(1.234)"
                    if (match) { 
                       reviews = parseInt(match[1].replace(/[\\D]/g, ''), 10); 
                       break; 
                    }
                }
                if (!reviews) {
                   const reviewBtn = document.querySelector('button[aria-label*="ulasan"], button[aria-label*="review"]');
                   if (reviewBtn) {
                      const text = reviewBtn.textContent?.replace(/[\\D]/g, '');
                      if (text) reviews = parseInt(text, 10);
                   }
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

                return { name, rating, reviews, address, phoneText, website };
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
                   kategori: autoKategori,
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
                     `INSERT INTO leads_mk (nama_lead, nomor_wa, status_crm, sumber_lead, alamat_lengkap, website, bintang_google, jumlah_review, koordinat_maps, kecamatan, kabupaten, kategori, lead_score, last_chat) 
                      VALUES ($1, $2, 'Cold', 'Scraper', $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())`,
                     [
                        finalData.name, phone, finalData.address, finalData.website, 
                        finalData.rating ? parseFloat(finalData.rating.replace(',','.')) : null,
                        data.reviews || 0,
                        finalData.koordinat, finalData.kecamatan, finalData.kabupaten, finalData.kategori, finalData.score
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
