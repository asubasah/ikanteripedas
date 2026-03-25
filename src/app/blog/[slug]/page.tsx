import React from 'react';
import Link from 'next/link';
import { query } from '@/lib/db';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  // Await the entire params object according to the new dynamic routing rules
  const { slug } = await params;
  
  const res = await query('SELECT title, meta_description, featured_image FROM articles WHERE slug = $1 AND status = $2', [slug, 'published']);
  
  if (res.rows.length === 0) return { title: 'Not Found | MK Metalindo' };
  
  const article = res.rows[0];
  return {
    title: `${article.title} | MK Metalindo Blog`,
    description: article.meta_description,
    openGraph: {
      title: article.title,
      description: article.meta_description,
      images: article.featured_image ? [article.featured_image] : [],
      type: 'article',
    }
  };
}

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';

export default async function BlogPostPage({ params }: { params: { slug: string } }) {
  const { slug } = await params;
  const res = await query('SELECT * FROM articles WHERE slug = $1 AND status = $2', [slug, 'published']);
  
  if (res.rows.length === 0) {
    notFound();
  }
  
  const article = res.rows[0];

  return (
    <div className="min-h-screen bg-charcoal text-text-light font-manrope flex flex-col">
      <Header />
      
      <main className="flex-1">
        {/* Article Header (Dark Brand Accent) */}
        <section className="pt-32 pb-24 px-6 relative z-10 text-center bg-charcoal-900 border-b border-white/5">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-red-600/10 rounded-full blur-[120px] pointer-events-none"></div>
          <div className="max-w-4xl mx-auto relative z-10">
            <Link href="/blog" className="inline-block mb-8 text-sm font-bold text-white/50 hover:text-white transition-colors">
              ← Kembali ke Blog
            </Link>
            <div className="mb-6">
              <span className="text-amber text-[10px] font-bold uppercase tracking-widest inline-block bg-amber/10 border border-amber/20 px-4 py-1.5 rounded-full shadow-sm">
                Edukasi Industri
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-black text-white mb-6 leading-tight max-w-3xl mx-auto drop-shadow-md" dangerouslySetInnerHTML={{ __html: article.title }}></h1>
            <p className="text-white/70 text-lg md:text-xl font-light mb-8 max-w-2xl mx-auto leading-relaxed">{article.meta_description}</p>
            
            <div className="flex items-center justify-center gap-4 text-xs font-bold text-white/40 uppercase tracking-widest border-y border-white/5 py-4 max-w-md mx-auto">
              <span>{new Date(article.created_at).toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <span className="w-1.5 h-1.5 bg-amber/50 rounded-full"></span>
              <span>By MK Metalindo</span>
            </div>
          </div>
        </section>

        {/* Featured Image - Pulled up to overlap */}
        {article.featured_image && (
          <section className="px-6 max-w-5xl mx-auto -mt-16 relative z-20 mb-16">
            <div className="aspect-[21/9] md:aspect-video w-full rounded-3xl overflow-hidden shadow-2xl border border-white/10 bg-charcoal-800">
              <img src={article.featured_image} alt={article.title} className="w-full h-full object-cover" />
            </div>
          </section>
        )}

        {/* Content wrapper with dark typography styling */}
        <section className={`px-6 pb-24 max-w-3xl mx-auto relative z-10 ${!article.featured_image && 'mt-16'}`}>
          <div className="bg-charcoal-800 p-8 md:p-14 rounded-[2rem] border border-white/5 shadow-2xl shadow-black/50">
            <article 
              className="prose prose-invert prose-lg max-w-none text-white/80 font-light leading-relaxed
                prose-headings:text-white prose-headings:font-black prose-headings:tracking-tight
                prose-h1:text-4xl prose-h1:mb-8 prose-h1:hidden /* Title is rendered in header instead */
                prose-h2:text-3xl prose-h2:mt-12 prose-h2:mb-6 prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-4
                prose-h3:text-2xl prose-h3:mt-8 prose-h3:text-amber/90
                prose-p:mb-6 prose-p:text-[1.1rem]
                prose-a:text-amber prose-a:font-bold prose-a:no-underline hover:prose-a:underline hover:prose-a:text-yellow-400
                prose-strong:text-white prose-strong:font-bold
                prose-ul:mt-4 prose-ul:mb-6 prose-ul:list-disc
                prose-li:my-2
                prose-img:rounded-3xl prose-img:shadow-xl prose-img:border prose-img:border-white/10 prose-img:my-12 prose-img:mx-auto"
            >
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]} 
                rehypePlugins={[rehypeRaw]}
              >
                {article.content}
              </ReactMarkdown>
            </article>
          </div>
          
          {/* Call to Action Footer */}
          <div className="mt-20 bg-gradient-to-br from-charcoal-900 to-red-900/30 text-white border border-red-500/20 p-10 md:p-12 rounded-[2rem] text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber/10 rounded-full blur-[80px] pointer-events-none"></div>
            <h3 className="text-3xl font-black mb-4 relative z-10">Butuh Jasa Laser Cutting & Bending?</h3>
            <p className="text-white/70 mb-8 max-w-xl mx-auto text-lg relative z-10">Kami di MK Metalindo siap memproduksi komponen fabrikasi Anda dengan kecepatan dan presisi mesin CNC terkini.</p>
            <a 
              href="https://wa.me/628113195800?text=Halo%20MK%20Metal%20Indo,%20saya%20ingin%20konsultasi%20mengenai%20kebutuhan%20fabrikasi%20saya." 
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 bg-maroon hover:bg-red-700 text-white font-bold px-10 py-4 rounded-full transition-all hover:scale-105 shadow-xl relative z-10 group"
            >
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6 group-hover:animate-pulse">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L0 24l6.335-1.662c1.72.937 3.659 1.433 5.633 1.433h.005c6.551 0 11.89-5.335 11.893-11.892a11.826 11.826 0 00-3.415-8.406z" />
              </svg>
              <span>Hubungi Konsultan Engineer Kami</span>
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
