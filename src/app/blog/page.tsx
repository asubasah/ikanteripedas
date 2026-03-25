import React from 'react';
import Link from 'next/link';
import { query } from '@/lib/db';
import { Metadata } from 'next';
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const metadata: Metadata = {
  title: 'Blog & Edukasi Industri | MK Metalindo',
  description: 'Informasi terbaru seputar industri sheet metal fabrication, laser cutting, dan bending CNC dari ahlinya.',
};

export const dynamic = 'force-dynamic';

export default async function BlogIndex() {
  let articles = [];
  try {
    const res = await query(`SELECT id, title, slug, meta_description, featured_image, created_at FROM articles WHERE status = 'published' ORDER BY created_at DESC`);
    articles = res.rows;
  } catch (err) {
    console.error('Failed to load articles', err);
  }

  return (
    <div className="min-h-screen bg-charcoal text-text-light font-manrope flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Hero Section */}
        <section className="pt-20 pb-16 px-6 relative overflow-hidden bg-charcoal-900 border-b border-white/5">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="max-w-6xl mx-auto relative z-10 text-center">
            <span className="inline-block px-4 py-1.5 rounded-full bg-amber/10 text-amber text-xs font-bold tracking-widest uppercase mb-6 border border-amber/20">
              Jurnal & Wawasan Industri
            </span>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 tracking-tight drop-shadow-md">
              Edukasi <span className="text-amber">Sheet Metal</span>
            </h1>
            <p className="text-white/70 text-lg md:text-xl max-w-2xl mx-auto font-light leading-relaxed">
              Update terbaru, tips teknis laser cutting CNC, dan inovasi fabrikasi langsung dari tenaga ahli profesional kami.
            </p>
          </div>
        </section>

        {/* Blog Grid */}
        <section className="py-20 px-6 max-w-6xl mx-auto z-10 relative">
          {articles.length === 0 ? (
            <div className="text-center text-white/40 py-20 border-2 border-dashed border-white/10 rounded-3xl bg-white/5 shadow-sm">
              Belum ada artikel yang dipublikasikan. Cek kembali nanti!
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {articles.map((art: any) => (
                <Link href={`/blog/${art.slug}`} key={art.id} className="group flex flex-col bg-charcoal-800 border border-white/10 rounded-3xl overflow-hidden hover:border-maroon/50 transition-all shadow-xl hover:shadow-2xl hover:shadow-maroon/10 hover:-translate-y-2">
                  <div className="aspect-[4/3] bg-charcoal-900 relative overflow-hidden">
                    {art.featured_image ? (
                      <img src={art.featured_image} alt={art.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700 ease-in-out" />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center text-white/10 group-hover:scale-110 transition-transform duration-700 ease-in-out">
                        <div className="text-5xl font-black tracking-tighter mb-2 opacity-50">MK</div>
                      </div>
                    )}
                    {/* Subtle gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-charcoal-800 via-transparent to-transparent opacity-100 mt-10"></div>
                  </div>
                  
                  <div className="p-8 flex flex-col flex-1 bg-charcoal-800 relative z-10 -mt-6">
                    {/* Floating Date Badge */}
                    <div className="absolute -top-6 right-6 bg-charcoal border border-white/10 shadow-lg px-4 py-1.5 rounded-full text-[10px] font-bold text-amber uppercase tracking-widest z-10">
                      {new Date(art.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'short', day: 'numeric' })}
                    </div>
                    
                    <h2 className="text-2xl font-black text-white mb-4 line-clamp-2 leading-snug group-hover:text-amber transition-colors">{art.title}</h2>
                    
                    <p className="text-sm text-white/50 line-clamp-3 mb-8 flex-1 leading-relaxed font-light">
                      {art.meta_description}
                    </p>
                    
                    <div className="flex items-center gap-3 text-red-500 font-black text-xs uppercase tracking-widest mt-auto border-t border-white/5 pt-6 group-hover:pl-2 transition-all">
                      <span>Baca Artikel Lengkap</span>
                      <span className="text-lg">→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
        {/* Call to Action Section */}
        <section className="pb-32 px-6 max-w-6xl mx-auto z-10 relative">
          <div className="bg-gradient-to-br from-charcoal-900 via-charcoal-800 to-red-900/20 text-white border border-white/5 p-12 md:p-20 rounded-[3rem] text-center shadow-2xl relative overflow-hidden group">
            {/* Background Accents */}
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-maroon/20 rounded-full blur-[100px] pointer-events-none group-hover:bg-maroon/30 transition-colors duration-1000"></div>
            <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber/10 rounded-full blur-[80px] pointer-events-none group-hover:bg-amber/20 transition-colors duration-1000"></div>
            
            <div className="relative z-10 max-w-3xl mx-auto">
              <span className="inline-block text-amber text-[10px] font-bold uppercase tracking-[0.3em] mb-6 px-4 py-1.5 bg-amber/5 border border-amber/10 rounded-full">
                Solusi Fabrikasi Metal
              </span>
              <h2 className="text-4xl md:text-5xl lg:text-6xl font-black mb-8 leading-tight tracking-tight">
                Punya Proyek <span className="text-white">Metal?</span><br />
                <span className="text-amber">Konsultasikan</span> Sekarang.
              </h2>
              <p className="text-white/60 mb-12 text-lg md:text-xl font-light leading-relaxed max-w-2xl mx-auto">
                Tim engineering MK Metalindo siap membantu mewujudkan desain Anda dengan presisi mesin laser CNC terbaru dan pengerjaan yang profesional.
              </p>
              
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <a 
                  href="https://wa.me/628113195800?text=Halo%20MK%20Metal%20Indo,%20saya%20ingin%20konsultasi%20mengenai%20proyek%20saya." 
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-3 bg-maroon hover:bg-red-700 text-white font-bold px-12 py-5 rounded-full transition-all hover:scale-105 shadow-xl hover:shadow-maroon/20 group"
                >
                  <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 group-hover:animate-pulse">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.433 5.633 1.433h.005c6.551 0 11.89-5.335 11.893-11.892a11.826 11.826 0 00-3.415-8.406z" />
                  </svg>
                  <span>Chat Engineering Kami</span>
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      
      <Footer />
    </div>
  );
}
