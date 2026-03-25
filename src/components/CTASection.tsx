'use client';

import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/data/translations";

const whatsappLink = "https://wa.me/628113195800";

export function CTASection() {
  const { lang } = useLanguage();
  const t = translations[lang].cta;

  return (
    <section
      id="cta"
      className="shell relative mx-auto overflow-hidden rounded-[48px] bg-charcoal-800 border-machined px-6 py-20 text-center"
    >
      <div className="absolute inset-0 grid-overlay opacity-10 pointer-events-none"></div>
      <div className="absolute -top-24 -left-24 h-64 w-64 rounded-full bg-maroon-600/10 blur-[100px]"></div>
      <div className="absolute -bottom-24 -right-24 h-64 w-64 rounded-full bg-amber/10 blur-[100px]"></div>

      <div className="relative z-10">
        <span className="mono text-[10px] uppercase tracking-[0.5em] text-amber font-bold mb-6 block">Ready to Ship</span>
        <h2 className="mx-auto max-w-3xl text-3xl font-extrabold text-white sm:text-5xl tracking-tight leading-tight">
          {t.title} <br /><span className="text-maroon-600">{t.subtitle}</span>
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-lg text-text-muted leading-relaxed">
          {t.desc}
        </p>
        <div className="mt-12 flex flex-wrap justify-center gap-6">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="metallic-shine group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber to-amber-strong px-10 py-5 font-bold text-charcoal shadow-2xl shadow-amber/20 hover:scale-105 transition-all text-lg"
          >
            {translations[lang].common.whatsapp}
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="m9 18 6-6-6-6" /></svg>
          </a>
          <a
            href="#layanan"
            className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-10 py-5 font-bold text-white hover:bg-white/10 transition-colors text-lg"
          >
            {translations[lang].common.see_services}
          </a>
        </div>
      </div>
    </section>
  );
}
