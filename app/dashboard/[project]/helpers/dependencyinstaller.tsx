"use client";

import { useContext, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { ProjectContext } from "../../[project]/layout";
import { LogOutput } from "../../components/terminal/terminalcomponents";
import { buildInstallPayload, validatePackageName, PackageManager } from "./depshelper";

interface QueuedPackage {
  name: string;
  dev: boolean;
}

const PM_COMMANDS: Record<PackageManager, { install: string; dev: string | null }> = {
  npm:   { install: "npm install",  dev: "--save-dev" },
  pip:   { install: "pip install",  dev: null },
  yarn:  { install: "yarn add",     dev: "--dev" },
  cargo: { install: "cargo add",    dev: "--dev" },
};

function buildPreview(pm: PackageManager, queue: QueuedPackage[]): string | null {
  if (!queue.length) return null;
  const c = PM_COMMANDS[pm];
  const deps = queue.filter(p => !p.dev).map(p => p.name);
  const devs = queue.filter(p => p.dev).map(p => p.name);
  const parts: string[] = [];
  if (deps.length) parts.push(`${c.install} ${deps.join(" ")}`);
  if (devs.length) parts.push(c.dev ? `${c.install} ${c.dev} ${devs.join(" ")}` : `${c.install} ${devs.join(" ")}`);
  return parts.join(" && ");
}

export default function DependencyInstallerPage() {
  const { projectWS, isRunning, isConnected, start, connect, stop, logs, setProjectId } = useContext(ProjectContext)!;
  const params = useParams();
  const projectId = Array.isArray(params?.project) ? params.project[0] : params?.project;

  const [pm, setPm] = useState<PackageManager>("npm");
  const [input, setInput] = useState("");
  const [isDev, setIsDev] = useState(false);
  const [queue, setQueue] = useState<QueuedPackage[]>([]);

  useEffect(() => {
    if (projectId) setProjectId(projectId);
  }, [projectId, setProjectId]);

  const addToQueue = () => {
    const name = input.trim();
    if (!name) return;
    if (!validatePackageName(name)) {
      // invalid name — you could wire this into a toast or inline error
      console.error(`Invalid package name: ${name}`);
      return;
    }
    setQueue(prev => [...prev, { name, dev: isDev }]);
    setInput("");
  };

  const removeFromQueue = (i: number) => {
    setQueue(prev => prev.filter((_, idx) => idx !== i));
  };

  const install = () => {
    if (!queue.length || !projectWS || !isRunning) return;
    const payloads = buildInstallPayload(pm, queue);
    for (const payload of payloads) {
      projectWS.sendCommand(JSON.stringify(payload));
    }
    setQueue([]);
  };

  const preview = buildPreview(pm, queue);

  return (
    <div className="flex flex-col h-full p-4 gap-3 font-mono">
      {/* package manager tabs */}
      <div className="flex items-center justify-between">
        <span className="text-[10px] text-zinc-600 uppercase tracking-widest">package manager</span>
        <div className="flex gap-1">
          {(["npm", "pip", "yarn", "cargo"] as PackageManager[]).map(p => (
            <button
              key={p}
              onClick={() => setPm(p)}
              className={`px-3 py-1 rounded text-[11px] border transition-colors ${
                pm === p
                  ? "bg-zinc-800 border-zinc-600 text-zinc-100"
                  : "bg-transparent border-transparent text-zinc-600 hover:text-zinc-400"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* input row */}
      <div className="flex gap-2 items-center">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && addToQueue()}
          placeholder="package name or name@version…"
          className="flex-1 bg-[#0a0c10] border border-[#1e2228] rounded px-3 py-1.5 text-xs text-zinc-300 placeholder:text-zinc-700 outline-none focus:border-zinc-600"
        />
        <label className="flex items-center gap-1.5 text-[11px] text-zinc-600 cursor-pointer select-none whitespace-nowrap">
          <input type="checkbox" checked={isDev} onChange={e => setIsDev(e.target.checked)} className="accent-[#50c878]" />
          --dev
        </label>
        <button
          onClick={addToQueue}
          disabled={!input.trim()}
          className="px-3 py-1.5 rounded text-xs font-bold text-zinc-400 border border-[#1e2228] hover:border-zinc-600 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          + Add
        </button>
      </div>

      {/* queued packages */}
      {queue.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <span className="text-[10px] text-zinc-700 uppercase tracking-widest">queued ({queue.length})</span>
          <div className="flex flex-wrap gap-1.5">
            {queue.map((pkg, i) => (
              <div key={i} className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#1e2228] bg-[#0e1018] text-xs">
                {pkg.dev && (
                  <span className="text-[9px] px-1 rounded border border-[#2a2a4a] text-[#5060a8] bg-[#1a1a2e]">dev</span>
                )}
                <span className="text-zinc-300">{pkg.name}</span>
                <button onClick={() => removeFromQueue(i)} className="text-zinc-700 hover:text-red-400 text-sm leading-none transition-colors">×</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* command preview */}
      <div className="text-[11px] px-2.5 py-1.5 rounded border border-[#1e2228] bg-[#070a0d] text-zinc-600 truncate">
        {preview
          ? <><span className="text-zinc-400">$ </span><span className="text-[#5070c8]">{preview}</span></>
          : "add packages above to preview the command"
        }
      </div>

      {/* install button */}
      <button
        onClick={install}
        disabled={!queue.length || !isRunning}
        className="flex items-center justify-center gap-1.5 px-4 py-2 rounded font-bold text-sm disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        style={{ background: "#50c878", color: "#0a1810", border: "2px solid #0b130d77" }}
      >
        ▶ Install {queue.length > 0 && `(${queue.length})`}
      </button>

      <LogOutput logs={logs} />
    </div>
  );
}