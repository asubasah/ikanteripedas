import Image from "next/image";

export function Footer() {
  return (
    <footer className="mt-32 border-t border-white/5 bg-charcoal pt-24 pb-12">
      <div className="shell mx-auto grid gap-16 px-6 md:grid-cols-12">
        <div className="md:col-span-5">
          <div className="flex items-center gap-3">
            <div className="relative h-16 w-16 shrink-0">
              <Image
                src="/images/logo/logo_mkmetalindo_hires.png"
                alt="MK Metal Indo Logo"
                width={64}
                height={64}
                className="h-full w-full object-contain"
              />
            </div>
            <div>
              <p className="text-xl font-bold text-white tracking-tight">MK Metal Indo</p>
              <p className="text-sm text-text-muted font-medium">High Precision Fabrication Partner</p>
            </div>
          </div>
          <p className="mt-6 text-base text-text-muted leading-relaxed max-w-sm">
            Jasa laser cutting dan fabrikasi metal untuk bengkel & produksi yang butuh hasil rapi, pengerjaan cepat, dan proses tanpa drama.
          </p>
        </div>

        <div className="md:col-span-3">
          <h4 className="mono text-[10px] font-bold uppercase tracking-[0.4em] text-maroon-600 mb-6">Contact Details</h4>
          <ul className="space-y-4 text-sm font-medium text-text-muted">
            <li className="flex flex-col">
              <span className="text-[10px] uppercase text-white/20 mb-1">Telepon</span>
              <span className="text-text-light">(031) 9969 4300</span>
            </li>
            <li className="flex flex-col">
              <span className="text-[10px] uppercase text-white/20 mb-1">WhatsApp</span>
              <span className="text-text-light">0811 3195 800</span>
            </li>
            <li className="flex flex-col">
              <span className="text-[10px] uppercase text-white/20 mb-1">Email Support</span>
              <span className="text-text-light">order@mkmetal-indo.com</span>
            </li>
          </ul>
        </div>

        <div className="md:col-span-4">
          <h4 className="mono text-[10px] font-bold uppercase tracking-[0.4em] text-maroon-600 mb-6">Headquarters</h4>
          <p className="text-sm font-medium text-text-muted mb-8 leading-relaxed">
            Jl. Tambak Sawah No.6B, Waru, Sidoarjo,<br />Jawa Timur 61253
          </p>
          <div className="flex flex-wrap gap-4">
            {["Layanan", "Cara Kerja", "Hubungi Kami"].map((item) => (
              <a key={item} href={`#${item.toLowerCase().replace(" ", "")}`} className="text-xs font-bold text-white/40 hover:text-white transition-colors border-b border-transparent hover:border-maroon-600 pb-1">
                {item}
              </a>
            ))}
          </div>
        </div>
      </div>

      <div className="shell mx-auto mt-24 border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/20">
          © {new Date().getFullYear()} MK Metal Indo. Precision Engineering.
        </p>
        <div className="flex gap-6 text-[10px] font-bold uppercase tracking-widest text-white/20">
          <span className="hover:text-white cursor-pointer transition-colors">Privacy Policy</span>
          <span className="hover:text-white cursor-pointer transition-colors">Terms of Service</span>
        </div>
      </div>
    </footer>
  );
}
