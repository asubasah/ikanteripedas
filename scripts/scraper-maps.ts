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
  "Kontraktor Mekanikal Elektrikal Surabaya"
];

function cleanPhone(raw: string) {
  let cleaned = raw.replace(/\D/g, '');
  if (cleaned.startsWith('62')) cleaned = '0' + cleaned.substring(2);
  if (cleaned.startsWith('8')) cleaned = '0' + cleaned;
  return cleaned.length >= 10 ? cleaned : null;
}

function extractKecamatan(address: string) {
  // Address usually looks like: "Jl. Rungkut Industri Raya No.1, Kendangsari, Kec. Tenggilis Mejoyo, Surabaya"
  // Regex to match "Kec. [Word]" or "Kecamatan [Word]"
  const match = address.match(/(?:Kec\.|Kecamatan)\s+([A-Za-z\s]+)(?:,|$)/i);
  if (match && match[1]) {
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
      
      const businessLinks = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('a[href^="https://www.google.com/maps/place"]'))
          .map((a: any) => a.href);
      });
      
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

            const data = await page.evaluate(() => {
                const nameNode = document.querySelector('h1.fontHeadlineLarge');
                
                // Rating format usually in div.F7nice span
                const ratingNode = document.querySelector('div.F7nice span[aria-hidden="true"]');
                
                const getByTooltip = (selectorContent: string) => {
                    const btn = document.querySelector(`button[data-tooltip*="${selectorContent}"]`);
                    // @ts-ignore
                    return btn ? btn.querySelector('.Io6YTe, .fontBodyMedium')?.innerText?.trim() : null;
                };
                const getWebsite = () => {
                    const as = document.querySelectorAll('a[data-tooltip*="situs web"], a[data-tooltip*="website"]');
                    if (as.length > 0) {
                         // @ts-ignore
                         return as[0].href;
                    }
                    return null;
                };

                return {
                    name: nameNode ? nameNode.textContent?.trim() : '',
                    rating: ratingNode ? ratingNode.textContent?.trim() : null,
                    address: getByTooltip("Salin alamat") || getByTooltip("Copy address"),
                    phoneText: getByTooltip("Salin nomor telepon") || getByTooltip("Copy phone number"),
                    website: getWebsite()
                };
            });

            if (data.name && data.phoneText) {
                const phone = cleanPhone(data.phoneText);
                const kecamatan = data.address ? extractKecamatan(data.address) : 'Unknown';
                
                const finalData = {
                   ...data,
                   phone,
                   koordinat,
                   kecamatan,
                   score: calculateScore({ phone, rating: data.rating, website: data.website })
                };

                if (phone) {
                   const check = await pool.query('SELECT id FROM leads_mk WHERE nomor_wa = $1', [phone]);
                   if (check.rows.length === 0) {
                      await pool.query(
                        `INSERT INTO leads_mk (nama_lead, nomor_wa, status_crm, sumber_lead, alamat_lengkap, website, bintang_google, koordinat_maps, kecamatan, lead_score, last_chat) 
                         VALUES ($1, $2, 'Cold', 'Scraper', $3, $4, $5, $6, $7, $8, NOW())`,
                        [
                           finalData.name, phone, finalData.address, finalData.website, 
                           finalData.rating ? parseFloat(finalData.rating.replace(',','.')) : null,
                           finalData.koordinat, finalData.kecamatan, finalData.score
                        ]
                      );
                      console.log(`✅ [${finalData.score} Pts] ${finalData.name} - Kec. ${finalData.kecamatan}`);
                      totalScraped++;
                   } else {
                      // Optionally update existing lead to enrich data
                      await pool.query(
                         `UPDATE leads_mk SET alamat_lengkap = $1, website = $2, bintang_google = $3, koordinat_maps = $4, kecamatan = $5, lead_score = $6 WHERE nomor_wa = $7 AND alamat_lengkap IS NULL`,
                         [
                           finalData.address, finalData.website, 
                           finalData.rating ? parseFloat(finalData.rating.replace(',','.')) : null,
                           finalData.koordinat, finalData.kecamatan, finalData.score, phone
                         ]
                      );
                      console.log(`♻️  [UPDATE] ${finalData.name} (Data diperkaya)`);
                   }
                }
            } else {
                console.log(`⏭️ [SKIP] Data tidak valid (Tanpa Nomor HP)`);
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
