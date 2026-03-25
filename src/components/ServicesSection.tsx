'use client';

import Image from "next/image";
import { homepageData } from "@/data/homepage";
import { useLanguage } from "@/context/LanguageContext";
import { translations } from "@/data/translations";

export function ServicesSection() {
  const { lang } = useLanguage();
  const t = translations[lang].services;
  const services = homepageData[lang].services;

  return (
    <section id="layanan" className="shell mx-auto px-6 py-20">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <span className="mono text-[10px] uppercase tracking-[0.4em] text-maroon-600 font-bold border-l-2 border-maroon-600 pl-4 mb-4 block">
            {t.badge}
          </span>
          <h2 className="text-3xl font-extrabold text-white sm:text-5xl tracking-tight leading-tight">
            {t.subtitle.split(' ').slice(0, 4).join(' ')} <br /><span className="text-text-muted">{t.subtitle.split(' ').slice(4).join(' ')}</span>
          </h2>
        </div>
        <p className="text-lg text-text-muted lg:max-w-md leading-relaxed">
          {t.desc}
        </p>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-6 lg:grid-cols-12 auto-rows-[280px]">
        {services.map((service, index) => {
          const isLarge = index === 0 || index === 1;
          const colSpan = isLarge ? "md:col-span-3 lg:col-span-6" : "md:col-span-3 lg:col-span-4";

          return (
            <article
              key={service.title}
              className={`${colSpan} group relative overflow-hidden rounded-[32px] border-machined bg-charcoal-800 p-8 flex flex-col justify-end transition-all duration-500 hover:border-white/20 hover:-translate-y-1 shadow-xl`}
            >
              {/* Background Image with Overlays */}
              <div className="absolute inset-0 z-0 transition-transform duration-700 group-hover:scale-110">
                <Image
                  src={(service as any).image}
                  alt={service.title}
                  fill
                  className="object-cover opacity-30 grayscale transition-all duration-500 group-hover:opacity-50 group-hover:grayscale-0"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-charcoal via-charcoal/60 to-transparent"></div>
              </div>

              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:opacity-40 group-hover:scale-110 transition-transform z-10">
                <div className="h-16 w-16 rounded-full border-2 border-dashed border-white"></div>
              </div>

              <div className="relative z-10">
                <span className="mono text-[10px] text-maroon-600 font-bold mb-2 block uppercase tracking-widest">Service 0{index + 1}</span>
                <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-maroon-600 transition-colors">
                  {service.title}
                </h3>
                <p className="text-sm text-text-muted leading-relaxed opacity-80 group-hover:opacity-100 line-clamp-2">
                  {service.description}
                </p>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  );
}
