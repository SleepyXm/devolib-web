import { Icon } from "@iconify/react";

export default function Section2() {
    return(

        <section className="sm:py-32 overflow-hidden border-y bg-[#0a0a0c] border-zinc-900 pt-24 pb-24 relative shadow-[inset_0_20px_40px_rgba(0,0,0,0.5),inset_0_-20px_40px_rgba(0,0,0,0.5)] hardware-pipeline-section">


  <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
    <div className="text-center max-w-2xl mx-auto mb-20 scroll-animate is-visible">
      <h2 className="text-3xl font-normal tracking-tight text-zinc-100">
        The hardware pipeline
      </h2>
      <p className="mt-4 text-base text-zinc-400">
        A staged physical workflow for ingesting, shaping, compiling, validating, and deploying
        intelligence across distributed compute nodes.
      </p>
    </div>

    <div className="pipeline-shell relative max-w-5xl mx-auto scroll-animate is-visible">
      <div className="pipeline-spine">
        <div className="pipeline-spine-track">
          <div className="pipeline-beam"></div>
        </div>
      </div>


      <div className="pipeline-step step-zinc is-visible">
        <div className="step-copy left">
          <h3>Signal Intake</h3>
          <p>
            External uplinks are filtered and normalized before entering the secured processing lattice.
          </p>
        </div>

        <div className="step-card right">
          <div className="pipeline-card tactile-glass p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl tactile-inset flex items-center justify-center text-zinc-300 shrink-0">
              <Icon icon="solar:inbox-linear" width="22"></Icon>
            </div>
            <div className="flex-1 min-w-0">
              <div className="progress-track">
                <div className="progress-fill bg-zinc-400" style={{ ["--target" as any]: "78%" }}></div>
              </div>
              <div className="text-xs font-mono text-zinc-500 mt-3 tracking-wider uppercase">
                INPUT_RATE: 512GB/s
              </div>
            </div>
          </div>
        </div>

        <div className="step-node">
          <div className="step-node-ring">
            <div className="step-node-dot bg-zinc-300"></div>
          </div>
        </div>
      </div>


      <div className="pipeline-step is-visible">
        <div className="step-card left">
          <div className="pipeline-card tactile-glass p-5 flex items-center gap-4">
            <div className="flex-1 text-right min-w-0">
              <div className="text-xs font-mono text-zinc-500 mb-3 tracking-wider uppercase">
                CACHE_SYNC: VERIFIED
              </div>
              <div className="flex justify-end gap-1.5">
                <div className="mini-line w-7 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.55)]"></div>
                <div className="mini-line w-7 h-1.5 rounded-full bg-indigo-500 shadow-[0_0_10px_rgba(99,102,241,0.55)]"></div>
                <div className="mini-line w-7 h-1.5 rounded-full bg-zinc-700"></div>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl tactile-inset flex items-center justify-center text-indigo-400 shrink-0">
              <Icon icon="solar:server-square-update-linear" width="22"></Icon>
            </div>
          </div>
        </div>

        <div className="step-copy right">
          <h3>Cache Alignment</h3>
          <p>
            Memory shards are mirrored and validated so all workers begin from a stable synchronized state.
          </p>
        </div>

        <div className="step-node">
          <div className="step-node-ring">
            <div className="step-node-dot bg-indigo-500"></div>
          </div>
        </div>
      </div>

      <div className="pipeline-step is-visible">
        <div className="step-copy left">
          <h3>Distributed Training</h3>
          <p>
            Compute clusters split tasks across linked accelerators for continuous parallel model shaping.
          </p>
        </div>

        <div className="step-card right">
          <div className="pipeline-card tactile-glass p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl tactile-inset flex items-center justify-center text-indigo-400 shrink-0">
              <Icon icon="solar:magic-stick-3-linear" width="22"></Icon>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-500 mb-3 tracking-wider uppercase">
                <span>TRAIN_STATUS</span>
                <span>ACTIVE</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="mini-stat rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-[11px] text-zinc-400 font-mono">
                  GPU_A 92%
                </div>
                <div className="mini-stat rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-[11px] text-zinc-400 font-mono">
                  GPU_B 88%
                </div>
                <div className="mini-stat rounded-xl border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-[11px] text-zinc-400 font-mono">
                  GPU_C 90%
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="step-node">
          <div className="step-node-ring">
            <div className="step-node-dot bg-indigo-500"></div>
          </div>
        </div>
      </div>


      <div className="pipeline-step step-emerald is-visible">
        <div className="step-card left">
          <div className="pipeline-card tactile-glass p-5 flex items-center gap-4">
            <div className="flex-1 text-right min-w-0">
              <div className="text-xs font-mono text-zinc-500 mb-3 tracking-wider uppercase">
                COMPILE_MATRIX
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <span className="mini-chip text-[11px] font-mono px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  ONNX
                </span>
                <span className="mini-chip text-[11px] font-mono px-3 py-1.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
                  CUDA
                </span>
                <span className="mini-chip text-[11px] font-mono px-3 py-1.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
                  TensorRT
                </span>
              </div>
            </div>
            <div className="w-12 h-12 rounded-xl tactile-inset flex items-center justify-center text-emerald-400 shrink-0">
              <Icon icon="solar:cpu-linear" width="22"></Icon>
            </div>
          </div>
        </div>

        <div className="step-copy right">
          <h3>Model Compilation</h3>
          <p>
            Runtime layers are optimized into hardware-specific execution packages for low-latency delivery.
          </p>
        </div>

        <div className="step-node">
          <div className="step-node-ring">
            <div className="step-node-dot bg-emerald-500"></div>
          </div>
        </div>
      </div>


      <div className="pipeline-step step-emerald is-visible">
        <div className="step-copy left">
          <h3>Deployment Relay</h3>
          <p>
            Verified artifacts are routed through monitored relay channels and published to inference edges.
          </p>
        </div>

        <div className="step-card right">
          <div className="pipeline-card tactile-glass p-5">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 rounded-xl tactile-inset flex items-center justify-center text-emerald-400 shrink-0">
                  <Icon icon="solar:rocket-linear" width="22"></Icon>
                </div>
                <div className="min-w-0">
                  <div className="text-zinc-200 text-base">Edge Deployment</div>
                  <div className="text-xs font-mono text-zinc-500 tracking-wider uppercase mt-1">
                    READY_STATE: 97%
                  </div>
                </div>
              </div>
              <div className="w-3 h-3 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.6)] shrink-0"></div>
            </div>

            <div className="progress-track">
              <div className="progress-fill bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.45)]" style={{ ["--target" as any]: "97%" }}></div>
            </div>
          </div>
        </div>

        <div className="step-node">
          <div className="step-node-ring">
            <div className="step-node-dot bg-emerald-500"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</section>
    );
}