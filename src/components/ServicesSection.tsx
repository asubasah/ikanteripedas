import { services } from "@/data/homepage";

export function ServicesSection() {
  return (
    <section id="layanan" className="shell mx-auto px-6 py-20">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-2xl">
          <span className="mono text-[10px] uppercase tracking-[0.4em] text-maroon-600 font-bold border-l-2 border-maroon-600 pl-4 mb-4 block">
            Core Expertise
          </span>
          <h2 className="text-3xl font-extrabold text-white sm:text-5xl tracking-tight leading-tight">
            Layanan Fabrikasi Metal <br /><span className="text-text-muted">Presisi & Berstandar Industri.</span>
          </h2>
        </div>
        <p className="text-lg text-text-muted lg:max-w-md leading-relaxed">
          Partner pengerjaan yang siap bantu saat pekerjaan harus cepat jalan tanpa kompromi pada kualitas.
        </p>
      </div>

      <div className="mt-16 grid gap-6 md:grid-cols-6 lg:grid-cols-12 auto-rows-[220px]">
        {services.map((service, index) => {
          const isLarge = index === 0 || index === 3;
          const colSpan = isLarge ? "md:col-span-3 lg:col-span-6" : "md:col-span-3 lg:col-span-3";

          return (
            <article
              key={service.title}
              className={`${colSpan} group relative overflow-hidden rounded-[32px] border-machined bg-charcoal-800 p-8 flex flex-col justify-end metallic-shine transition-all duration-500 hover:border-white/20 hover:-translate-y-1 shadow-xl`}
            >
              <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform">
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
