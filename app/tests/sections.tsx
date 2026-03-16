import { Icon } from "@iconify/react";

export default function Section1() {
    return(
        <section id="features" className="py-24 sm:py-32 relative z-10 border-t border-zinc-900/50 bg-[#09090b]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl scroll-animate is-visible">
          <h2 className="text-xs font-normal text-zinc-500 tracking-widest uppercase flex items-center gap-2">
            <span className="w-8 h-px bg-zinc-700"></span>
            Infrastructure Primitives
          </h2>
          <p className="mt-4 text-3xl font-normal tracking-tight text-zinc-100 sm:text-4xl drop-shadow-md">
            Engineered for physical scale
          </p>
          <p className="mt-4 text-base text-zinc-400">
            Abstract away the complexity of GPU orchestration. We built the
            hardware layer so you can focus on the model.
          </p>
        </div>

        <div className="mx-auto mt-16 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 scroll-animate perspective-1000 is-visible">
          <div className="tactile-base rounded-2xl p-6 group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col h-64">
            <div className="absolute right-0 top-0 w-32 h-32 bg-indigo-500/5 rounded-bl-full blur-2xl transition-opacity group-hover:opacity-100 opacity-50"></div>
            <div className="mb-auto">
              <div className="w-12 h-12 rounded-xl tactile-inset flex items-center justify-center border border-zinc-800/50 mb-6 shadow-inner relative">
                <Icon icon="solar:bolt-linear" width="24" className="text-zinc-300 relative z-10"></Icon>
                <div className="absolute bottom-1 right-1 w-1.5 h-1.5 rounded-full bg-zinc-700 group-hover:bg-indigo-400 transition-colors shadow-[0_0_8px_rgba(99,102,241,0)] group-hover:shadow-[0_0_8px_rgba(99,102,241,1)]"></div>
              </div>
              <h3 className="text-lg font-normal tracking-tight text-zinc-100">
                Elastic Compute
              </h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Dynamically scale H100s up or down based on your inference
                queues without downtime.
              </p>
            </div>
            <div className="h-1 w-12 bg-zinc-800 rounded-full mt-4 group-hover:bg-zinc-600 transition-colors"></div>
          </div>

          <div className="tactile-base rounded-2xl p-6 group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col h-64">
            <div className="mb-auto">
              <div className="w-12 h-12 rounded-xl tactile-inset flex items-center justify-center border border-zinc-800/50 mb-6 shadow-inner relative">
                <Icon icon="solar:shield-check-linear" width="24" className="text-zinc-300 relative z-10"></Icon>
              </div>
              <h3 className="text-lg font-normal tracking-tight text-zinc-100">
                Model Registry
              </h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Version control weights, track hyperparameters, and roll back
                deployments with physical precision.
              </p>
            </div>
            <div className="h-1 w-12 bg-zinc-800 rounded-full mt-4 group-hover:bg-zinc-600 transition-colors"></div>
          </div>

          <div className="tactile-base rounded-2xl p-6 group transition-all duration-300 hover:-translate-y-2 hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,1)] relative overflow-hidden flex flex-col h-64">
            <div className="mb-auto">
              <div className="w-12 h-12 rounded-xl tactile-inset flex items-center justify-center border border-zinc-800/50 mb-6 shadow-inner relative">
                <Icon icon="solar:chart-square-linear" width="24" className="text-zinc-300 relative z-10"></Icon>
              </div>
              <h3 className="text-lg font-normal tracking-tight text-zinc-100">
                Deep Analytics
              </h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Measure what matters. Uncover hardware bottlenecks with custom
                reporting panels.
              </p>
            </div>
            <div className="h-1 w-12 bg-zinc-800 rounded-full mt-4 group-hover:bg-zinc-600 transition-colors"></div>
          </div>
        </div>
      </div>
    </section>
    )
}