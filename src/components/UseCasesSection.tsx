import Image from "next/image";
import { useCases } from "@/data/homepage";

export function UseCasesSection() {
  return (
    <section
      id="usecase"
      className="shell mx-auto rounded-[32px] bg-white px-6 py-12 text-slate-900 shadow-2xl shadow-slate-900/10"
    >
      <p className="text-xs uppercase tracking-[0.35em] text-[#7b1d3f]">Contoh Kebutuhan</p>
      <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <h2 className="text-3xl font-bold">Contoh kebutuhan yang bisa dibantu MK Metal Indo.</h2>
        <p className="text-base text-slate-600 lg:max-w-xl">
          Setiap customer datang dengan situasi berbeda. Ada yang butuh bantuan saat order lagi ramai, ada yang butuh proses tertentu karena mesin belum lengkap, dan ada juga yang butuh pengerjaan lanjut sampai tahap fabrikasi.
        </p>
      </div>
      <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {useCases.map((useCase) => (
          <article key={useCase.title} className="overflow-hidden rounded-3xl border border-slate-100 bg-slate-50">
            <div className="h-52 w-full">
              <Image
                src={useCase.image}
                alt={useCase.title}
                width={600}
                height={350}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="p-6">
              <h3 className="text-xl font-semibold text-slate-900">{useCase.title}</h3>
              <p className="mt-2 text-sm text-slate-600">{useCase.description}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
