import { segments } from "@/data/homepage";

export function SegmentsSection() {
  return (
    <section
      id="segment"
      className="shell mx-auto rounded-[32px] bg-white text-slate-900 px-6 py-12 shadow-2xl shadow-slate-900/10"
    >
      <p className="text-xs uppercase tracking-[0.35em] text-[#7b1d3f]">Cocok untuk Kebutuhan Seperti Ini</p>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="text-3xl font-bold text-slate-900 lg:max-w-3xl">
          MK Metal Indo Cocok untuk Bengkel, Workshop, dan Produksi yang Butuh Bantuan Pengerjaan Metal Tanpa Ribet
        </h2>
        <p className="text-base text-slate-600 lg:max-w-xl">
          Kami membantu saat pekerjaan butuh cepat jalan, saat mesin belum lengkap, atau saat order sedang ramai dan perlu partner pengerjaan yang bisa bantu cutting, bending, shearing, atau fabrikasi dengan hasil rapi dan proses yang lebih praktis.
        </p>
      </div>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {segments.map((item) => (
          <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-xl font-semibold text-slate-900">{item.title}</h3>
            <p className="mt-2 text-sm text-slate-600">{item.description}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
