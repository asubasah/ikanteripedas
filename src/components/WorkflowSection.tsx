import { workflowSteps } from "@/data/homepage";

export function WorkflowSection() {
  return (
    <section id="alur" className="shell mx-auto px-6 py-24 relative">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent to-maroon-600/30"></div>

      <div className="text-center mb-20">
        <span className="mono text-[10px] uppercase tracking-[0.5em] text-maroon-600 font-bold mb-4 block">Operation Protocol</span>
        <h2 className="text-3xl font-extrabold text-white sm:text-5xl tracking-tight">Proses Praktis, <span className="text-text-muted">Hasil Maksimal.</span></h2>
        <p className="mt-6 text-lg text-text-muted max-w-2xl mx-auto italic border-l-2 border-white/5 pl-6">
          "Kami menjaga alur tetap sederhana supaya Anda bisa fokus pada produksi selanjutnya."
        </p>
      </div>

      <div className="relative mt-20 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
        {/* Progress Line Connector */}
        <div className="hidden lg:block absolute top-1/2 left-0 w-full h-px bg-white/5 -z-10"></div>

        {workflowSteps.map((step, index) => (
          <article
            key={step.step}
            className="group relative rounded-[32px] border-machined bg-charcoal/50 backdrop-blur-sm p-8 hover:bg-charcoal-800 transition-all duration-500 shadow-xl"
          >
            <div className="mb-6 flex items-center justify-between">
              <span className="mono text-[32px] font-black text-white/5 group-hover:text-maroon-600/20 transition-colors leading-none">0{index + 1}</span>
              <div className="h-2 w-2 rounded-full bg-maroon-600 group-hover:scale-150 transition-transform shadow-[0_0_10px_var(--maroon-glow)]"></div>
            </div>
            <h3 className="text-xl font-bold text-white mb-4">{step.title}</h3>
            <p className="text-sm text-text-muted leading-relaxed">{step.description}</p>
          </article>
        ))}
      </div>

      <div className="mt-16 flex items-center gap-4 rounded-2xl border border-white/5 bg-white/[0.02] p-6 max-w-fit mx-auto shadow-inner">
        <div className="h-2 w-2 rounded-full bg-amber animate-pulse"></div>
        <p className="text-sm text-text-muted font-medium italic">
          Belum punya detail lengkap? Kirim kebutuhan dasar dulu, tim kami bantu arahin proses paling pas.
        </p>
      </div>
    </section>
  );
}
