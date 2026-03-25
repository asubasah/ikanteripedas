'use client';

import { homepageData } from "@/data/homepage";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/data/translations";

export function SegmentsSection() {
  const { lang } = useLanguage();
  const segments = (homepageData[lang] as any).segments || [];

  return (
    <section
      id="segments"
      className="shell mx-auto px-6 py-12"
    >
      <div className="absolute inset-0 grid-overlay opacity-10 pointer-events-none"></div>
      <div className="relative z-10 font-sans">
        <p className="mono text-[10px] uppercase tracking-[0.4em] text-maroon-600 font-bold mb-3">{translations[lang].segments.badge}</p>
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <h2 className="text-3xl font-bold text-white tracking-tight lg:max-w-xl m-0 leading-tight">
            {translations[lang].segments.title} <br /><span className="text-maroon-600">{translations[lang].segments.subtitle}</span>
          </h2>
          <p className="text-base text-text-muted lg:max-w-md m-0 leading-relaxed font-medium">
            {translations[lang].segments.desc}
          </p>
        </div>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {segments.map((item: any) => (
            <article key={item.title} className="group relative rounded-2xl border border-white/5 bg-white/[0.02] p-8 transition-all hover:bg-white/[0.04] hover:border-white/10 shadow-sm metallic-shine overflow-hidden">
              <h3 className="text-lg font-bold text-white tracking-tight m-0">{item.title}</h3>
              <p className="mt-4 text-sm text-text-muted leading-relaxed font-medium m-0 opacity-80 group-hover:opacity-100 transition-opacity">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
