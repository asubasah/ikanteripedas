'use client';

import { homepageData } from "@/data/homepage";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/data/translations";

export function ReasonsSection() {
  const { lang } = useLanguage();
  const t = translations[lang].reasons;
  const benefits = homepageData[lang].benefits;

  return (
    <section
      id="alasan"
      className="shell mx-auto grid gap-16 overflow-hidden rounded-[48px] bg-charcoal-800 border-machined px-6 py-20 lg:grid-cols-[1.2fr_1fr] lg:px-12"
    >
      <div className="relative">
        <div className="absolute -left-12 -top-12 h-64 w-64 rounded-full bg-maroon-600/5 blur-[100px]"></div>
        <span className="mono text-[10px] uppercase tracking-[0.4em] text-amber font-bold mb-4 block">{t.badge}</span>
        <h2 className="text-3xl font-extrabold text-white sm:text-5xl tracking-tight leading-tight">
          {t.subtitle.split(' ').slice(0, 3).join(' ')} <br /><span className="text-maroon-600">{t.subtitle.split(' ').slice(3).join(' ')}.</span>
        </h2>
        <p className="mt-8 text-lg text-text-muted leading-relaxed">
          {t.desc}
        </p>

        <div className="mt-10 grid grid-cols-2 gap-8 border-t border-white/5 pt-10">
          <div>
            <p className="mono text-2xl font-bold text-white">99%</p>
            <p className="text-[10px] uppercase tracking-widest text-text-muted mt-1">{t.stat_accuracy}</p>
          </div>
          <div>
            <p className="mono text-2xl font-bold text-white">24h</p>
            <p className="text-[10px] uppercase tracking-widest text-text-muted mt-1">{t.stat_leadtime}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-4">
        {benefits.map((benefit, index) => (
          <article
            key={benefit.title}
            className="group relative rounded-3xl border border-white/5 bg-white/[0.02] p-6 hover:bg-white/[0.05] transition-all duration-300"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-charcoal border-machined mono text-xs font-bold text-maroon-600 group-hover:text-amber transition-colors">
                {index + 1}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">{benefit.title}</h3>
                <p className="text-sm text-text-muted leading-relaxed group-hover:text-text-light transition-colors">{benefit.description}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
