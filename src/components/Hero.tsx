import Image from "next/image";
import Link from "next/link";
import { trustChips } from "@/data/homepage";

const heroImage = "/images/cutting-laser-plate-metalindo.jpg";
const whatsappLink = "https://wa.me/628113195800";

export function Hero() {
  return (
    <section
      id="hero"
      className="shell relative mx-auto mt-6 overflow-hidden rounded-[48px] bg-charcoal-800 border-machined px-6 py-16 lg:px-12 lg:py-24"
    >
      <div className="absolute inset-0 grid-overlay opacity-20 pointer-events-none"></div>
      <div className="relative z-10 grid gap-12 lg:grid-cols-2 lg:items-center">
        <div>
          <span className="badge-pill text-amber">Precision Metal Fabrication</span>
          <h1 className="mt-8 text-4xl font-extrabold leading-[1.1] text-white sm:text-6xl tracking-tight m-0">
            Cutting, Bending, & <br /><span className="text-maroon-600">Fabrikasi Presisi.</span>
          </h1>
          <p className="mt-6 text-xl text-text-muted leading-relaxed max-w-xl m-0">
            Partner pengerjaan metal untuk bengkel & produksi. Hasil rapi, pengerjaan cepat (1-3 hari), dan proses tanpa ribet.
          </p>
          <div className="mt-10 flex flex-wrap gap-4">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="metallic-shine group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber to-amber-strong px-8 py-4 font-bold text-charcoal shadow-2xl shadow-amber/20 hover:scale-105 transition-all"
            >
              Konsultasi via WhatsApp
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-x-1 transition-transform"><path d="m9 18 6-6-6-6" /></svg>
            </a>
            <Link
              href="#layanan"
              className="inline-flex items-center rounded-full border border-white/10 bg-white/5 px-8 py-4 font-bold text-white hover:bg-white/10 transition-colors"
            >
              Lihat Layanan
            </Link>
          </div>
          <div className="mt-12 flex flex-wrap gap-3">
            {trustChips.map((chip) => (
              <span key={chip} className="chip border border-white/5 text-text-muted mono text-[11px] uppercase tracking-wider">
                {chip}
              </span>
            ))}
          </div>
        </div>
        <div className="relative group">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl">
            <div className="absolute inset-0 bg-maroon/10 mix-blend-overlay z-10"></div>
            <Image
              src={heroImage}
              alt="Proses pengerjaan metal"
              width={900}
              height={650}
              className="h-full w-full object-cover grayscale-[0.3] group-hover:grayscale-0 group-hover:scale-105 transition-all duration-700"
              priority
            />
          </div>
          <div className="absolute -bottom-6 -right-4 w-56 border-machined bg-charcoal-700/80 p-5 backdrop-blur-xl rounded-2xl shadow-2xl">
            <p className="mono text-[10px] uppercase tracking-[0.3em] text-maroon-600 font-bold mb-2">Lead Time Standar</p>
            <p className="text-4xl font-extrabold text-white tracking-tighter">1-3 HARI</p>
            <p className="mt-1 text-xs text-text-muted font-medium italic">Selesai tepat waktu.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
